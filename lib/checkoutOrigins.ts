const MARKETING_ORIGINS = new Set([
  "https://lumetrixmedia.com",
  "https://www.lumetrixmedia.com",
]);

const LOCAL_APP_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export function getAppOrigin() {
  const isTestMode =
    process.env.STRIPE_ENVIRONMENT === "test" &&
    process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === "true";
  const vercelUrl =
    process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;

  if (isTestMode && vercelUrl) {
    try {
      return new URL(`https://${vercelUrl}`).origin;
    } catch {
      // Fall through to the configured app URL.
    }
  }

  const configured =
    process.env.NEXT_PUBLIC_APP_URL || "https://app.lumetrixmedia.com";

  try {
    return new URL(configured).origin;
  } catch {
    return "https://app.lumetrixmedia.com";
  }
}

export function isAllowedCheckoutOrigin(origin: string | null) {
  if (!origin) return true;

  return (
    origin === getAppOrigin() ||
    MARKETING_ORIGINS.has(origin) ||
    LOCAL_APP_ORIGINS.has(origin)
  );
}

export function getCheckoutPageOrigin(origin: string | null) {
  if (origin && MARKETING_ORIGINS.has(origin)) {
    return origin;
  }

  return getAppOrigin();
}

export function checkoutCorsHeaders(
  origin: string | null
): Record<string, string> {
  if (!origin || !isAllowedCheckoutOrigin(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}
