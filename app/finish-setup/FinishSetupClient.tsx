"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function FinishSetupClient() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId) return setMsg("Missing session_id.");
    setLoading(true);
    setMsg(null);

    const res = await fetch("/api/finish-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      return setMsg(data?.error || "Setup failed.");
    }

    router.push("/login?prefill=" + encodeURIComponent(email));
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6">
        <h1 className="text-2xl font-bold text-white">Finish setup</h1>
        <p className="text-white/70 mt-2">
          Create your password to unlock the Vault.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-white"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
          />

          <input
            className="w-full rounded-xl bg-black/50 border border-white/10 px-3 py-2 text-white"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            minLength={8}
          />

          {msg && <p className="text-red-400 text-sm">{msg}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-yellow-500 text-black font-semibold py-2"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}