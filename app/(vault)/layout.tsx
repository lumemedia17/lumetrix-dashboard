"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import LogoutButton from "@/components/LogoutButton";

const nav = [
  { href: "/vault/all", label: "All Access" },
  { href: "/vault/luxury", label: "Luxury" },
  { href: "/vault/real-estate", label: "Real Estate" },
  { href: "/vault/fitness", label: "Fitness" },
  { href: "/account", label: "Account" },
];

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
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
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/vault/all" className="text-xl font-black tracking-tight">
              Lumetrix Media
            </Link>
            <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                      active
                        ? "bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20"
                        : "text-white/75 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="hidden sm:inline-flex rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white/80 transition-colors hover:border-[#D4AF37]/40 hover:text-white"
            >
              Manage Subscription
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="md:hidden overflow-x-auto px-6 pb-4">
          <div className="flex w-max items-center gap-2">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                    active
                      ? "bg-[#D4AF37] text-black"
                      : "border border-white/10 text-white/75"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">{children}</div>
    </div>
  );
}