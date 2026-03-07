"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VaultClipCard, { VaultClip } from "@/components/VaultClipCard";

const CATEGORIES = [
  { label: "Real Estate – Agents", value: "agents" },
  { label: "Real Estate – Interiors", value: "interiors" },
  { label: "Real Estate – Investments", value: "investments" },
  { label: "Real Estate – Neighborhoods", value: "neighborhoods" },
  { label: "Real Estate – Urban", value: "urban" },
  { label: "Real Estate – Textures", value: "textures" },
  { label: "Real Estate – Transitions", value: "transitions" },
];

export default function RealEstateVaultClient() {
  const [clips, setClips] = useState<VaultClip[]>([]);
  const [category, setCategory] = useState("agents");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/vault/real-estate?category=${encodeURIComponent(category)}`,
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

      <h1 className="text-4xl font-extrabold my-6">Real Estate Vault</h1>

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
        <p className="text-neutral-400">Loading…</p>
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
