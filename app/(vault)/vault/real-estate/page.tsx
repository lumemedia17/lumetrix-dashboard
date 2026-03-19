import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import RealEstateVaultClient from "./RealEstateVaultClient";

type Profile = {
  plan: string | null;
  is_active: boolean | null;
  vault_access: Record<string, boolean> | null;
};

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

  const p = profile as Profile | null;

  if (!p?.is_active) redirect("/pricing");

  const ok =
    p.plan === "real-estate" ||
    p.plan === "all" ||
    p.vault_access?.["real-estate"] === true;

  if (!ok) redirect("/pricing");

  return <RealEstateVaultClient />;
}