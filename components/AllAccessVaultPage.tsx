"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabaseBrowser";
import VaultClipCard, { VaultClip } from "@/components/VaultClipCard";

type VaultPreview = {
  title: string;
  slug: string;
  previewPrefixes: string[];
};

const VAULTS: VaultPreview[] = [
  {
    title: "Luxury Vault",
    slug: "luxury",
    previewPrefixes: [
      "luxury/cars/",
      "luxury/jets/",
      "luxury/interiors/",
      "luxury/lifestyle/",
      "luxury/leisure/",
      "luxury/backgrounds/",
      "luxury/textures/",
    ],
  },
  {
    title: "Real Estate Vault",
    slug: "real-estate",
    previewPrefixes: [
      "real-estate/agents/",
      "real-estate/homes/",
      "real-estate/interiors/",
    ],
  },
  {
    title: "Fitness Vault",
    slug: "fitness",
    previewPrefixes: [
      "fitness/cardio/",
      "fitness/gym/",
      "fitness/lifestyle/",
    ],
  },
];

export default function AllAccessVaultPage() {
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<Record<string, VaultClip | null>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = "/login";
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (loading) return;

    async function load() {
      const result: Record<string, VaultClip | null> = {};

      for (const vault of VAULTS) {
        let found: VaultClip | null = null;

        for (const prefix of vault.previewPrefixes) {
          const res = await fetch(
            `/api/vault/list?prefix=${encodeURIComponent(prefix)}`,
            { cache: "no-store" }
          );

          if (!res.ok) continue;

          const data = await res.json();
          const key = data?.keys?.[0];

          if (key) {
            found = {
              key,
              thumbKey: key,
              name: key.split("/").pop() ?? "Clip",
            };
            break;
          }
        }

        result[vault.slug] = found;
      }

      setPreviews(result);
    }

    load();
  }, [loading]);

  if (loading) return null;

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-4xl font-extrabold mb-12">All Access Vault</h1>

      <div className="space-y-20">
        {VAULTS.map((vault) => (
          <section key={vault.slug}>
            <h2 className="text-2xl font-bold mb-6">{vault.title}</h2>

            {previews[vault.slug] ? (
              <div className="max-w-xl">
                <VaultClipCard clip={previews[vault.slug]!} />
              </div>
            ) : (
              <p className="text-neutral-500 mb-6">No clips available.</p>
            )}

            <Link
              href={`/vault/${vault.slug}`}
              className="inline-block mt-6 px-8 py-4 rounded-full bg-yellow-400 text-black font-bold"
            >
              View Vault →
            </Link>
          </section>
        ))}
      </div>
    </main>
  );
}