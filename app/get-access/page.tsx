"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function GetAccessPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabaseBrowser.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // After signup → send to pricing / Stripe checkout
    router.push("/pricing");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-md space-y-6"
      >
        <h1 className="text-3xl font-bold text-center">Create account</h1>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full px-4 py-3 rounded bg-neutral-900 border border-neutral-700"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (min 6 chars)"
          className="w-full px-4 py-3 rounded bg-neutral-900 border border-neutral-700"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          disabled={loading}
          className="w-full py-3 rounded-full bg-yellow-400 text-black font-bold disabled:opacity-50"
        >
          {loading ? "Creating…" : "Get Access"}
        </button>
      </form>
    </div>
  );
}
