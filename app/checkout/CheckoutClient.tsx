"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { stripePromise } from "@/lib/stripe";
import {
  PLAN_DETAILS,
  SAFE_ATTRIBUTION_KEYS,
  type PlanKey,
  type SafeAttribution,
} from "@/lib/plans";

type CheckoutStatus = "idle" | "loading" | "ready" | "active" | "error";

const ATTRIBUTION_STORAGE_KEY = "lumetrix_checkout_attribution";
const clientSecretRequests = new Map<string, Promise<string>>();

function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;

  return /tiktok|instagram|fbav|fban|fb_iab|line|twitter/i.test(navigator.userAgent);
}

function readStoredAttribution(): SafeAttribution {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, string>;
    const attribution: SafeAttribution = {};

    for (const key of SAFE_ATTRIBUTION_KEYS) {
      if (typeof parsed[key] === "string") {
        attribution[key] = parsed[key];
      }
    }

    return attribution;
  } catch {
    return {};
  }
}

function collectAttribution(): SafeAttribution {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const attribution: SafeAttribution = {
    ...readStoredAttribution(),
  };

  for (const key of SAFE_ATTRIBUTION_KEYS) {
    const value = params.get(key);

    if (value) {
      attribution[key] = value;
    }
  }

  try {
    window.sessionStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(attribution)
    );
  } catch {
    // Session storage is a convenience only; checkout must still work without it.
  }

  return attribution;
}

function getClientSecretOnce(plan: PlanKey, attribution: SafeAttribution, attempt: number) {
  const requestKey = `${plan}:${JSON.stringify(attribution)}:${attempt}`;
  const existing = clientSecretRequests.get(requestKey);

  if (existing) {
    return existing;
  }

  const request = fetch("/api/checkout/create-embedded-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan,
      attribution,
    }),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.client_secret) {
        throw new Error(data?.code || "embedded_checkout_failed");
      }

      return data.client_secret as string;
    })
    .catch((err) => {
      clientSecretRequests.delete(requestKey);
      throw err;
    });

  clientSecretRequests.set(requestKey, request);
  return request;
}

export default function CheckoutClient({
  plan,
  checkoutUrl,
  testMode,
}: {
  plan: PlanKey;
  checkoutUrl: string;
  testMode: boolean;
}) {
  const planDetails = PLAN_DETAILS[plan];
  const checkoutRef = useRef<StripeEmbeddedCheckout | null>(null);
  const mountedRef = useRef(false);
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [showBrowserNotice, setShowBrowserNotice] = useState(false);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const attribution = useMemo(() => collectAttribution(), []);

  useEffect(() => {
    setShowBrowserNotice(isInAppBrowser());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function mountCheckout() {
      if (mountedRef.current) return;
      mountedRef.current = true;
      setStatus("loading");

      try {
        const stripe = await stripePromise;

        if (!stripe) {
          throw new Error("stripe_js_unavailable");
        }

        const embeddedCheckout = await stripe.createEmbeddedCheckoutPage({
          fetchClientSecret: () => getClientSecretOnce(plan, attribution, attempt),
        });

        if (cancelled) {
          embeddedCheckout.destroy();
          return;
        }

        checkoutRef.current = embeddedCheckout;
        embeddedCheckout.mount("#lumetrix-embedded-checkout");
        setStatus("ready");
      } catch (err) {
        if (err instanceof Error && err.message === "active_subscription") {
          mountedRef.current = false;
          setStatus("active");
          return;
        }

        console.error("Embedded checkout load failed:", err);
        mountedRef.current = false;
        setStatus("error");
      }
    }

    mountCheckout();

    return () => {
      cancelled = true;
      checkoutRef.current?.destroy();
      checkoutRef.current = null;
      mountedRef.current = false;
    };
  }, [attempt, attribution, plan]);

  async function copyCheckoutLink() {
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  function retryCheckout() {
    checkoutRef.current?.destroy();
    checkoutRef.current = null;
    mountedRef.current = false;
    setStatus("idle");
    setAttempt((current) => current + 1);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        {testMode && (
          <div
            role="status"
            className="rounded-2xl border-2 border-amber-300 bg-amber-300 px-5 py-4 text-center text-sm font-black tracking-[0.2em] text-black shadow-lg shadow-amber-300/20"
          >
            TEST MODE — NO REAL CHARGES
          </div>
        )}

        <header className="text-center">
          <Link
            href="/pricing"
            className="mb-8 inline-flex text-sm font-bold text-[#B3B3B3] transition-colors hover:text-white"
          >
            Back to plans
          </Link>

          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5">
            <span className="text-2xl font-black text-[#D4AF37]">L</span>
          </div>

          <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">
            Lumetrix Media
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Secure Checkout
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#B3B3B3]">
            Premium cinematic footage built to make your brand look more valuable.
          </p>
        </header>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/30 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B3B3B3]">
                Selected plan
              </p>
              <h2 className="mt-2 text-2xl font-black">{planDetails.checkoutName}</h2>
            </div>
            <div className="rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-5 py-4 text-left sm:text-right">
              <p className="text-3xl font-black text-[#F1D27A]">{planDetails.monthlyPrice}</p>
              <p className="text-sm font-semibold text-[#B3B3B3]">per month</p>
            </div>
          </div>
        </section>

        {showBrowserNotice && (
          <section className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-4 text-sm leading-6 text-[#F1D27A]">
            <div className="flex gap-3">
              <p className="flex-1">
                You can complete checkout here. For the smoothest experience, you may also open this page in Safari or Chrome.
              </p>
              <button
                type="button"
                onClick={() => setShowBrowserNotice(false)}
                className="shrink-0 text-[#F1D27A] underline-offset-4 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </section>
        )}

        <section className="rounded-[28px] border border-white/10 bg-black p-3 sm:p-5">
          {status === "active" && (
            <div className="rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 p-5">
              <h2 className="text-2xl font-black">Your Lumetrix access is already active.</h2>
              <p className="mt-3 text-sm leading-6 text-[#F1D27A]/80">
                This account already has an active subscription, so another checkout was not started.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-[#D4AF37] px-5 py-3 text-center text-sm font-black text-black transition hover:bg-[#F1D27A]"
                >
                  Open dashboard
                </Link>
                <Link
                  href="/account"
                  className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-black text-white transition hover:border-white/40"
                >
                  Manage subscription
                </Link>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <h2 className="text-2xl font-black">Checkout could not load.</h2>
              <p className="mt-3 text-sm leading-6 text-red-100/80">
                Please retry. You can also open this Lumetrix checkout page in Safari or Chrome.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={retryCheckout}
                  className="rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black transition hover:bg-[#F1D27A]"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={copyCheckoutLink}
                  className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:border-white/40"
                >
                  {copied ? "Copied" : "Copy checkout page link"}
                </button>
                <Link
                  href="/pricing"
                  className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-black text-white transition hover:border-white/40"
                >
                  Return to pricing
                </Link>
              </div>
            </div>
          )}

          <div
            id="lumetrix-embedded-checkout"
            className={`min-h-[680px] w-full overflow-hidden rounded-2xl bg-white ${
              status === "active" || status === "error" ? "hidden" : "block"
            }`}
          />

          {(status === "idle" || status === "loading") && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-[#B3B3B3]">
              Loading secure checkout...
            </div>
          )}
        </section>

        <footer className="text-center text-xs leading-6 text-[#777]">
          Checkout is processed securely by Stripe inside the Lumetrix app. No public posting, upload, or external social action occurs here.
        </footer>
      </div>
    </main>
  );
}
