import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

const BUCKET =
  process.env.S3_BUCKET_NAME ||
  process.env.S3_BUCKET ||
  process.env.AWS_S3_BUCKET ||
  "";

function mp4ToThumbKey(mp4Key: string) {
  return mp4Key.replace(/^luxury\//, "thumbs/luxury/").replace(/\.mp4$/i, ".jpg");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  if (!category) return NextResponse.json([]);

  if (!BUCKET) {
    return NextResponse.json(
      { error: "Missing bucket env (S3_BUCKET_NAME)" },
      { status: 500 }
    );
  }

  const Prefix = `luxury/${category}/`;

  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix,
      MaxKeys: 200,
    })
  );

  const mp4s =
    result.Contents?.map((o) => o.Key)
      .filter((k): k is string => !!k && k.toLowerCase().endsWith(".mp4")) ?? [];

  mp4s.sort();

  const clips = mp4s.map((key) => ({
    key,
    name: key.split("/").pop() || key,
    thumbKey: mp4ToThumbKey(key),
  }));

  return NextResponse.json(clips, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}