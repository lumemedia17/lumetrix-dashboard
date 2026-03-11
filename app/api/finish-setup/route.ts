// app/api/finish-setup/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type PlanKey = "all" | "luxury";

function buildVaultAccess(plan: PlanKey) {
  if (plan === "all") {
    return { all: true, luxury: true, "real-estate": true, fitness: true };
  }
  if (plan === "luxury") {
    return { luxury: true };
  }
  return {};
}

export async function POST(req: Request) {
  try {
    const { session_id, email, password } = (await req.json()) as {
      session_id: string;
      email: string;
      password: string;
    };

    if (!session_id || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1) Look up the pending purchase created by the webhook
    const { data: pending, error: pendingErr } = await supabaseAdmin
      .from("pending_purchases")
      .select("*")
      .eq("checkout_session_id", session_id)
      .eq("status", "pending")
      .single();

    // If webhook is delayed, fall back to Stripe check (optional but helpful)
    if (pendingErr || !pending) {
      const stripeSession = await stripe.checkout.sessions.retrieve(session_id);

      if (stripeSession.payment_status !== "paid") {
        return NextResponse.json({ error: "Invalid or unpaid session" }, { status: 403 });
      }

      // Still paid, but webhook hasn't written pending yet
      return NextResponse.json(
        { error: "Payment processing. Please retry in a few seconds." },
        { status: 409 }
      );
    }

    const plan = pending.plan as PlanKey;
    const stripeCustomerId = pending.stripe_customer_id as string;
    const stripeSubscriptionId = pending.stripe_subscription_id as string;

    if (!plan || !stripeCustomerId || !stripeSubscriptionId) {
      return NextResponse.json({ error: "Pending purchase missing required data" }, { status: 400 });
    }

    // 2) Create Supabase user
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message || "Auth create failed" },
        { status: 400 }
      );
    }

    const userId = created.user.id;

    // 3) Write access into profiles (source of truth for your app access)
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          plan,
          is_active: true,
          vault_access: buildVaultAccess(plan),
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
        },
        { onConflict: "id" }
      );

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    // 4) Mark pending purchase as completed so it can't be reused
    const { error: doneErr } = await supabaseAdmin
      .from("pending_purchases")
      .update({
        status: "completed",
        // OPTIONAL if you have these columns:
        // user_id: userId,
        // email: email,
      })
      .eq("checkout_session_id", session_id);

    if (doneErr) {
      return NextResponse.json({ error: doneErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, userId });
  } catch (err) {
    console.error("finish-setup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}