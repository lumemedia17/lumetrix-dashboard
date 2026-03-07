import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = "lumetrix-vault";

export async function GET(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get("prefix");
  if (!prefix) return NextResponse.json({ error: "Missing prefix" }, { status: 400 });

  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
    })
  );

  const keys =
    result.Contents?.map(o => o.Key!)
      .filter(k => k.endsWith(".mp4")) || [];

  return NextResponse.json({ keys });
}
