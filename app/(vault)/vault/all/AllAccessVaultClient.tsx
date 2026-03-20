"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabaseClient";
import VaultClipCard, { VaultClip } from "@/components/VaultClipCard";

type VaultPreview = {
  title: string;
  slug: string;
  description: string;
  previewPrefixes: string[];
};

const VAULTS: VaultPreview[] = [
  {
    title: "Luxury Vault",
    slug: "luxury",
    description:
      "Automotive, jets, interiors, lifestyle, leisure, textures, and premium backgrounds.",
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
    description:
      "Agents, homes, interiors, neighborhoods, investments, urban scenes, and transitions.",
    previewPrefixes: [
      "real-estate/agents/",
      "real-estate/homes/",
      "real-estate/interiors/",
    ],
  },
  {
    title: "Fitness Vault",
    slug: "fitness",
    description:
      "Cardio, gym, lifestyle, wellness, nutrition, textures, and transitions.",
    previewPrefixes: [
      "fitness/cardio/",
      "fitness/gym/",
      "fitness/lifestyle/",
    ],
  },
];

function mp4ToThumbKey(mp4Key: string) {
  if (mp4Key.startsWith("luxury/")) {
    return mp4Key
      .replace(/^luxury\//, "thumbs/luxury/")
      .replace(/\.mp4$/i, ".jpg");
  }

  if (mp4Key.startsWith("real-estate/")) {
    return mp4Key
      .replace(/^real-estate\//, "thumbs/real-estate/")
      .replace(/\.mp4$/i, ".jpg");
  }

  if (mp4Key.startsWith("fitness/")) {
    return mp4Key
      .replace(/^fitness\//, "thumbs/fitness/")
      .replace(/\.mp4$/i, ".jpg");
  }

  return mp4Key.replace(/\.mp4$/i, ".jpg");
}

export default function AllAccessVaultClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<Record<string, VaultClip | null>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  useEffect(() => {
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

          const data = await res.json().catch(() => ({}));
          const firstKey = data?.keys?.[0];

          if (firstKey) {
            found = {
              key: firstKey,
              name: firstKey.split("/").pop() ?? "Clip",
              thumbKey: mp4ToThumbKey(firstKey),
            };
            break;
          }
        }

        result[vault.slug] = found;
      }

      setPreviews(result);
    }

    if (!loading) {
      load();
    }
  }, [loading]);

  if (loading) return null;

  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_35%),#000] p-8 md:p-12">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-[#D4AF37]">
            Premium Library
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            All Access Vault
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[#B3B3B3] md:text-lg">
            Every active vault in one place. Browse previews, jump into full collections,
            and download cinematic assets built to make brands feel expensive fast.
          </p>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-white/80">
              Unlimited downloads
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-white/80">
              Commercial license
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-white/80">
              New drops weekly
            </span>
          </div>
        </div>
      </section>

      <div className="space-y-10">
        {VAULTS.map((vault) => (
          <section
            key={vault.slug}
            className="rounded-[28px] border border-white/10 bg-white/[0.02] p-6 md:p-8"
          >
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight">{vault.title}</h2>
                <p className="mt-2 max-w-2xl text-sm text-[#B3B3B3]">
                  {vault.description}
                </p>
              </div>

              <Link
                href={`/vault/${vault.slug}`}
                className="inline-flex w-fit rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-black text-black shadow-lg shadow-[#D4AF37]/20 transition-all duration-300 hover:bg-[#F1D27A]"
              >
                Enter Vault →
              </Link>
            </div>

            {previews[vault.slug] ? (
              <div className="max-w-xl">
                <VaultClipCard clip={previews[vault.slug]!} />
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-[#B3B3B3]">
                No clips available yet.
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}