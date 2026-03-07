import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function requireVaultAccess(
  vault: "luxury" | "fitness" | "real_estate" | "all"
) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, vault_access, plan")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) redirect("/pricing");

  if (
    vault === "all" ||
    profile.plan === "all" ||
    profile.vault_access?.all === true ||
    profile.vault_access?.[vault] === true
  ) {
    return;
  }

  redirect("/pricing");
}
