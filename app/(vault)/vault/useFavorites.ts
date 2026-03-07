// app/vault/useFavorites.ts
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "lumetrix_favorites";

export type FavoriteKey = string;

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteKey[]>([]);

  // load from localStorage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load favorites", e);
    }
  }, []);

  // save whenever favorites change
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn("Failed to save favorites", e);
    }
  }, [favorites]);

  const toggleFavorite = (key: FavoriteKey) => {
    setFavorites((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isFavorite = (key: FavoriteKey) => favorites.includes(key);

  return { favorites, toggleFavorite, isFavorite };
}
