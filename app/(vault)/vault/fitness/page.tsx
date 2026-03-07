import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import FitnessVaultClient from "./FitnessVaultClient";

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
    profile.plan === "fitness" ||
    profile.plan === "all" ||
    profile.vault_access?.fitness === true;

  if (!ok) redirect("/pricing");

  return <FitnessVaultClient />;
}
