import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRedirectPath, normalizePlan, type PlanKey } from "@/lib/plans";

export const runtime = "nodejs";

const STRIPE_API_VERSION = "2025-10-29.clover" as const;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
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

function appOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || "https://app.lumetrixmedia.com";

  try {
    return new URL(configured).origin;
  } catch {
    return "https://app.lumetrixmedia.com";
  }
}

function isPlausibleSessionId(sessionId: string) {
  return /^cs_(test|live)_[a-zA-Z0-9_]+$/.test(sessionId) && sessionId.length < 220;
}

async function getPendingPurchase(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from("pending_purchases")
    .select("status,email,plan,completed_at,user_id")
    .eq("checkout_session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not verify activation status.");
  }

  return data;
}

function response(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, { status });
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();

  if (!sessionId || !isPlausibleSessionId(sessionId)) {
    return response(
      {
        state: "invalid",
        message: "We could not verify this checkout.",
      },
      400
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const plan =
      normalizePlan(session.metadata?.plan) ||
      normalizePlan(
        typeof session.client_reference_id === "string"
          ? session.client_reference_id
          : null
      );

    const paymentConfirmed =
      session.status === "complete" &&
      (session.payment_status === "paid" || session.mode === "subscription");

    if (!paymentConfirmed) {
      return response({
        state: "incomplete",
        message: "Checkout was not completed.",
        session_status: session.status,
        payment_status: session.payment_status,
        plan,
        retry_url: plan ? `${appOrigin()}/checkout?plan=${plan}` : `${appOrigin()}/pricing`,
      });
    }

    const pending = await getPendingPurchase(sessionId);
    const pendingPlan = normalizePlan(pending?.plan) || plan || "all";
    const safeEmail =
      typeof pending?.email === "string"
        ? pending.email
        : session.customer_details?.email ?? session.customer_email ?? null;

    if (pending?.completed_at || pending?.status === "completed") {
      return response({
        state: "account_active",
        message: "Your Lumetrix access is ready.",
        plan: pendingPlan,
        email: safeEmail,
        dashboard_url: `${appOrigin()}${getRedirectPath(pendingPlan as PlanKey)}`,
        login_url: `${appOrigin()}/login${safeEmail ? `?prefill=${encodeURIComponent(safeEmail)}` : ""}`,
      });
    }

    return response({
      state: "activation_pending",
      message: "Payment confirmed. Your account is being activated.",
      plan: pendingPlan,
      email: safeEmail,
      finish_setup_url: `${appOrigin()}/finish-setup?session_id=${encodeURIComponent(sessionId)}`,
      login_url: `${appOrigin()}/login${safeEmail ? `?prefill=${encodeURIComponent(safeEmail)}` : ""}`,
    });
  } catch (err) {
    console.error("Checkout return verification error:", err);

    return response(
      {
        state: "invalid",
        message: "We could not verify this checkout.",
      },
      400
    );
  }
}
