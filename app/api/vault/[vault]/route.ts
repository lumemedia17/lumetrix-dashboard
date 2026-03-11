import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const VAULT_PREFIX_MAP: Record<string, string> = {
  luxury: "luxury/",
  "real-estate": "real-estate/",
  fitness: "fitness/",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vault: string }> }
) {
  const { vault } = await params;

  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, vault_access")
    .eq("id", user.id)
    .single();

  if (!profile?.is_active || !profile.vault_access?.[vault]) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const prefix = VAULT_PREFIX_MAP[vault];
  if (!prefix) {
    return NextResponse.json({ error: "Invalid vault" }, { status: 400 });
  }

  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: prefix,
    })
  );

  const files =
    result.Contents?.filter((o) => o.Key && !o.Key.endsWith("/")).map((o) => ({
      key: o.Key!,
      name: o.Key!.split("/").pop()!,
    })) ?? [];

  return NextResponse.json(files);
}