"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VaultClipCard, { VaultClip } from "@/components/VaultClipCard";

const CATEGORIES = [
  { label: "Luxury – Cars", value: "cars" },
  { label: "Luxury – Jets", value: "jets" },
  { label: "Luxury – Interiors", value: "interiors" },
  { label: "Luxury – Lifestyle", value: "lifestyle" },
  { label: "Luxury – Leisure", value: "leisure" },
  { label: "Luxury – Textures", value: "textures" },
  { label: "Luxury – Backgrounds", value: "backgrounds" },
];

export default function LuxuryVaultClient() {
  const [clips, setClips] = useState<VaultClip[]>([]);
  const [category, setCategory] = useState("cars");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/vault/luxury?category=${encodeURIComponent(category)}`,
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
    <div className="min-h-screen bg-black text-white px-6 py-8">
      <Link href="/vault/all" className="text-yellow-400 text-sm">
        ← Back to All Access
      </Link>

      <h1 className="text-4xl font-extrabold my-6">Luxury Vault</h1>

      <div className="flex flex-wrap gap-3 mb-8">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-5 py-2 rounded-full ${
              category === c.value
                ? "bg-yellow-400 text-black"
                : "border border-neutral-700"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clips.map((clip) => (
            <VaultClipCard key={clip.key} clip={clip} />
          ))}
        </div>
      )}
    </div>
  );
}
