"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

type PlanKey = "all" | "luxury" | "real-estate" | "fitness" | null;

type Profile = {
  id: string;
  stripe_customer_id: string | null;
  plan: PlanKey;
  is_active: boolean;
};

type Clip = {
  key: string;
  label: string;
};

type Category = {
  id: string;
  vault: "Luxury" | "Real Estate" | "Fitness" | "Other";
  name: string;
  description: string;
  prefix: string; // s3 prefix like "luxury/cars/"
};

const BASE_CATEGORIES: Category[] = [
  // LUXURY
  {
    id: "luxury-cars",
    vault: "Luxury",
    name: "Luxury – Cars",
    description:
      "High-end vehicles, rolling shots, interiors, and cinematic angles.",
    prefix: "luxury/cars/",
  },
  {
    id: "luxury-jets",
    vault: "Luxury",
    name: "Luxury – Jets",
    description: "Private jets, runway scenes, boarding, and jet interiors.",
    prefix: "luxury/jets/",
  },
  {
    id: "luxury-interiors",
    vault: "Luxury",
    name: "Luxury – Interiors",
    description: "Penthouses, villas, and modern interior details.",
    prefix: "luxury/interiors/",
  },
  {
    id: "luxury-lifestyle",
    vault: "Luxury",
    name: "Luxury – Lifestyle",
    description: "Dining, nightlife, yachts, poolside, and leisure.",
    prefix: "luxury/lifestyle/",
  },
  {
    id: "luxury-textures",
    vault: "Luxury",
    name: "Luxury – Textures",
    description: "Abstract luxury patterns and loopable backgrounds.",
    prefix: "luxury/textures/",
  },

  // REAL ESTATE
  {
    id: "re-exteriors",
    vault: "Real Estate",
    name: "Real Estate – Exteriors",
    description: "Homes, apartments, architecture, and exterior shots.",
    prefix: "real-estate/exteriors/",
  },
  {
    id: "re-interiors",
    vault: "Real Estate",
    name: "Real Estate – Interiors",
    description: "Staged interiors, kitchens, living rooms, and more.",
    prefix: "real-estate/interiors/",
  },
  {
    id: "re-agents",
    vault: "Real Estate",
    name: "Real Estate – Agents",
    description: "Agents showing homes, meeting clients, and closing deals.",
    prefix: "real-estate/agents/",
  },
  {
    id: "re-neighborhoods",
    vault: "Real Estate",
    name: "Real Estate – Neighborhoods",
    description:
      "Streets, communities, local hotspots, and lifestyle B-roll.",
    prefix: "real-estate/neighborhoods/",
  },
  {
    id: "re-investments",
    vault: "Real Estate",
    name: "Real Estate – Investments",
    description:
      "Development, rentals, construction, and investment properties.",
    prefix: "real-estate/investments/",
  },
  {
    id: "re-transitions",
    vault: "Real Estate",
    name: "Real Estate – Transitions",
    description: "Transitions and motion elements for real estate edits.",
    prefix: "real-estate/transitions/",
  },

  // FITNESS
  {
    id: "fit-gym",
    vault: "Fitness",
    name: "Fitness – Gym",
    description: "Strength training, weights, and intense gym work.",
    prefix: "fitness/gym/",
  },
  {
    id: "fit-running",
    vault: "Fitness",
    name: "Fitness – Running & Cardio",
    description: "Outdoor runs, treadmills, and cardio training.",
    prefix: "fitness/running/",
  },
  {
    id: "fit-strength",
    vault: "Fitness",
    name: "Fitness – Strength",
    description: "Powerlifting, explosive movements, and strength work.",
    prefix: "fitness/strength/",
  },
  {
    id: "fit-wellness",
    vault: "Fitness",
    name: "Fitness – Wellness",
    description: "Yoga, stretching, meditation, and recovery.",
    prefix: "fitness/wellness/",
  },
  {
    id: "fit-lifestyle",
    vault: "Fitness",
    name: "Fitness – Lifestyle",
    description: "Active lifestyle, athleisure, and day-in-the-life shots.",
    prefix: "fitness/lifestyle/",
  },
  {
    id: "fit-backgrounds",
    vault: "Fitness",
    name: "Fitness – Backgrounds",
    description: "Abstract fitness visuals and loopable backgrounds.",
    prefix: "fitness/backgrounds/",
  },
];

const OTHER_CATEGORY: Category = {
  id: "other",
  vault: "Other",
  name: "Other Favorites",
  description: "Favorites that don’t match a specific category yet.",
  prefix: "",
};

const ALL_CATEGORIES: Category[] = [...BASE_CATEGORIES, OTHER_CATEGORY];

function labelFromKey(key: string): string {
  const file = key.split("/").pop() || key;
  const noExt = file.replace(/\.[^/.]+$/, "");
  return noExt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FavoritesVaultPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [favoritesByCategory, setFavoritesByCategory] = useState<
    Record<string, Clip[]>
  >({});
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  // local favorites set for star state
  const [favoritesSet, setFavoritesSet] = useState<Set<string>>(new Set());
  const [togglingFavoriteKey, setTogglingFavoriteKey] = useState<string | null>(
    null
  );

  // Load user + profile
  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabaseBrowser
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile", error);
      }

      setProfile((data as Profile | null) ?? null);
      setLoadingProfile(false);
    }

    void loadProfile();
  }, [router]);

  // Load favorites for this user and group by category
  useEffect(() => {
    if (!userId) return;

    async function loadFavorites() {
      setLoadingFavorites(true);
      setError(null);

      const { data, error } = await supabaseBrowser
        .from("favorites")
        .select("s3_key")
        .eq("user_id", userId);

      if (error) {
        console.error("Error loading favorites:", error);
        setError("Could not load favorites. Please try again.");
        setLoadingFavorites(false);
        return;
      }

      const keys = (data ?? []).map((row) => row.s3_key as string);
      setFavoritesSet(new Set(keys));

      const grouped: Record<string, Clip[]> = {};

      for (const key of keys) {
        const match =
          BASE_CATEGORIES.find((cat) => key.startsWith(cat.prefix)) ||
          OTHER_CATEGORY;

        if (!grouped[match.id]) grouped[match.id] = [];

        grouped[match.id].push({
          key,
          label: labelFromKey(key),
        });
      }

      setFavoritesByCategory(grouped);
      setLoadingFavorites(false);
    }

    void loadFavorites();
  }, [userId]);

  if (loadingProfile || loadingFavorites) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>Loading your favorites…</p>
      </main>
    );
  }

  if (!profile?.is_active) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4">
        <h1 className="text-2xl mb-4">No active subscription</h1>
        <p className="text-neutral-300 mb-4 text-center max-w-md">
          You need an active Lumetrix subscription to access your favorites.
        </p>
        <a
          href="/pricing"
          className="px-6 py-3 bg-yellow-400 text-black rounded-full font-semibold"
        >
          View Plans
        </a>
      </main>
    );
  }

  const totalFavorites = Object.values(favoritesByCategory).reduce(
    (sum, clips) => sum + clips.length,
    0
  );

  async function handleOpenClip(key: string) {
    setLoadingKey(key);
    setError(null);

    try {
      const res = await fetch(
        `/api/vault/file?key=${encodeURIComponent(key)}&mode=open`
      );

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (!data.url) {
        throw new Error("No URL returned from API");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setError(
        "Something went wrong opening this clip. It may not be uploaded yet."
      );
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleDownloadClip(key: string) {
    setDownloadingKey(key);
    setError(null);

    try {
      const res = await fetch(
        `/api/vault/file?key=${encodeURIComponent(key)}&mode=download`
      );

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();
      if (!data.url) {
        throw new Error("No URL returned from API");
      }

      const a = document.createElement("a");
      a.href = data.url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      setError(
        "Something went wrong downloading this clip. It may not be uploaded yet."
      );
    } finally {
      setDownloadingKey(null);
    }
  }

  async function handleToggleFavorite(key: string) {
    if (!userId) return;

    setTogglingFavoriteKey(key);

    try {
      const isFavorite = favoritesSet.has(key);

      if (isFavorite) {
        const { error } = await supabaseBrowser
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("s3_key", key);

        if (error) throw error;

        setFavoritesSet((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });

        // Remove from grouped category list
        setFavoritesByCategory((prev) => {
          const next: Record<string, Clip[]> = {};
          for (const [catId, clips] of Object.entries(prev)) {
            const filtered = clips.filter((clip) => clip.key !== key);
            if (filtered.length > 0) {
              next[catId] = filtered;
            }
          }
          return next;
        });
      } else {
        const { error } = await supabaseBrowser.from("favorites").insert({
          user_id: userId,
          s3_key: key,
        });

        if (error) throw error;

        setFavoritesSet((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });

        // Add into grouped category (if needed)
        const match =
          BASE_CATEGORIES.find((cat) => key.startsWith(cat.prefix)) ||
          OTHER_CATEGORY;

        setFavoritesByCategory((prev) => {
          const list = prev[match.id] ? [...prev[match.id]] : [];
          if (!list.some((clip) => clip.key === key)) {
            list.push({ key, label: labelFromKey(key) });
          }
          return { ...prev, [match.id]: list };
        });
      }
    } catch (err) {
      console.error("Failed to toggle favorite", err);
    } finally {
      setTogglingFavoriteKey(null);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-8 lg:px-12">
      <header className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-semibold mb-2">
          My Favorites
        </h1>
        <p className="text-neutral-300 max-w-2xl">
          All your starred clips from every Lumetrix vault, organized by
          category.
        </p>
        <p className="mt-2 text-sm text-emerald-400">
          Total favorites:{" "}
          <span className="font-mono">{totalFavorites}</span>
        </p>
      </header>

      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}

      {totalFavorites === 0 ? (
        <section className="mt-8">
          <p className="text-neutral-400 text-sm mb-2">
            You haven&apos;t favorited any clips yet.
          </p>
          <p className="text-neutral-500 text-sm">
            Browse the{" "}
            <a
              href="/vault/all"
              className="text-yellow-400 underline underline-offset-4"
            >
              All Access Vault
            </a>{" "}
            or any individual vault and tap the star icon on clips you want to
            save here.
          </p>
        </section>
      ) : (
        <section className="space-y-10">
          {ALL_CATEGORIES.map((category) => {
            const clips = favoritesByCategory[category.id];
            if (!clips || clips.length === 0) return null;

            return (
              <div key={category.id}>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-1">
                  {category.vault} Vault
                </p>
                <h2 className="text-xl font-semibold mb-1">
                  {category.name}
                </h2>
                <p className="text-neutral-400 text-sm mb-4 max-w-xl">
                  {category.description}
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {clips.map((clip) => {
                    const isFavorite = favoritesSet.has(clip.key);
                    const isToggling = togglingFavoriteKey === clip.key;

                    return (
                      <div
                        key={clip.key}
                        className="border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between bg-neutral-900/40"
                      >
                        <div className="mb-3 relative">
                          <div className="aspect-video rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center text-[0.65rem] text-neutral-400 text-center px-2">
                            {clip.label}
                          </div>
                          <button
                            onClick={() => handleToggleFavorite(clip.key)}
                            disabled={isToggling}
                            className={`absolute top-2 right-2 text-2xl leading-none ${
                              isFavorite
                                ? "text-yellow-400"
                                : "text-neutral-500 hover:text-yellow-300"
                            }`}
                            title={
                              isFavorite
                                ? "Remove from favorites"
                                : "Add to favorites"
                            }
                          >
                            {isFavorite ? "★" : "☆"}
                          </button>
                        </div>

                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-medium truncate">
                            {clip.label}
                          </p>
                          <p className="text-[0.65rem] font-mono text-neutral-500 break-all">
                            {clip.key}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => handleOpenClip(clip.key)}
                              disabled={loadingKey === clip.key}
                              className="flex-1 px-3 py-2 rounded-full text-xs sm:text-sm font-semibold bg-yellow-400 text-black disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {loadingKey === clip.key
                                ? "Opening..."
                                : "Open Clip"}
                            </button>
                            <button
                              onClick={() => handleDownloadClip(clip.key)}
                              disabled={downloadingKey === clip.key}
                              className="flex-1 px-3 py-2 rounded-full text-xs sm:text-sm font-semibold border border-yellow-400 text-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {downloadingKey === clip.key
                                ? "Downloading..."
                                : "Download"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
