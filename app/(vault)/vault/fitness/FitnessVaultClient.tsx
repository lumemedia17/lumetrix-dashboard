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
        const res = await fetch(`/api/vault/fitness?category=${encodeURIComponent(category)}`, {
          cache: "no-store",
        });
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

      <h1 className="text-4xl font-extrabold my-6">Fitness Vault</h1>

      <div className="flex flex-wrap gap-3 mb-8">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-5 py-2 rounded-full ${
              category === c.value ? "bg-yellow-400 text-black" : "border border-neutral-700"
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
