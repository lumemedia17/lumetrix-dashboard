"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (session) {
        setReady(true);
      } else {
        setError("This reset link is invalid or expired.");
      }
    }

    checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!ready) {
      setError("This reset link is invalid or expired.");
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

    const { error } = await supabaseBrowser.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message || "Could not update password.");
      setLoading(false);
      return;
    }

    setSuccess("Password updated successfully. Redirecting to login...");

    setTimeout(() => {
      router.replace("/login");
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white px-6">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center">
        <div className="w-full max-w-md animate-[fadeIn_0.8s_ease-out]">
          <div className="mb-8 text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5">
              <span className="text-2xl font-black text-[#D4AF37]">L</span>
            </div>

            <h1 className="mb-2 text-4xl font-black">Choose New Password</h1>
            <p className="text-[#B3B3B3]">
              Enter your new password below.
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
              <label className="mb-2 block text-sm font-bold">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white transition-colors focus:border-[#D4AF37]/50 focus:outline-none"
              />
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
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white transition-colors focus:border-[#D4AF37]/50 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !ready}
              className="w-full rounded-full bg-[#D4AF37] px-6 py-4 text-black font-black shadow-xl shadow-[#D4AF37]/40 transition-all duration-300 hover:bg-[#F1D27A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
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