// lib/s3.ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function filenameFromKey(key: string) {
  const name = key.split("/").pop() || "download.mp4";
  return name.replace(/"/g, "");
}

export async function getSignedFileUrl(
  key: string,
  expiresInSeconds = 300,
  opts?: { download?: boolean }
) {
  const download = opts?.download === true;
  const filename = filenameFromKey(key);

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,

    // ✅ THIS is what forces a real download in the browser:
    ...(download
      ? {
          ResponseContentDisposition: `attachment; filename="${filename}"`,
          ResponseContentType: "video/mp4",
        }
      : {}),
  });

  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}
