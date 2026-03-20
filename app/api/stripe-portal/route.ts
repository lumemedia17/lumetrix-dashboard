import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const customerId = profile?.stripe_customer_id;

    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found for this account." },
        { status: 400 }
      );
    }

    const returnUrl =
      (process.env.NEXT_PUBLIC_APP_URL || "https://app.lumetrixmedia.com") + "/account";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe portal error:", err);
    return NextResponse.json(
      { error: "Could not create billing portal session." },
      { status: 500 }
    );
  }
}