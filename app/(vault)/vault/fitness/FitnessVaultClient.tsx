"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VaultClipCard, { VaultClip } from "@/components/VaultClipCard";

const CATEGORIES = [
  { label: "Fitness – Cardio", value: "cardio" },
  { label: "Fitness – Gym", value: "gym" },
  { label: "Fitness – Lifestyle", value: "lifestyle" },
  { label: "Fitness – Nutrition", value: "nutrition" },
  { label: "Fitness – Textures", value: "textures" },
  { label: "Fitness – Transitions", value: "transitions" },
  { label: "Fitness – Wellness", value: "wellness" },
];

export default function FitnessVaultClient() {
  const [clips, setClips] = useState<VaultClip[]>([]);
  const [category, setCategory] = useState("cardio");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/vault/fitness?category=${encodeURIComponent(category)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        setClips(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category]);

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.14),transparent_35%),#000] p-8 md:p-10">
        <Link href="/vault/all" className="text-sm text-[#D4AF37] hover:text-[#F1D27A]">
          ← Back to All Access
        </Link>

        <div className="mt-6 max-w-3xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
            Performance Collection
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            Fitness Vault
          </h1>
          <p className="mt-4 text-base text-[#B3B3B3] md:text-lg">
            Dynamic visual assets for gyms, trainers, athletic brands, wellness content,
            cardio campaigns, transformation reels, and performance-focused edits.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`rounded-full px-5 py-3 text-sm font-bold transition-all ${
              category === c.value
                ? "bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20"
                : "border border-white/10 bg-white/[0.02] text-white/80 hover:border-[#D4AF37]/30 hover:text-white"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-[#B3B3B3]">
          Loading clips...
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {clips.map((clip) => (
            <VaultClipCard key={clip.key} clip={clip} />
          ))}
        </div>
      )}
    </div>
  );
}