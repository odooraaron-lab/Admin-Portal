# Connecting a product app to the admin

Each product app talks to the admin in three ways. Nothing here needs a shared database.

| Direction | How | Used for |
| --- | --- | --- |
| Stripe → admin | One Stripe webhook | Orders, renewals, refunds, subscriptions |
| App → admin | Signed POST to `/api/ingest` (`reportToHQ`) | New sites, site changes, custom events |
| Browser → admin | `/beacon.js` script tag | Page views, `checkout_started`, TV check-ins |
| Admin → app | Signed POST to `<app>/api/hq/action` | Turn off/on, extend, resend email |

## Steps per app

1. In the admin, open **Products → the product** and copy the three env vars into the app's Vercel project.
2. Copy `hq-kit/hq.ts` and `hq-kit/route-hq-action.ts` into the app (see `hq-kit/README.md`).
3. Add the beacon tag to the app's root layout. On the TV page of a product with screen monitoring, keep `data-heartbeat`.
4. Add `metadata: { product, site_slug }` to the app's Stripe Checkout Session.
5. Call `reportToHQ({ type: 'site.upsert', ... })` wherever the app creates a site.
6. Fill in the four TODOs in `/api/hq/action` with the app's own database calls.
7. Test: buy with a Stripe test card → the order appears in Orders and the site in Sites; "Turn off" works.

## Adding a new product later

Products → **Add product** → fill in the form → it starts hidden. Connect the app with the steps
above, then set it to Live. No admin code changes needed.
