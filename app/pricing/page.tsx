"use client";

import { createClient } from "@supabase/supabase-js";

type PlanKey = "all" | "luxury" | "real-estate" | "fitness";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function startCheckout(plan: PlanKey) {
  try {
    // Get the logged-in user from Supabase (browser)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      alert("Please log in first.");
      window.location.href = "/login";
      return;
    }

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan,
        userId: user.id,
        email: user.email,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Checkout error:", text);
      alert("There was a problem starting checkout. Are you logged in?");
      return;
    }

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("No checkout URL returned.");
    }
  } catch (err) {
    console.error(err);
    alert("Unexpected error starting checkout.");
  }
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-10">
      <h1 className="text-3xl font-bold mb-2 text-center">Lumetrix Pricing</h1>
      <p className="mb-8 text-neutral-300 text-center max-w-xl">
        Choose a single vault for $99/month or unlock everything with All Access.
      </p>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl w-full">
        {/* All Access */}
        <div className="border border-neutral-700 rounded-2xl p-6 flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-2">All Access</h2>
          <p className="text-4xl font-bold mb-2">$199</p>
          <p className="text-sm text-neutral-400 mb-4">per month</p>
          <ul className="text-sm text-neutral-300 mb-6 space-y-1 text-center">
            <li>✓ Luxury Vault</li>
            <li>✓ Real Estate Vault</li>
            <li>✓ Fitness &amp; Wellness Vault</li>
          </ul>
          <button
            onClick={() => startCheckout("all")}
            className="px-6 py-2 rounded-full bg-yellow-400 text-black font-semibold"
          >
            Get All Access – $199/mo
          </button>
        </div>

        {/* Luxury Vault */}
        <div className="border border-neutral-700 rounded-2xl p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">Luxury Vault</h2>
          <p className="text-3xl font-bold mb-2">$99</p>
          <p className="text-sm text-neutral-400 mb-4">per month</p>
          <p className="text-sm text-neutral-300 mb-6 text-center">
            Cinematic luxury lifestyle footage for high-end brands.
          </p>
          <button
            onClick={() => startCheckout("luxury")}
            className="px-6 py-2 rounded-full bg-neutral-100 text-black font-semibold"
          >
            Get Luxury – $99/mo
          </button>
        </div>

        {/* Real Estate Vault */}
        <div className="border border-neutral-700 rounded-2xl p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">Real Estate Vault</h2>
          <p className="text-3xl font-bold mb-2">$99</p>
          <p className="text-sm text-neutral-400 mb-4">per month</p>
          <p className="text-sm text-neutral-300 mb-6 text-center">
            Smooth property, walk-through, and lifestyle B-roll for agents and
            investors.
          </p>
          <button
            onClick={() => startCheckout("real-estate")}
            className="px-6 py-2 rounded-full bg-neutral-100 text-black font-semibold"
          >
            Get Real Estate – $99/mo
          </button>
        </div>

        {/* Fitness Vault */}
        <div className="border border-neutral-700 rounded-2xl p-6 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">Fitness Vault</h2>
          <p className="text-3xl font-bold mb-2">$99</p>
          <p className="text-sm text-neutral-400 mb-4">per month</p>
          <p className="text-sm text-neutral-300 mb-6 text-center">
            Gym, wellness, and performance clips for coaches and brands.
          </p>
          <button
            onClick={() => startCheckout("fitness")}
            className="px-6 py-2 rounded-full bg-neutral-100 text-black font-semibold"
          >
            Get Fitness – $99/mo
          </button>
        </div>
      </div>
    </main>
  );
}
