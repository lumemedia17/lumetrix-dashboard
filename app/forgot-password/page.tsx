"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : "https://app.lumetrixmedia.com/reset-password";

    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setError(error.message || "Could not send reset email.");
      setLoading(false);
      return;
    }

    setSuccess("Password reset email sent. Check your inbox.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white px-6">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center">
        <div className="w-full max-w-md animate-[fadeIn_0.8s_ease-out]">
          <div className="mb-8 text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5">
              <span className="text-2xl font-black text-[#D4AF37]">L</span>
            </div>

            <h1 className="mb-2 text-4xl font-black">Reset Password</h1>
            <p className="text-[#B3B3B3]">
              Enter your email and we’ll send you a secure reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-4 text-sm text-[#F1D27A]">
                {success}
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
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white transition-colors focus:border-[#D4AF37]/50 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#D4AF37] px-6 py-4 text-black font-black shadow-xl shadow-[#D4AF37]/40 transition-all duration-300 hover:bg-[#F1D27A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-[#B3B3B3] transition-colors hover:text-white"
              >
                ← Back to login
              </Link>
            </div>
          </form>
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