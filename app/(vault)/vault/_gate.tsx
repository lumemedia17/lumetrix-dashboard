import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type VaultKey = "luxury" | "fitness" | "real-estate" | "all";

type Profile = {
  plan: VaultKey | "free" | null;
  is_active: boolean | null;
  vault_access: Record<string, boolean> | null;
};

export async function requireVaultAccess(vault: VaultKey): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, vault_access, plan")
    .eq("id", user.id)
    .single();

  const p = profile as Profile | null;

  if (!p?.is_active) {
    redirect("/pricing");
  }

  const access = p.vault_access ?? {};

  if (vault === "all") {
    if (p.plan === "all" || access.all === true) {
      return;
    }
    redirect("/pricing");
  }

  if (p.plan === "all" || access.all === true) {
    return;
  }

  if (vault === "luxury" && (p.plan === "luxury" || access.luxury === true)) {
    return;
  }

  if (
    vault === "real-estate" &&
    (p.plan === "real-estate" || access["real-estate"] === true)
  ) {
    return;
  }

  if (vault === "fitness" && (p.plan === "fitness" || access.fitness === true)) {
    return;
  }

  redirect("/pricing");
}