"use client";

import { useState } from "react";

export default function AccountClient({
  email,
  plan,
  isActive,
  hasStripeCustomer,
}: {
  email: string;
  plan: string;
  isActive: boolean;
  hasStripeCustomer: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stripe-portal", {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Could not open billing portal.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_35%),#000] p-8 md:p-10">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
          Billing & Account
        </p>
        <h1 className="text-4xl font-black tracking-tight md:text-6xl">
          Account
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[#B3B3B3] md:text-lg">
          Manage your subscription, payment method, renewal status, and cancellation from one place.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-2xl font-black">Subscription Status</h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B3B3B3]">
                Email
              </p>
              <p className="mt-2 text-base font-bold">{email}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B3B3B3]">
                Plan
              </p>
              <p className="mt-2 text-base font-bold">
                {plan === "all"
                  ? "All Access"
                  : plan === "luxury"
                  ? "Luxury"
                  : plan === "real-estate"
                  ? "Real Estate"
                  : plan === "fitness"
                  ? "Fitness"
                  : "Free"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B3B3B3]">
                Access
              </p>
              <p className={`mt-2 text-base font-bold ${isActive ? "text-green-400" : "text-red-400"}`}>
                {isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-2xl font-black">Manage Subscription</h2>

          <p className="mt-4 text-sm leading-7 text-[#B3B3B3]">
            Use the secure Stripe billing portal to update your card, view invoices,
            change your billing details, or cancel your subscription.
          </p>

          <div className="mt-6 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-4 text-sm text-[#F1D27A]">
            Simple path for cancellation:
            <br />
            Account → Manage Subscription → Cancel Subscription
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={openPortal}
            disabled={loading || !hasStripeCustomer}
            className="mt-6 inline-flex rounded-full bg-[#D4AF37] px-6 py-4 text-sm font-black text-black shadow-xl shadow-[#D4AF37]/30 transition-all duration-300 hover:bg-[#F1D27A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Opening Portal..." : "Manage Subscription"}
          </button>

          {!hasStripeCustomer && (
            <p className="mt-4 text-sm text-[#B3B3B3]">
              No Stripe billing record was found for this account yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}