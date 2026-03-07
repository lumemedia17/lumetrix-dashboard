"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function AuthNav() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user);
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!loggedIn) return null;

  return (
    <div className="w-full px-6 py-4 flex justify-end border-b border-neutral-800">
      <Link
        href="/logout"
        className="text-sm text-neutral-300 hover:text-white hover:underline"
      >
        Logout
      </Link>
    </div>
  );
}
