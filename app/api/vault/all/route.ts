import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

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

type Profile = {
  is_active: boolean | null;
  vault_access: Record<string, boolean> | null;
  plan: string | null;
};

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
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_active, vault_access, plan")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const p = profile as Profile | null;

    if (!p?.is_active) {
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 403 }
      );
    }

    const hasAllAccess =
      p.plan === "all" ||
      p.vault_access?.all === true ||
      (p.vault_access?.luxury === true &&
        p.vault_access?.["real-estate"] === true &&
        p.vault_access?.fitness === true);

    if (!hasAllAccess) {
      return NextResponse.json(
        { error: "All Access required" },
        { status: 403 }
      );
    }

    const root = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Delimiter: "/",
      })
    );

    const prefixes =
      root.CommonPrefixes
        ?.map((p) => p.Prefix)
        .filter(Boolean) as string[] | undefined;

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

        const clipObj = res.Contents?.find(
          (o) => o.Key && o.Key.toLowerCase().endsWith(".mp4")
        );

        return {
          id: vaultId,
          title,
          clip: clipObj?.Key
            ? {
                key: clipObj.Key,
                name: clipObj.Key.split("/").pop() || clipObj.Key,
                url: `/api/vault/file?key=${encodeURIComponent(
                  clipObj.Key
                )}&mode=stream`,
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