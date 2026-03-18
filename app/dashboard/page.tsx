"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

type PlanKey = "all" | "luxury" | "real-estate" | "fitness" | "free" | null;

type Profile = {
  id: string;
  plan: PlanKey;
  is_active: boolean;
  vault_access: Record<string, boolean> | null;
};

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function go() {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabaseBrowser
        .from("profiles")
        .select("id,plan,is_active,vault_access")
        .eq("id", user.id)
        .single();

      const p = profile as Profile | null;

      if (!p?.is_active) {
        router.replace("/pricing");
        return;
      }

      const plan = p.plan;
      const access = p.vault_access ?? {};

      if (plan === "all" || access.all === true) {
        router.replace("/vault/all");
        return;
      }

      if (plan === "luxury" || access.luxury === true) {
        router.replace("/vault/luxury");
        return;
      }

      if (plan === "real-estate" || access."real-estate" === true) {
        router.replace("/vault/real-estate");
        return;
      }

      if (plan === "fitness" || access.fitness === true) {
        router.replace("/vault/fitness");
        return;
      }

      router.replace("/pricing");
    }

    go();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <p>Loading…</p>
    </main>
  );
}
