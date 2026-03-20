"use client";

import { useMemo, useRef, useState } from "react";

export type VaultClip = {
  key: string;
  name: string;
  thumbKey: string;
};

function formatClipName(filename: string) {
  return filename
    .replace(/\.mp4$/i, "")
    .replace(/_/g, " ")
    .replace(/\+/g, " & ")
    .replace(/\s+/g, " ")
    .replace(/\b(\d{3})$/, "– $1")
    .trim();
}

export default function VaultClipCard({ clip }: { clip: VaultClip }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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

    if (!v.src) {
      v.src = videoSrc;
    }

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
      <div className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.02] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-all duration-300 hover:border-[#D4AF37]/20 hover:shadow-[0_0_40px_rgba(212,175,55,0.08)]">
        <div
          className="relative aspect-video w-full cursor-pointer overflow-hidden bg-black"
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onClick={() => setOpen(true)}
        >
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.04] to-white/[0.01]" />
          )}

          <img
            src={thumbSrc}
            alt={formatClipName(clip.name)}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = "0";
            }}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-300 ${
              hovering && videoReady ? "scale-[1.01] opacity-0" : "opacity-100"
            }`}
          />

          <video
            ref={videoRef}
            muted
            playsInline
            preload="none"
            className="absolute inset-0 h-full w-full object-cover"
            onCanPlay={() => setVideoReady(true)}
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-70" />
        </div>

        <div className="border-t border-white/10 bg-black/40 p-4">
          <div className="mb-4 text-base font-bold tracking-tight text-white">
            {formatClipName(clip.name)}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-black text-black shadow-lg shadow-[#D4AF37]/20 transition-all duration-300 hover:bg-[#F1D27A]"
            >
              Open
            </button>

            <a
              href={downloadHref}
              className="inline-flex rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-bold text-white/90 transition-all duration-300 hover:border-[#D4AF37]/30 hover:text-white"
            >
              Download
            </a>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />

          <div className="relative z-10 w-[min(1200px,96vw)] overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-bold text-white/90 transition-all duration-300 hover:border-[#D4AF37]/30 hover:text-white"
              >
                ← Back
              </button>

              <div className="truncate px-3 text-sm font-bold text-white/90">
                {formatClipName(clip.name)}
              </div>

              <a
                href={downloadHref}
                className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-black text-black shadow-lg shadow-[#D4AF37]/20 transition-all duration-300 hover:bg-[#F1D27A]"
              >
                Download
              </a>
            </div>

            <video
              src={videoSrc}
              className="h-auto w-full bg-black"
              controls
              autoPlay
              muted
              playsInline
              preload="metadata"
            />
          </div>
        </div>
      )}
    </>
  );
}