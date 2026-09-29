# Adding a new myQR site

Every myQR product is its own Next.js app, its own GitHub repo and its own Vercel project,
on its own subdomain of myqr.co.nz. They share one Stripe account, one Resend domain, one
Neon database (each app's tables are prefixed) and one admin (admin.myqr.co.nz).

| Site | Repo | Address | Admin code | Pricing |
| --- | --- | --- | --- | --- |
| Wishcast party store (3 apps) | party-kit | myqr.co.nz, `*.myqr.co.nz` | story, photos, slideshow | one-time |
| Resthome TV | family-screen | resthome.myqr.co.nz, `*.resthome.myqr.co.nz` | resthome | subscription |
| Admin | Admin-Portal | admin.myqr.co.nz | n/a | n/a |

## 1. Decide (5 minutes)
- **Name** and **subdomain**: `<name>.myqr.co.nz`. Add it to the reserved list in party-kit
  (`src/lib/slug.ts`) so no party can take it.
- **Admin code**: short, lowercase, permanent (e.g. `petportrait`).
- **Pricing**: one-time or subscription, and the prices.
- **Per-customer sites?** If each customer gets an address (like `ari.myqr.co.nz`), the app needs
  a wildcard domain `*.<name>.myqr.co.nz`.
- **On a TV?** Then it gets TV pairing (`/tv` + 6-digit code) and check-ins for the Screens page.

## 2. Create the repo
GitHub → New repository (private), e.g. `odooraaron-lab/<name>`. Add it to the Claude session.
Claude builds it from the shared pattern:
- the myQR design system (Grandstander + Nunito, plum/berry/sky) and "myQR" under the logo
- Stripe Checkout with `metadata: { product: '<code>', site_slug }` (and `subscription_data.metadata` for subscriptions)
- its own Stripe webhook route that sets up the customer's site after payment
- `src/lib/hq.ts` → `reportToHQ()` when a site is created or changed
- `/api/hq/action` so the admin's Turn off / Turn on / Add 30 days / Resend email buttons work
- the admin beacon (`/beacon.js`) for page views; `data-heartbeat` on TV pages
- TV pairing if it's a TV product
- SEO basics (titles, sitemap, robots, structured data, share image), a site icon, Resend emails

## 3. Admin (2 minutes)
admin.myqr.co.nz → **Products → Add product**: code, name, domain, app address
`https://<name>.myqr.co.nz`, pricing type, features. Leave it **Hidden**. Copy its **HQ secret**.
For subscriptions, paste the Stripe price IDs here too.

## 4. Vercel (10 minutes)
1. Add New → Project → import the repo (Pro team).
2. Domains: `<name>.myqr.co.nz` (+ `*.<name>.myqr.co.nz` if per-customer). DNS is already on Vercel.
3. Storage: connect the existing Neon database; add a **Blob** store if customers upload files
   (Public, prefix empty, read-write token ticked).
4. Environment variables (tick **Sensitive** for secrets):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon connection string |
| `STRIPE_SECRET_KEY` | a new restricted key (`rk_live_…`, "Full access except sensitive operations") named after the site |
| `STRIPE_WEBHOOK_SECRET` | from step 5 |
| `HQ_URL` | `https://admin.myqr.co.nz` |
| `HQ_PRODUCT` / `HQ_SECRET` | code and secret from step 3 |
| `RESEND_API_KEY`, `FROM_EMAIL` | same Resend account, e.g. `<Name> <hello@myqr.co.nz>` |
| `APP_URL` / `NEXT_PUBLIC_SITE_URL` | `https://<name>.myqr.co.nz` |

Tip: put **Stripe sandbox** keys in the **Preview** environment and live keys in **Production**,
so test deploys never take real money.

## 5. Stripe (5 minutes)
- Subscriptions: Product catalogue → add the product and prices (NZD).
- Webhooks → Add destination → `https://<name>.myqr.co.nz/api/stripe/webhook` with the events the
  app needs (usually `checkout.session.completed`, plus `customer.subscription.updated/deleted` for
  subscriptions). Copy its `whsec_…` into Vercel.
- **The admin's webhook needs no change.** It already receives every payment and files it under
  the right product from `metadata.product`.

## 6. Test, then launch
1. Buy once on a Preview deploy with the sandbox card `4242 4242 4242 4242`.
2. Check the admin: order, site, (subscription), then Turn off / Turn on.
3. Redeploy Production, buy the cheapest option with a real card, refund it (the site should turn off).
4. Admin → Products → set it **Live**.
5. Google Search Console: submit `https://<name>.myqr.co.nz/sitemap.xml`.
