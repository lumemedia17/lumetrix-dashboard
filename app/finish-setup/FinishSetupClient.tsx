"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";

export default function FinishSetupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("session_id");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      if (!sessionId) {
        setMsg("Missing session_id.");
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

        if (res.ok) {
          setReady(true);
          if (data?.email) setEmail(data.email);
          setMsg("");
        } else {
          setReady(false);
          setMsg(data?.error || "Payment processing. Please retry in a few seconds.");
        }
      } catch {
        if (!cancelled) {
          setReady(false);
          setMsg("Unable to verify payment yet.");
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!sessionId) {
      setMsg("Missing session_id.");
      return;
    }

    setLoading(true);
    setMsg("");

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
        setMsg(data?.error || "Setup failed.");
        return;
      }

      router.push("/login?prefill=" + encodeURIComponent(email));
    } catch {
      setLoading(false);
      setMsg("Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 mb-6">
            <UserPlus className="w-8 h-8 text-[#D4AF37]" />
          </div>

          <h1 className="text-4xl font-black mb-2">Finish Setup</h1>
          <p className="text-[#B3B3B3]">Create your password to unlock the Vault</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {msg && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {msg}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              disabled={checking || loading}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 focus:border-[#D4AF37]/50 focus:outline-none transition-colors disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              disabled={!ready || checking || loading}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 focus:border-[#D4AF37]/50 focus:outline-none transition-colors disabled:opacity-60"
            />
            <p className="text-xs text-[#B3B3B3] mt-2">Minimum 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={!ready || checking || loading}
            className="w-full px-6 py-4 rounded-full bg-[#D4AF37] text-black font-black hover:bg-[#F1D27A] transition-all duration-300 shadow-xl shadow-[#D4AF37]/40 disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}