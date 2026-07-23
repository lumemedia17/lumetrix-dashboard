import { randomUUID } from "crypto";
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  checkoutCorsHeaders,
  getCheckoutPageOrigin,
  isAllowedCheckoutOrigin,
} from "@/lib/checkoutOrigins";
import {
  PLAN_DETAILS,
  normalizePlan,
  sanitizeAttribution,
  type PlanKey,
  type SafeAttribution,
} from "@/lib/plans";

export const runtime = "nodejs";

const STRIPE_API_VERSION = "2025-10-29.clover" as const;
const CHECKOUT_UI_MODE = "embedded" as const;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

function getPriceId(plan: PlanKey) {
  const envKey = PLAN_DETAILS[plan].envKey;
  const priceId = process.env[envKey];

  if (!priceId) {
    throw new Error(`Missing server-side Stripe Price configuration for ${plan}`);
  }

  return priceId;
}

function buildMetadata({
  plan,
  userId,
  checkoutAttemptId,
  attribution,
}: {
  plan: PlanKey;
  userId: string | null;
  checkoutAttemptId: string;
  attribution: SafeAttribution;
}) {
  const metadata: Record<string, string> = {
    plan,
    checkout_flow: "embedded",
    checkout_attempt_id: checkoutAttemptId,
  };

  if (userId) {
    metadata.user_id = userId;
  }

  for (const [key, value] of Object.entries(attribution)) {
    if (value) {
      metadata[`attribution_${key}`] = value;
    }
  }

  return metadata;
}

async function getVerifiedProfile() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      profile: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id,is_active,plan")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error("Could not verify account subscription status.");
  }

  return {
    user,
    profile,
  };
}

function safeError(
  origin: string | null,
  message: string,
  status = 400,
  code = "checkout_error"
) {
  return NextResponse.json(
    {
      error: message,
      code,
    },
    {
      status,
      headers: checkoutCorsHeaders(origin),
    }
  );
}

export function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");

  if (!isAllowedCheckoutOrigin(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: checkoutCorsHeaders(origin),
  });
}

export function GET(req: NextRequest) {
  const origin = req.headers.get("origin");

  if (!isAllowedCheckoutOrigin(origin)) {
    return safeError(
      origin,
      "Checkout is only available from Lumetrix.",
      403,
      "origin_not_allowed"
    );
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey?.startsWith("pk_")) {
    return safeError(
      origin,
      "Checkout configuration is unavailable.",
      500,
      "checkout_config_unavailable"
    );
  }

  return NextResponse.json(
    {
      publishable_key: publishableKey,
    },
    {
      headers: {
        ...checkoutCorsHeaders(origin),
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  if (!isAllowedCheckoutOrigin(origin)) {
    return safeError(
      origin,
      "Checkout is only available from Lumetrix.",
      403,
      "origin_not_allowed"
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const plan = normalizePlan(body?.plan);

    if (!plan) {
      return safeError(
        origin,
        "Choose a valid Lumetrix plan.",
        400,
        "invalid_plan"
      );
    }

    const priceId = getPriceId(plan);
    const checkoutAttemptId = randomUUID();
    const attribution = sanitizeAttribution(body?.attribution);
    const { user, profile } = await getVerifiedProfile();

    if (profile?.is_active) {
      return safeError(
        origin,
        "This account already has active Lumetrix access. Open your dashboard or manage billing from Account.",
        409,
        "active_subscription"
      );
    }

    const verifiedUserId = user?.id ?? null;
    const verifiedEmail = user?.email ?? null;
    const verifiedCustomerId =
      typeof profile?.stripe_customer_id === "string" && profile.stripe_customer_id.startsWith("cus_")
        ? profile.stripe_customer_id
        : null;

    const metadata = buildMetadata({
      plan,
      userId: verifiedUserId,
      checkoutAttemptId,
      attribution,
    });

    const checkoutPageOrigin = getCheckoutPageOrigin(origin);
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      ui_mode: CHECKOUT_UI_MODE,
      redirect_on_completion: "always",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      return_url: `${checkoutPageOrigin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      metadata,
      client_reference_id: verifiedUserId ?? checkoutAttemptId,
      subscription_data: {
        metadata,
      },
    };

    if (verifiedCustomerId) {
      sessionParams.customer = verifiedCustomerId;
    } else if (verifiedEmail) {
      sessionParams.customer_email = verifiedEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.client_secret) {
      throw new Error("Embedded Checkout Session did not include a client secret.");
    }

    return NextResponse.json(
      {
        client_secret: session.client_secret,
      },
      {
        headers: checkoutCorsHeaders(origin),
      }
    );
  } catch (err) {
    console.error("Embedded checkout session error:", err);

    return safeError(
      origin,
      "Checkout could not start. Please retry from the Lumetrix checkout page.",
      500,
      "embedded_checkout_failed"
    );
  }
}
