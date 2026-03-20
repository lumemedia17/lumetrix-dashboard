import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET =
  process.env.S3_BUCKET_NAME ||
  process.env.S3_BUCKET ||
  process.env.AWS_S3_BUCKET ||
  "";

const ALLOWED = new Set([
  "agents",
  "homes",
  "interiors",
  "investments",
  "neighborhoods",
  "transitions",
  "textures",
  "urban",
]);

function mp4ToThumbKey(mp4Key: string) {
  return mp4Key
    .replace(/^real-estate\//, "thumbs/real-estate/")
    .replace(/\.mp4$/i, ".jpg");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get("category") || "agents").toLowerCase();

  if (!ALLOWED.has(category)) return NextResponse.json([]);

  if (!BUCKET) {
    return NextResponse.json(
      { error: "Missing bucket env (S3_BUCKET_NAME)" },
      { status: 500 }
    );
  }

  const Prefix = `real-estate/${category}/`;

  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix,
      MaxKeys: 200,
    })
  );

  const files =
    result.Contents?.map((x) => x.Key)
      .filter((k): k is string => !!k && k.toLowerCase().endsWith(".mp4"))
      .sort()
      .map((key) => ({
        key,
        name: key.split("/").pop() || key,
        thumbKey: mp4ToThumbKey(key),
      })) ?? [];

  return NextResponse.json(files, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}