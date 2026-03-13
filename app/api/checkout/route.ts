// app/api/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

type PlanKey = "all" | "luxury";

function getPriceId(plan: PlanKey): string {
  switch (plan) {
    case "all":
      return process.env.STRIPE_PRICE_ALL!;
    case "luxury":
      return process.env.STRIPE_PRICE_LUXURY!;
    default:
      throw new Error("Invalid plan");
  }
}

export async function POST(req: Request) {
  try {
    const { plan, email } = (await req.json()) as {
      plan: PlanKey;
      email?: string | null;
    };

    if (!plan) {
      return NextResponse.json({ error: "Missing plan" }, { status: 400 });
    }

    const priceId = getPriceId(plan);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL!;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      success_url: `${appUrl}/finish-setup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${marketingUrl}/pricing`,

      metadata: {
        plan,
      },

      customer_email: email ?? undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Error in /api/checkout:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}