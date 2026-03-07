"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Invalid email or password");
      return;
    }

    router.push("/vault/all");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <form onSubmit={handleSubmit} className="w-96 space-y-4">
        <h1 className="text-2xl font-bold text-center">Log In</h1>

        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full p-3 bg-neutral-900 rounded"
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="w-full p-3 bg-neutral-900 rounded"
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-white text-black py-3 rounded font-bold"
        >
          Log In
        </button>

        <p className="text-sm text-center text-neutral-400">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-yellow-400">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
