"use client";

import { useMemo, useRef, useState } from "react";

export type VaultClip = {
  key: string;
  name: string;
  thumbKey: string;
};

function formatClipName(filename: string) {
  return filename
    .replace(/\.mp4$/i, "")                  // remove .mp4
    .replace(/_/g, " ")                      // underscores -> spaces
    .replace(/\+/g, " & ")                   // + -> &
    .replace(/\s+/g, " ")                    // collapse spaces
    .replace(/\b(\d{3})$/, "– $1")           // 001 -> – 001
    .trim();
}

export default function VaultClipCard({ clip }: { clip: VaultClip }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const thumbSrc = useMemo(
    () => `/api/vault/file?key=${encodeURIComponent(clip.thumbKey)}`,
    [clip.thumbKey]
  );

  const videoSrc = useMemo(
    () => `/api/vault/file?key=${encodeURIComponent(clip.key)}`,
    [clip.key]
  );

  const downloadHref = useMemo(
    () => `/api/vault/file?key=${encodeURIComponent(clip.key)}&download=1`,
    [clip.key]
  );

  function onEnter() {
    setHovering(true);
    const v = videoRef.current;
    if (!v) return;

    if (!v.src) v.src = videoSrc;
    v.play().catch(() => {});
  }

  function onLeave() {
    setHovering(false);
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    try {
      v.currentTime = 0;
    } catch {}
  }

  return (
    <>
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden">
        <div
          className="relative w-full aspect-video bg-black overflow-hidden cursor-pointer"
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onClick={() => setOpen(true)}
        >
          {/* Thumbnail */}
          <img
            src={thumbSrc}
            loading="eager"
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
              hovering && videoReady ? "opacity-0" : "opacity-100"
            }`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = "0";
            }}
          />

          {/* Hover video */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
            onCanPlay={() => setVideoReady(true)}
          />
        </div>

        <div className="p-4 bg-neutral-900/40">
          <div className="text-sm font-semibold truncate mb-3">
            {formatClipName(clip.name)}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg bg-yellow-400 text-black px-3 py-1 text-sm font-semibold"
            >
              Open
            </button>

            <a
              href={downloadHref}
              className="rounded-lg border border-neutral-700 px-3 py-1 text-sm"
            >
              Download
            </a>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />

          <div className="relative z-10 w-[min(1100px,92vw)] rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-neutral-700 px-3 py-1 text-sm"
              >
                ← Back
              </button>

              <div className="text-sm font-semibold truncate px-3">
                {formatClipName(clip.name)}
              </div>

              <a
                href={downloadHref}
                className="rounded-lg bg-yellow-400 text-black px-3 py-1 text-sm font-semibold"
              >
                Download
              </a>
            </div>

            <video
              src={videoSrc}
              className="w-full h-auto"
              controls
              autoPlay
              muted
              playsInline
              preload="auto"
            />
          </div>
        </div>
      )}
    </>
  );
}
