import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import LuxuryVaultClient from "./LuxuryVaultClient";

export default async function Page() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan,is_active,vault_access")
    .eq("id", user.id)
    .single();

  if (!profile?.is_active) redirect("/pricing");

  const ok =
    profile.plan === "luxury" ||
    profile.plan === "all" ||
    profile.vault_access?.luxury === true;

  if (!ok) redirect("/pricing");

  return <LuxuryVaultClient />;
}
