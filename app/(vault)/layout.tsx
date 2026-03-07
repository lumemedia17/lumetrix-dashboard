"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import LogoutButton from "@/components/LogoutButton";

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-800">
        <span className="font-bold">Lumetrix Media</span>
        <LogoutButton />
      </div>

      {children}
    </div>
  );
}
