// app/api/favorites/list/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET() {
  // Next 16: cookies() is async
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Not logged in → just return empty list (no error)
  if (userError || !user) {
    return NextResponse.json({ keys: [] });
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("s3_key")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error loading favorites", error);
    // Fail soft — empty list instead of 500 so UI still works
    return NextResponse.json({ keys: [] });
  }

  const keys = (data ?? []).map((row) => row.s3_key as string);
  return NextResponse.json({ keys });
}
