"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function FinishSetupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("session_id");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [msg, setMsg] = useState("Checking payment...");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);

  const passwordsMatch = useMemo(() => {
    if (!password || !confirmPassword) return true;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  useEffect(() => {
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    async function checkSession() {
      if (!sessionId) {
        setError("Missing session_id.");
        setChecking(false);
        return;
      }

      try {
        const res = await fetch("/api/finish-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            check_only: true,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (res.ok && data?.ready) {
          setReady(true);
          setChecking(false);
          setError("");
          setMsg("Payment confirmed. Create your password to enter the vaults.");

          if (data?.email) {
            setEmail(data.email);
          }

          return;
        }

        setReady(false);
        setChecking(false);
        setError("");
        setMsg(data?.error || "Payment processing. Retrying...");

        retryTimeout = setTimeout(checkSession, 2500);
      } catch {
        if (cancelled) return;

        setReady(false);
        setChecking(false);
        setError("");
        setMsg("Unable to verify payment yet. Retrying...");

        retryTimeout = setTimeout(checkSession, 2500);
      }
    }

    checkSession();

    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [sessionId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!sessionId) {
      setError("Missing session_id.");
      return;
    }

    if (!ready) {
      setError("Your payment is still being verified. Please wait a moment.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setMsg("Creating your account...");

    try {
      const res = await fetch("/api/finish-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          email,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoading(false);
        setError(data?.error || "Setup failed.");
        setMsg("");
        return;
      }

      setMsg("Account created. Signing you in...");

      const signIn = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });

      if (signIn.error) {
        setLoading(false);
        router.replace(`/login?prefill=${encodeURIComponent(email)}`);
        return;
      }

      const redirectTo = data?.redirectTo || "/vault/all";
      router.replace(redirectTo);
    } catch {
      setLoading(false);
      setError("Something went wrong.");
      setMsg("");
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white px-6">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center py-16">
        <div className="w-full max-w-md animate-[fadeIn_0.8s_ease-out]">
          <a
            href="https://lumetrixmedia.com"
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#B3B3B3] transition-colors hover:text-white"
          >
            ← Back to home
          </a>

          <div className="rounded-[28px] border border-white/10 bg-black p-8 shadow-2xl">
            <div className="mb-8 text-center">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5">
                <span className="text-2xl font-black text-[#D4AF37]">L</span>
              </div>

              <h1 className="mb-2 text-4xl font-black">Finish Setup</h1>
              <p className="text-[#B3B3B3]">
                Create your password to unlock your Lumetrix access.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              {msg && !error && (
                <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-4 text-sm text-[#F1D27A]">
                  {msg}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-bold">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  disabled={checking || loading}
                  readOnly
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white transition-colors focus:border-[#D4AF37]/50 focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Create a password"
                  disabled={!ready || checking || loading}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white transition-colors focus:border-[#D4AF37]/50 focus:outline-none disabled:opacity-60"
                />
                <p className="mt-2 text-xs text-[#B3B3B3]">Minimum 8 characters</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Confirm your password"
                  disabled={!ready || checking || loading}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white transition-colors focus:border-[#D4AF37]/50 focus:outline-none disabled:opacity-60"
                />
              </div>

              {!passwordsMatch && (
                <p className="text-sm text-red-400">Passwords do not match.</p>
              )}

              <button
                type="submit"
                disabled={
                  !ready ||
                  checking ||
                  loading ||
                  !password ||
                  !confirmPassword ||
                  password !== confirmPassword
                }
                className="w-full rounded-full bg-[#D4AF37] px-6 py-4 text-black font-black shadow-xl shadow-[#D4AF37]/40 transition-all duration-300 hover:bg-[#F1D27A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checking
                  ? "Checking payment..."
                  : loading
                  ? "Creating Account..."
                  : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}