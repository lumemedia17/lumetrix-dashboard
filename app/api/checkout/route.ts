import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/*
 SAFETY: Do NOT assume env vars exist.
 We validate them so the route does not crash silently.
*/

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const PRICE_ALL = process.env.STRIPE_PRICE_ALL;
const PRICE_LUXURY = process.env.STRIPE_PRICE_LUXURY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL;

if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

type PlanKey = "all" | "luxury";

/*
 Allowed origins for the landing page
*/
const ALLOWED_ORIGINS = new Set([
  "https://lumetrixmedia.com",
  "https://www.lumetrixmedia.com",
]);

function corsHeaders(origin: string | null) {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://lumetrixmedia.com";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/*
 Determine which Stripe price to use
*/
function getPriceId(plan: PlanKey) {
  if (plan === "all") {
    if (!PRICE_ALL) throw new Error("Missing STRIPE_PRICE_ALL");
    return PRICE_ALL;
  }

  if (plan === "luxury") {
    if (!PRICE_LUXURY) throw new Error("Missing STRIPE_PRICE_LUXURY");
    return PRICE_LUXURY;
  }

  throw new Error("Invalid plan");
}

/*
 CORS preflight
*/
export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

/*
 Checkout creation
*/
export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  try {
    const body = await req.json();

    const plan = body.plan as PlanKey;
    const email = body.email ?? undefined;

    if (!plan) {
      return NextResponse.json(
        { error: "Missing plan" },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (!APP_URL) {
      throw new Error("Missing NEXT_PUBLIC_APP_URL");
    }

    if (!MARKETING_URL) {
      throw new Error("Missing NEXT_PUBLIC_MARKETING_URL");
    }

    const priceId = getPriceId(plan);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      payment_method_types: ["card"],

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      success_url: `${APP_URL}/finish-setup?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${MARKETING_URL}/pricing`,

      metadata: {
        plan,
      },

      customer_email: email,
    });

    return NextResponse.json(
      { url: session.url },
      { headers: corsHeaders(origin) }
    );
  } catch (err: any) {
    console.error("Checkout Error:", err);

    return NextResponse.json(
      {
        error: err.message ?? "Unknown server error",
      },
      {
        status: 500,
        headers: corsHeaders(origin),
      }
    );
  }
}