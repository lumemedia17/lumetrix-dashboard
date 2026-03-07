import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED = new Set([
  "cardio",
  "gym",
  "lifestyle",
  "nutrition",
  "textures",
  "transitions",
  "wellness",
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get("category") || "cardio").toLowerCase();

  if (!ALLOWED.has(category)) return NextResponse.json([]);

  const Prefix = `fitness/${category}/`;

  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix,
    })
  );

  const files =
    result.Contents?.filter((x) => x.Key && !x.Key.endsWith("/")).map((x) => ({
      key: x.Key as string,
      name: (x.Key as string).split("/").pop() as string,
    })) ?? [];

  return NextResponse.json(files);
}
