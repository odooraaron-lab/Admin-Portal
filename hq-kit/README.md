# hq-kit — the three pieces each product app needs

1. `hq.ts` → copy to the app's `src/lib/hq.ts`.
2. `route-hq-action.ts` → copy to `app/api/hq/action/route.ts` and fill in the four TODOs.
3. The beacon `<script>` tag from the admin's product page → add to the app's root layout.

Then, in the app's code:

- After a site is created (Stripe checkout success / webhook): `await reportToHQ({ type: 'site.upsert', slug, url, owner_email, owner_name, theme, expires_at, order_id })`
- When a site is changed by its owner (theme, expiry, storage): send `site.upsert` again with the new fields.
- When checkout starts (on the buy button): `window.hqEvent?.('checkout_started')`
- When creating the Stripe Checkout Session, add `metadata: { product: process.env.HQ_PRODUCT, site_slug: slug }`
  (and for subscriptions also `subscription_data: { metadata: { product: ..., site_slug: slug } }`).
