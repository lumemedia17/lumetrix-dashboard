# Stripe test-mode validation

This workflow is for Vercel Preview deployments only. Never configure these
values for Production, and never copy live Stripe values into the Preview test
configuration.

## Preview environment

Use the existing application variable names with Vercel's **Preview** scope:

- `STRIPE_ENVIRONMENT=test`
- `NEXT_PUBLIC_STRIPE_TEST_MODE=true`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<test publishable key>`
- `STRIPE_SECRET_KEY=<test secret key>`
- `STRIPE_WEBHOOK_SECRET=<test webhook endpoint signing secret>`
- `STRIPE_PRICE_ALL=<test recurring Price ID>`
- `STRIPE_PRICE_LUXURY=<test recurring Price ID>`
- `STRIPE_PRICE_REAL_ESTATE=<test recurring Price ID>`
- `STRIPE_PRICE_FITNESS=<test recurring Price ID>`

The checkout API fails closed when the deployment is marked as test mode but
the Stripe secret or publishable key is not a test key. The checkout page also
shows `TEST MODE — NO REAL CHARGES`.

## Supabase boundary

Prefer a separate Supabase test project, configured with Preview-only values
for:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

If no test project is available, use one uniquely named synthetic test user in
the existing Supabase project. Record the Auth user ID, profile ID, pending
purchase ID, and every mutation. Never reuse, delete, or overwrite a real
customer profile.

## Stripe test resources

Create or verify four monthly recurring test Prices:

| Plan | Monthly amount |
| --- | ---: |
| All Access | $199 |
| Luxury Vault | $99 |
| Real Estate Vault | $99 |
| Fitness Vault | $99 |

Configure a test-mode webhook endpoint on the exact Preview deployment URL:

`https://<preview-host>/api/stripe-webhook`

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## Evidence record

For each test case, record:

- Stripe test customer ID
- Stripe test subscription ID
- relevant Stripe event IDs
- webhook HTTP response
- Supabase profile ID
- profile state before and after
- plan
- `is_active`
- `vault_access`
- pass/fail and remaining issue

Do not record test card numbers, API keys, webhook secrets, client secrets, or
Session client secrets.

## Cleanup

Cancel all test subscriptions after validation. Preserve webhook and deployment
logs needed for debugging. Do not delete Supabase profiles without a separate,
explicit approval after confirming that every target belongs only to this test.
