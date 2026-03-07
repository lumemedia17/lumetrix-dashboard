// app/api/vault/file/route.ts
import { NextRequest } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION!, // MUST match your bucket region
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
});

const BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || "";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const download = req.nextUrl.searchParams.get("download"); // "1" to force download

  if (!BUCKET) return new Response("Missing bucket env (S3_BUCKET_NAME)", { status: 500 });
  if (!key) return new Response("Missing key", { status: 400 });

  try {
    const filename = key.split("/").pop() || "file";

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ResponseContentDisposition: download ? `attachment; filename="${filename}"` : "inline",
      }),
      { expiresIn: 600 }
    );

    // 302 redirect is correct here (fast, streams from S3)
    return Response.redirect(url, 302);
  } catch (e: any) {
    console.error("S3 error:", e);
    return new Response(e?.message || "Failed to get file", { status: 500 });
  }
}
