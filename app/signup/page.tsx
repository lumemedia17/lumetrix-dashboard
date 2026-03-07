"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    const confirm = form.get("confirm") as string;

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/vault/all");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <form onSubmit={handleSubmit} className="w-96 space-y-4">
        <h1 className="text-2xl font-bold text-center">Create Account</h1>

        <input name="email" type="email" placeholder="Email" required className="w-full p-3 bg-neutral-900 rounded" />
        <input name="password" type="password" placeholder="Password" required className="w-full p-3 bg-neutral-900 rounded" />
        <input name="confirm" type="password" placeholder="Confirm Password" required className="w-full p-3 bg-neutral-900 rounded" />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" className="w-full bg-yellow-400 text-black py-3 rounded font-bold">
          Sign Up
        </button>
      </form>
    </div>
  );
}
