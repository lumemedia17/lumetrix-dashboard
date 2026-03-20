import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get("prefix");

  if (!prefix) {
    return NextResponse.json({ error: "Missing prefix" }, { status: 400 });
  }

  if (!BUCKET) {
    return NextResponse.json(
      { error: "Missing bucket env (S3_BUCKET_NAME)" },
      { status: 500 }
    );
  }

  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: 20,
    })
  );

  const keys =
    result.Contents?.map((o) => o.Key!)
      .filter((k) => k.toLowerCase().endsWith(".mp4"))
      .sort() || [];

  return NextResponse.json(
    { keys },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}