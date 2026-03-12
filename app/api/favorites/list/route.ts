import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ keys: [] });
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("s3_key")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error loading favorites", error);
    return NextResponse.json({ keys: [] });
  }

  const keys = (data ?? []).map((row) => row.s3_key as string);
  return NextResponse.json({ keys });
}