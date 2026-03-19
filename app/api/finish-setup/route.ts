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

function normalizePlan(value: string | null | undefined): PlanKey | null {
  if (!value) return null;

  const v = value.toLowerCase().trim();

  if (v === "all" || v === "all-access" || v === "all_access") return "all";
  if (v === "luxury") return "luxury";
  if (v === "real-estate" || v === "real_estate" || v === "realestate") return "real-estate";
  if (v === "fitness") return "fitness";

  return null;
}

function buildVaultAccess(plan: PlanKey) {
  if (plan === "all") {
    return {
      all: true,
      luxury: true,
      "real-estate": true,
      fitness: true,
    };
  }

  if (plan === "luxury") {
    return {
      luxury: true,
    };
  }

  if (plan === "real-estate") {
    return {
      "real-estate": true,
    };
  }

  if (plan === "fitness") {
    return {
      fitness: true,
    };
  }

  return {};
}

function getRedirectPath(plan: PlanKey) {
  if (plan === "all") return "/vault/all";
  if (plan === "luxury") return "/vault/luxury";
  if (plan === "real-estate") return "/vault/real-estate";
  if (plan === "fitness") return "/vault/fitness";
  return "/vault/all";
}

async function findPendingPurchase(sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from("pending_purchases")
    .select("*")
    .eq("checkout_session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read pending purchase: ${error.message}`);
  }

  return data;
}

async function hydratePendingPurchaseFromStripe(sessionId: string) {
  const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });

  const paymentComplete =
    stripeSession.status === "complete" &&
    (stripeSession.payment_status === "paid" || stripeSession.mode === "subscription");

  if (!paymentComplete) {
    return { ready: false, email: null as string | null };
  }

  const plan =
    normalizePlan(stripeSession.metadata?.plan) ||
    normalizePlan(
      typeof stripeSession.client_reference_id === "string"
        ? stripeSession.client_reference_id
        : null
    );

  if (!plan) {
    throw new Error("Could not determine purchased plan from Stripe session.");
  }

  const stripeCustomerId =
    typeof stripeSession.customer === "string"
      ? stripeSession.customer
      : stripeSession.customer?.id ?? null;

  const stripeSubscriptionId =
    typeof stripeSession.subscription === "string"
      ? stripeSession.subscription
      : stripeSession.subscription?.id ?? null;

  const paidEmail =
    stripeSession.customer_details?.email ||
    stripeSession.customer_email ||
    null;

  const payload = {
    checkout_session_id: stripeSession.id,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    plan,
    status: "ready",
    email: paidEmail,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("pending_purchases")
    .upsert(payload, { onConflict: "checkout_session_id" });

  if (error) {
    throw new Error(`Failed to upsert pending purchase: ${error.message}`);
  }

  return { ready: true, email: paidEmail };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const session_id = body?.session_id as string | undefined;
    const check_only = Boolean(body?.check_only);
    const emailInput = (body?.email as string | undefined)?.trim().toLowerCase();
    const password = body?.password as string | undefined;

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    let pending = await findPendingPurchase(session_id);

    if (!pending) {
      try {
        const repaired = await hydratePendingPurchaseFromStripe(session_id);
        if (repaired.ready) {
          pending = await findPendingPurchase(session_id);
        }
      } catch (err) {
        console.error("Stripe fallback recovery failed:", err);
      }
    }

    if (pending && !pending.email) {
      try {
        const repaired = await hydratePendingPurchaseFromStripe(session_id);
        if (repaired.ready) {
          pending = await findPendingPurchase(session_id);
        }
      } catch (err) {
        console.error("Stripe email hydration failed:", err);
      }
    }

    if (check_only) {
      if (!pending) {
        return NextResponse.json(
          { error: "Payment processing. Please retry in a few seconds." },
          { status: 409 }
        );
      }

      return NextResponse.json({
        ok: true,
        ready: true,
        email: pending.email ?? null,
        plan: pending.plan ?? null,
        status: pending.status ?? null,
      });
    }

    if (!emailInput || !password) {
      return NextResponse.json(
        { error: "Missing email or password." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (!pending) {
      return NextResponse.json(
        { error: "Payment processing. Please retry in a few seconds." },
        { status: 409 }
      );
    }

    if (pending.completed_at) {
      const existingPlan = normalizePlan(pending.plan) || "all";
      return NextResponse.json({
        ok: true,
        redirectTo: getRedirectPath(existingPlan),
      });
    }

    const plan = normalizePlan(pending.plan);

    if (!plan) {
      return NextResponse.json(
        { error: "Invalid plan on pending purchase." },
        { status: 400 }
      );
    }

    const stripeCustomerId = pending.stripe_customer_id as string | null;
    const stripeSubscriptionId = pending.stripe_subscription_id as string | null;
    const finalEmail = (emailInput || pending.email || "").toLowerCase();

    if (!finalEmail) {
      return NextResponse.json(
        { error: "No email found for this purchase." },
        { status: 400 }
      );
    }

    const { data: listData, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json(
        { error: `Could not verify existing users: ${listError.message}` },
        { status: 500 }
      );
    }

    const existingUser = listData.users.find(
      (u) => u.email?.toLowerCase() === finalEmail.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      const { error: updateUserError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
        });

      if (updateUserError) {
        return NextResponse.json(
          { error: updateUserError.message || "Failed to update existing user." },
          { status: 500 }
        );
      }
    } else {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: finalEmail,
          password,
          email_confirm: true,
        });

      if (createErr || !created.user) {
        return NextResponse.json(
          { error: createErr?.message || "Auth create failed" },
          { status: 400 }
        );
      }

      userId = created.user.id;
    }

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: finalEmail,
          plan,
          is_active: true,
          vault_access: buildVaultAccess(plan),
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    const { error: doneErr } = await supabaseAdmin
      .from("pending_purchases")
      .update({
        status: "completed",
        user_id: userId,
        email: finalEmail,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("checkout_session_id", session_id);

    if (doneErr) {
      return NextResponse.json({ error: doneErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      userId,
      redirectTo: getRedirectPath(plan),
    });
  } catch (err) {
    console.error("finish-setup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}