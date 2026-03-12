import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const key = body?.key as string | undefined;

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const { data: existing, error: selectError } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("s3_key", key)
    .maybeSingle();

  if (selectError) {
    console.error("Error checking favorite", selectError);
    return NextResponse.json(
      { error: "Failed to toggle favorite" },
      { status: 500 }
    );
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from("favorites")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      console.error("Error removing favorite", deleteError);
      return NextResponse.json(
        { error: "Failed to remove favorite" },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "removed" });
  }

  const { error: insertError } = await supabase
    .from("favorites")
    .insert({ user_id: user.id, s3_key: key });

  if (insertError) {
    console.error("Error adding favorite", insertError);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "added" });
}