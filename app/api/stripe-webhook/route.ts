import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type PlanKey = "all" | "luxury" | "real-estate" | "fitness";

function buildVaultAccess(plan: PlanKey) {
  switch (plan) {
    case "all":
      return { all: true, luxury: true, "real-estate": true, fitness: true };
    case "luxury":
      return { luxury: true };
    case "real-estate":
      return { "real-estate": true };
    case "fitness":
      return { fitness: true };
    default:
      return {};
  }
}

type ProfileLookup = {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

function getStripeId(value: { id: string } | string | null | undefined) {
  if (typeof value === "string") return value;
  return value?.id ?? null;
}

function getPlanFromSubscription(subscription: Stripe.Subscription): PlanKey | null {
  const planByPriceId = new Map<string, PlanKey>();
  const configuredPrices: Array<[string | undefined, PlanKey]> = [
    [process.env.STRIPE_PRICE_ALL, "all"],
    [process.env.STRIPE_PRICE_LUXURY, "luxury"],
    [process.env.STRIPE_PRICE_REAL_ESTATE, "real-estate"],
    [process.env.STRIPE_PRICE_FITNESS, "fitness"],
  ];

  for (const [priceId, plan] of configuredPrices) {
    if (priceId) {
      planByPriceId.set(priceId, plan);
    }
  }

  for (const item of subscription.items.data) {
    const plan = planByPriceId.get(item.price.id);
    if (plan) return plan;
  }

  return null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  if (invoice.parent?.type !== "subscription_details") return null;

  return getStripeId(invoice.parent.subscription_details?.subscription);
}

async function findProfile(
  stripeSubscriptionId: string | null,
  stripeCustomerId: string | null
): Promise<ProfileLookup | null> {
  const select = "id,stripe_customer_id,stripe_subscription_id";

  if (stripeSubscriptionId) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(select)
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to find profile by Stripe subscription: ${error.message}`
      );
    }

    if (data) return data;
  }

  if (stripeCustomerId) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(select)
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to find profile by Stripe customer: ${error.message}`
      );
    }

    if (data) return data;
  }

  return null;
}

async function updateProfile(
  profileId: string,
  values: Record<string, unknown>
) {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update(values)
    .eq("id", profileId);

  if (error) {
    throw new Error(`Failed to update subscription access: ${error.message}`);
  }
}

async function revokeSubscriptionAccess({
  stripeSubscriptionId,
  stripeCustomerId,
  updatedAt,
  source,
}: {
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  updatedAt: string;
  source: string;
}) {
  const profile = await findProfile(stripeSubscriptionId, stripeCustomerId);

  if (!profile) {
    console.warn(`No profile found while revoking access for ${source}`, {
      stripeSubscriptionId,
      stripeCustomerId,
    });
    return;
  }

  await updateProfile(profile.id, {
    is_active: false,
    vault_access: {},
    updated_at: updatedAt,
  });
}

async function grantSubscriptionAccess(
  subscription: Stripe.Subscription,
  updatedAt: string,
  source: string
) {
  const stripeSubscriptionId = subscription.id;
  const stripeCustomerId = getStripeId(subscription.customer);
  const plan = getPlanFromSubscription(subscription);

  if (!stripeCustomerId) {
    console.warn(`Subscription has no Stripe customer for ${source}`, {
      stripeSubscriptionId,
    });
    return;
  }

  if (!plan) {
    console.warn(`Subscription has no configured Lumetrix Price for ${source}`, {
      stripeSubscriptionId,
    });
    return;
  }

  const profile = await findProfile(stripeSubscriptionId, stripeCustomerId);

  if (!profile) {
    console.warn(`No profile found while granting access for ${source}`, {
      stripeSubscriptionId,
      stripeCustomerId,
    });
    return;
  }

  await updateProfile(profile.id, {
    plan,
    is_active: true,
    vault_access: buildVaultAccess(plan),
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    updated_at: updatedAt,
  });
}

async function applySubscriptionStatus(
  subscription: Stripe.Subscription,
  updatedAt: string,
  source: string
) {
  const stripeSubscriptionId = subscription.id;
  const stripeCustomerId = getStripeId(subscription.customer);

  switch (subscription.status) {
    case "active":
    case "trialing":
      await grantSubscriptionAccess(subscription, updatedAt, source);
      return;

    case "past_due":
    case "unpaid":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      await revokeSubscriptionAccess({
        stripeSubscriptionId,
        stripeCustomerId,
        updatedAt,
        source,
      });
      return;

    default:
      console.warn(`Unhandled subscription status for ${source}`, {
        stripeSubscriptionId,
        status: subscription.status,
      });
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown signature error";
    console.error("Webhook signature error:", message);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    const eventTimestamp = new Date(event.created * 1000).toISOString();

    switch (event.type) {
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
          console.warn("Missing required data on checkout.session.completed", {
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
              status: "ready",
              email,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "checkout_session_id" }
          );

        if (error) {
          console.error("Failed to write pending purchase:", error);
          throw error;
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await applySubscriptionStatus(
          subscription,
          eventTimestamp,
          event.type
        );

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await revokeSubscriptionAccess({
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: getStripeId(subscription.customer),
          updatedAt: eventTimestamp,
          source: event.type,
        });

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);

        if (!stripeSubscriptionId) {
          console.warn("Ignoring paid invoice without a subscription", {
            invoiceId: invoice.id,
          });
          break;
        }

        const subscription =
          await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const invoiceCustomerId = getStripeId(invoice.customer);
        const subscriptionCustomerId = getStripeId(subscription.customer);

        if (
          invoiceCustomerId &&
          subscriptionCustomerId &&
          invoiceCustomerId !== subscriptionCustomerId
        ) {
          console.warn("Paid invoice customer does not match subscription", {
            invoiceId: invoice.id,
            stripeSubscriptionId,
          });
          break;
        }

        await applySubscriptionStatus(
          subscription,
          eventTimestamp,
          event.type
        );

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = getStripeId(invoice.customer);

        if (!stripeCustomerId) break;

        await revokeSubscriptionAccess({
          stripeSubscriptionId: getInvoiceSubscriptionId(invoice),
          stripeCustomerId,
          updatedAt: eventTimestamp,
          source: event.type,
        });

        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
