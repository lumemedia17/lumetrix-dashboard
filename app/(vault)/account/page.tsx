import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import AccountClient from "./AccountClient";

export default async function Page() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, plan, is_active, stripe_customer_id")
    .eq("id", user.id)
    .single();

  return (
    <AccountClient
      email={profile?.email ?? user.email ?? ""}
      plan={profile?.plan ?? "free"}
      isActive={Boolean(profile?.is_active)}
      hasStripeCustomer={Boolean(profile?.stripe_customer_id)}
    />
  );
}