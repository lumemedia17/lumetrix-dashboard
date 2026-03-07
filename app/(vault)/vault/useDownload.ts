"use client";

export async function downloadClip(key: string) {
  // 1) Ask your API for a signed URL
  const res = await fetch(
    `/api/vault/file?key=${encodeURIComponent(key)}`
  );

  if (!res.ok) {
    alert("Failed to get download link");
    return;
  }

  const { url } = await res.json();

  // 2) Fetch the file as a blob
  const fileRes = await fetch(url);
  const blob = await fileRes.blob();

  // 3) Force browser download
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = key.split("/").pop() || "clip.mp4";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
