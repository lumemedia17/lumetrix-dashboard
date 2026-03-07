// app/api/vault/all/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME!;
const VAULT_ORDER = ["luxury", "real-estate", "fitness"];

function supabaseRoute() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // route handlers can set cookies, but not needed here
        },
      },
    }
  );
}

function titleFromVaultId(vaultId: string) {
  const base = vaultId
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `${base} Vault`;
}

export async function GET() {
  try {
    // ✅ API ENFORCEMENT
    const supabase = supabaseRoute();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active, vault_access, plan")
      .eq("id", user.id)
      .single();

    if (!profile?.is_active) {
      return NextResponse.json({ error: "Subscription required" }, { status: 403 });
    }

    // Optional: restrict this endpoint to all-access only
    const hasAllAccess =
      profile.plan === "all" ||
      profile.vault_access?.all === true ||
      (profile.vault_access?.luxury && profile.vault_access?.real_estate && profile.vault_access?.fitness);

    if (!hasAllAccess) {
      return NextResponse.json({ error: "All Access required" }, { status: 403 });
    }

    // Now safe to list S3
    const root = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Delimiter: "/",
      })
    );

    const prefixes = root.CommonPrefixes?.map((p) => p.Prefix).filter(Boolean) as string[] | undefined;
    const vaultPrefixes = prefixes ?? [];

    const vaults = await Promise.all(
      vaultPrefixes.map(async (prefix) => {
        const vaultId = prefix.replace(/\/$/, "");
        const title = titleFromVaultId(vaultId);

        const res = await s3.send(
          new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: prefix,
            MaxKeys: 50,
          })
        );

        const clipObj = res.Contents?.find((o) => o.Key && o.Key.toLowerCase().endsWith(".mp4"));

        return {
          id: vaultId,
          title,
          clip: clipObj?.Key
            ? {
                key: clipObj.Key,
                name: clipObj.Key.split("/").pop() || clipObj.Key,
                url: `/api/vault/file?key=${encodeURIComponent(clipObj.Key)}&mode=stream`,
              }
            : null,
        };
      })
    );

    vaults.sort((a, b) => {
      const aIdx = VAULT_ORDER.indexOf(a.id);
      const bIdx = VAULT_ORDER.indexOf(b.id);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    });

    return NextResponse.json(vaults, { status: 200 });
  } catch (err) {
    console.error("ALL VAULT ERROR:", err);
    return new NextResponse("Failed to load vaults", { status: 500 });
  }
}
