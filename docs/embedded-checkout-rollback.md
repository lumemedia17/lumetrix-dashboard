# Embedded Checkout Rollback

The legacy hosted Checkout route is preserved at:

- `app/api/checkout/route.ts`

The app-side normal checkout UI now uses:

- `/checkout?plan=all`
- `/checkout?plan=luxury`
- `/checkout?plan=real-estate`
- `/checkout?plan=fitness`
- `POST /api/checkout/create-embedded-session`

If embedded Checkout must be rolled back before the marketing site is migrated:

1. Keep `app/api/checkout/route.ts` unchanged.
2. Change app pricing CTAs back to calling `POST /api/checkout`.
3. Confirm the old route returns only a hosted Stripe Checkout URL.
4. Confirm webhook destination still points to `https://app.lumetrixmedia.com/api/stripe-webhook`.
5. Do not change Stripe Price IDs, products, webhook signing secrets, or Supabase entitlement logic.

If embedded Checkout is already live from the marketing site:

1. Update marketing CTAs back to the hosted checkout flow or app `/api/checkout` flow.
2. Do not expose raw Stripe Session URLs in the UI.
3. Watch Stripe for duplicate subscription attempts during the rollback window.

Current embedded compatibility:

- Stripe SDK: `stripe` 19.3.1
- Stripe.js: `@stripe/stripe-js` 8.9.0
- API version used by this app: `2025-10-29.clover`
- Embedded Checkout `ui_mode`: `embedded`
- Completion behavior: `redirect_on_completion: "always"`

Rollback should not alter products, prices, subscriptions, profiles, `vault_access`, or webhook signature verification.
