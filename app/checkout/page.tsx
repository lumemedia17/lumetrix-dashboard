import Link from "next/link";
import CheckoutClient from "./CheckoutClient";
import {
  PLAN_DETAILS,
  SAFE_ATTRIBUTION_KEYS,
  firstParam,
  normalizePlan,
  sanitizeAttribution,
  type SafeAttribution,
} from "@/lib/plans";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function appOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || "https://app.lumetrixmedia.com";

  try {
    return new URL(configured).origin;
  } catch {
    return "https://app.lumetrixmedia.com";
  }
}

function buildCheckoutUrl(plan: string, attribution: SafeAttribution) {
  const params = new URLSearchParams({ plan });

  for (const key of SAFE_ATTRIBUTION_KEYS) {
    const value = attribution[key];

    if (value) {
      params.set(key, value);
    }
  }

  return `${appOrigin()}/checkout?${params.toString()}`;
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const plan = normalizePlan(firstParam(params.plan));
  const attribution = sanitizeAttribution(params);

  if (!plan) {
    return (
      <main className="min-h-screen bg-[#050505] px-6 py-16 text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5">
            <span className="text-2xl font-black text-[#D4AF37]">L</span>
          </div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">
            Lumetrix Media
          </p>
          <h1 className="text-4xl font-black">Choose a valid plan</h1>
          <p className="mt-4 text-[#B3B3B3]">
            This checkout link is missing a supported Lumetrix plan.
          </p>
          <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
            {Object.values(PLAN_DETAILS).map((planDetails) => (
              <Link
                key={planDetails.key}
                href={`/checkout?plan=${planDetails.key}`}
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-black transition hover:border-[#D4AF37] hover:text-[#F1D27A]"
              >
                {planDetails.displayName} - {planDetails.monthlyLabel}
              </Link>
            ))}
          </div>
          <Link
            href="/pricing"
            className="mt-8 text-sm font-bold text-[#B3B3B3] transition-colors hover:text-white"
          >
            Return to pricing
          </Link>
        </div>
      </main>
    );
  }

  return (
    <CheckoutClient
      plan={plan}
      checkoutUrl={buildCheckoutUrl(plan, attribution)}
    />
  );
}
