// app/api/vault-test/route.ts
import { NextResponse } from "next/server";
import { getSignedFileUrl } from "@/lib/s3";

export const runtime = "nodejs";

export async function GET() {
  try {
    // 👇 must match the file you uploaded
    const key = "luxury/cars/luxury_cars_test_001.mp4";

    const url = await getSignedFileUrl(key, 300); // 5 minutes
    return NextResponse.json({ url });
  } catch (err) {
    console.error("S3 test error:", err);
    return NextResponse.json(
      { error: "S3 error", details: String(err) },
      { status: 500 }
    );
  }
}
