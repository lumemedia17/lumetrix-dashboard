"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const prefill = params.get("prefill");

    if (prefill) {
      setEmail(prefill);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.replace("/vault/all");
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white px-6">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center">
        <div className="w-full max-w-md animate-[fadeIn_0.8s_ease-out]">
          <div className="mb-8 text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5">
              <span className="text-2xl font-black text-[#D4AF37]">L</span>
            </div>

            <h1 className="mb-2 text-4xl font-black">Welcome Back</h1>
            <p className="text-[#B3B3B3]">Sign in to access your vaults</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold">Email</label>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white transition-colors focus:border-[#D4AF37]/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Password</label>
              <input
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white transition-colors focus:border-[#D4AF37]/50 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#D4AF37] px-6 py-4 text-black font-black shadow-xl shadow-[#D4AF37]/40 transition-all duration-300 hover:bg-[#F1D27A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Log In"}
            </button>

            <div className="text-center">
              <Link
                href="https://lumetrixmedia.com"
                className="text-sm text-[#B3B3B3] transition-colors hover:text-white"
              >
                ← Back to home
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