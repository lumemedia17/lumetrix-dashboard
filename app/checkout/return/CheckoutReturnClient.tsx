"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReturnState =
  | "loading"
  | "account_active"
  | "activation_pending"
  | "incomplete"
  | "invalid"
  | "error";

type StatusResponse = {
  state?: ReturnState;
  message?: string;
  plan?: string | null;
  email?: string | null;
  dashboard_url?: string;
  login_url?: string;
  finish_setup_url?: string;
  retry_url?: string;
};

const MAX_POLLS = 5;
const POLL_INTERVAL_MS = 2500;

export default function CheckoutReturnClient({
  sessionId,
}: {
  sessionId: string | null;
}) {
  const [state, setState] = useState<ReturnState>("loading");
  const [payload, setPayload] = useState<StatusResponse>({});
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timeout: number | null = null;

    async function checkStatus(currentPoll: number) {
      if (!sessionId) {
        setState("invalid");
        setPayload({
          message: "We could not verify this checkout.",
        });
        return;
      }

      try {
        const res = await fetch(
          `/api/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        const data = (await res.json().catch(() => ({}))) as StatusResponse;

        if (cancelled) return;

        const nextState = data.state || "error";
        setPayload(data);
        setState(nextState);

        if (nextState === "activation_pending" && currentPoll < MAX_POLLS) {
          timeout = window.setTimeout(() => {
            setPollCount((count) => count + 1);
            checkStatus(currentPoll + 1);
          }, POLL_INTERVAL_MS);
        }
      } catch {
        if (cancelled) return;
        setState("error");
        setPayload({
          message: "We could not verify this checkout.",
        });
      }
    }

    checkStatus(0);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [sessionId]);

  const message =
    payload.message ||
    (state === "loading" ? "Verifying checkout..." : "We could not verify this checkout.");

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[75vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5">
          <span className="text-2xl font-black text-[#D4AF37]">L</span>
        </div>

        <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">
          Lumetrix Media
        </p>

        {state === "loading" && (
          <>
            <h1 className="text-4xl font-black">Verifying checkout...</h1>
            <p className="mt-4 text-[#B3B3B3]">
              Confirming your Stripe Checkout Session securely.
            </p>
          </>
        )}

        {state === "account_active" && (
          <>
            <h1 className="text-4xl font-black">Your Lumetrix access is ready.</h1>
            <p className="mt-4 text-[#B3B3B3]">
              Your subscription is active. Continue to your vault or sign in with your Lumetrix account.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
              <Link
                href={payload.dashboard_url || "/dashboard"}
                className="flex-1 rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black transition hover:bg-[#F1D27A]"
              >
                Continue to dashboard
              </Link>
              <Link
                href={payload.login_url || "/login"}
                className="flex-1 rounded-full border border-white/15 px-5 py-3 text-sm font-black transition hover:border-white/40"
              >
                Continue to login
              </Link>
            </div>
          </>
        )}

        {state === "activation_pending" && (
          <>
            <h1 className="text-4xl font-black">Payment confirmed.</h1>
            <p className="mt-4 text-[#B3B3B3]">
              Your account is being activated. This normally takes only a moment.
            </p>
            <div className="mt-5 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-4 text-sm text-[#F1D27A]">
              {pollCount < MAX_POLLS
                ? "Checking activation status..."
                : "If this is your first Lumetrix purchase, finish setup to create your password."}
            </div>
            <div className="mt-8 flex w-full flex-col gap-3">
              <Link
                href={payload.finish_setup_url || `/finish-setup?session_id=${encodeURIComponent(sessionId || "")}`}
                className="rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black transition hover:bg-[#F1D27A]"
              >
                Finish account setup
              </Link>
              <Link
                href={payload.login_url || "/login"}
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-black transition hover:border-white/40"
              >
                I already have a login
              </Link>
            </div>
          </>
        )}

        {state === "incomplete" && (
          <>
            <h1 className="text-4xl font-black">Checkout was not completed.</h1>
            <p className="mt-4 text-[#B3B3B3]">{message}</p>
            <Link
              href={payload.retry_url || "/pricing"}
              className="mt-8 rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-black text-black transition hover:bg-[#F1D27A]"
            >
              Return to checkout
            </Link>
          </>
        )}

        {(state === "invalid" || state === "error") && (
          <>
            <h1 className="text-4xl font-black">We could not verify this checkout.</h1>
            <p className="mt-4 text-[#B3B3B3]">
              Please retry from the Lumetrix checkout page. If payment completed, use the finish setup link from your receipt or contact support.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
              <Link
                href="/pricing"
                className="flex-1 rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-black text-black transition hover:bg-[#F1D27A]"
              >
                Return to pricing
              </Link>
              <Link
                href="/login"
                className="flex-1 rounded-full border border-white/15 px-5 py-3 text-sm font-black transition hover:border-white/40"
              >
                Go to login
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
