// app/api/stripe-webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Stripe
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

/**
 * Supabase Admin (SERVICE ROLE – SERVER ONLY)
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type PlanKey = "all" | "luxury" | "real-estate" | "fitness";

function buildVaultAccess(plan: PlanKey) {
  switch (plan) {
    case "all":
      return { all: true, luxury: true, real_estate: true, fitness: true };
    case "luxury":
      return { luxury: true };
    case "real-estate":
      return { real_estate: true };
    case "fitness":
      return { fitness: true };
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!sig) {
    return new NextResponse("Missing stripe-signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      /**
       * ✅ FIRST PURCHASE (PAY-FIRST FLOW)
       * Store paid checkout session as pending.
       * Do NOT update profiles here, because the user account does not exist yet.
       */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const plan = session.metadata?.plan as PlanKey | undefined;

        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : null;

        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;

        const email =
          session.customer_details?.email ??
          session.customer_email ??
          null;

        if (!plan || !stripeCustomerId || !stripeSubscriptionId) {
          console.warn("⚠️ Missing required data on checkout.session.completed", {
            plan,
            stripeCustomerId,
            stripeSubscriptionId,
          });
          break;
        }

        const { error } = await supabaseAdmin
          .from("pending_purchases")
          .upsert(
            {
              checkout_session_id: session.id,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              plan,
              status: "pending",
              email, // remove this line if your table does NOT have an email column
            },
            { onConflict: "checkout_session_id" }
          );

        if (error) {
          console.error("❌ Failed to write pending purchase:", error);
          throw error;
        }

        break;
      }

      /**
       * 🔄 PLAN CHANGE / STATUS UPDATE
       * This still updates existing user profiles AFTER account creation.
       */
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string | undefined;
        const priceId = sub.items.data[0]?.price.id;

        if (!customerId || !priceId) break;

        const planMap: Record<string, PlanKey> = {
          [process.env.STRIPE_PRICE_ALL!]: "all",
          [process.env.STRIPE_PRICE_LUXURY!]: "luxury",
          [process.env.STRIPE_PRICE_REAL_ESTATE!]: "real-estate",
          [process.env.STRIPE_PRICE_FITNESS!]: "fitness",
        };

        const newPlan = planMap[priceId];
        if (!newPlan) break;

        await supabaseAdmin
          .from("profiles")
          .update({
            plan: newPlan,
            is_active: true,
            vault_access: buildVaultAccess(newPlan),
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      /**
       * ❌ PAYMENT FAILED
       */
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | undefined;
        if (!customerId) break;

        await supabaseAdmin
          .from("profiles")
          .update({
            is_active: false,
            vault_access: {},
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}