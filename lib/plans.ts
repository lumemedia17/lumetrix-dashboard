export const PLAN_DETAILS = {
  all: {
    key: "all",
    displayName: "All Access",
    checkoutName: "All Access",
    monthlyPrice: "$199",
    monthlyLabel: "$199/month",
    envKey: "STRIPE_PRICE_ALL",
    defaultVaultPath: "/vault/all",
  },
  luxury: {
    key: "luxury",
    displayName: "Luxury Vault",
    checkoutName: "Luxury Vault",
    monthlyPrice: "$99",
    monthlyLabel: "$99/month",
    envKey: "STRIPE_PRICE_LUXURY",
    defaultVaultPath: "/vault/luxury",
  },
  "real-estate": {
    key: "real-estate",
    displayName: "Real Estate Vault",
    checkoutName: "Real Estate Vault",
    monthlyPrice: "$99",
    monthlyLabel: "$99/month",
    envKey: "STRIPE_PRICE_REAL_ESTATE",
    defaultVaultPath: "/vault/real-estate",
  },
  fitness: {
    key: "fitness",
    displayName: "Fitness Vault",
    checkoutName: "Fitness Vault",
    monthlyPrice: "$99",
    monthlyLabel: "$99/month",
    envKey: "STRIPE_PRICE_FITNESS",
    defaultVaultPath: "/vault/fitness",
  },
} as const;

export type PlanKey = keyof typeof PLAN_DETAILS;
export type SafeAttribution = Partial<Record<(typeof SAFE_ATTRIBUTION_KEYS)[number], string>>;

export const SAFE_ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
] as const;

const PLAN_ALIASES: Record<string, PlanKey> = {
  all: "all",
  "all-access": "all",
  all_access: "all",
  luxury: "luxury",
  "real-estate": "real-estate",
  real_estate: "real-estate",
  realestate: "real-estate",
  fitness: "fitness",
};

const MAX_ATTRIBUTION_LENGTH = 120;
const SAFE_ATTRIBUTION_CHARS = /[^a-zA-Z0-9 _.,:/?&=%+#@-]/g;

export function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function normalizePlan(value: unknown): PlanKey | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  return PLAN_ALIASES[normalized] ?? null;
}

export function getPlanDetails(plan: PlanKey) {
  return PLAN_DETAILS[plan];
}

export function buildVaultAccess(plan: PlanKey) {
  if (plan === "all") {
    return {
      all: true,
      luxury: true,
      "real-estate": true,
      fitness: true,
    };
  }

  return {
    [plan]: true,
  };
}

export function getRedirectPath(plan: PlanKey) {
  return PLAN_DETAILS[plan]?.defaultVaultPath ?? "/vault/all";
}

export function sanitizeMetadataValue(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value
    .trim()
    .slice(0, MAX_ATTRIBUTION_LENGTH)
    .replace(SAFE_ATTRIBUTION_CHARS, "");

  return cleaned.length > 0 ? cleaned : null;
}

export function sanitizeAttribution(input: unknown): SafeAttribution {
  if (!input || typeof input !== "object") return {};

  const record = input as Record<string, unknown>;
  const attribution: SafeAttribution = {};

  for (const key of SAFE_ATTRIBUTION_KEYS) {
    const rawValue = record[key];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    const cleaned = sanitizeMetadataValue(value);

    if (cleaned) {
      attribution[key] = cleaned;
    }
  }

  return attribution;
}
