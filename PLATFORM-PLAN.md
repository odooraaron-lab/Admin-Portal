# Platform plan — one domain, one admin, many apps

Working draft. Domain is written as `yourbrand.nz` until the name is decided.

## Decisions (27 Sep 2026)

- **App codes:** `story`, `photos`, `slideshow`, `resthome` — used in the admin, Stripe metadata and the apps.
- **Brand:** not chosen yet; `yourbrand` is the placeholder everywhere.
- **Party store** (`yourbrand.nz`) sells only the three party QR apps, and buyers pay through it.
- **Ideas outside parties** each get their own website, separate from the party store, but are still
  managed from the one admin. Resthome TV is the first.
- **Resthome TV:** one subscription per TV / address. Each TV sits in a resident's room and belongs to one
  family, who upload photos straight to it. A rest home can have several TVs, each linked to a
  different family.

## Apps

| App | Code | Repo | Sold on | Customer address | Status |
| --- | --- | --- | --- | --- | --- |
| Admin Portal | — | `Admin-Portal` | — | `admin.yourbrand.nz` | Built |
| Kids TV storybook (QR kids party) | `story` | `party-kit` | party store | `<name>.yourbrand.nz` | Built, connected to admin |
| Party photo wall | `photos` | `party-kit` | party store | `<name>.yourbrand.nz` | Built, connected to admin |
| TV slideshow (QR) | `slideshow` | `party-kit` | party store | `<name>.yourbrand.nz` | Built, connected to admin |
| Resthome TV ("Family Screen") | `resthome` | `family-screen` | its own site, `resthome.yourbrand.nz` | `<name>.resthome.yourbrand.nz` | Built, admin hooks in place; hidden until launch |

## Layout on one domain

```
yourbrand.nz                    → party store (party-kit)
<name>.yourbrand.nz             → a customer's party / slideshow (party-kit, wildcard)
admin.yourbrand.nz              → Admin Portal, private, 2FA
resthome.yourbrand.nz           → Resthome TV sales site + family sign-in
<room>.resthome.yourbrand.nz    → one TV (one family)
```

Vercel matches explicitly added domains (`admin.…`, `resthome.…`, `*.resthome.…`) before the wildcard
`*.yourbrand.nz`, so everything shares the domain. `admin`, `hq`, `resthome` and `care` are reserved in
`party-kit/src/lib/slug.ts` so a party can never take them. Each future idea gets its own subdomain
(or its own domain later), its own Vercel project and database, and appears in the admin as a product.

## How apps connect to the admin

See `INTEGRATION.md`. party-kit is special: one deployment runs three admin products, so it has
one secret per product (`HQ_SECRET_STORY`, `HQ_SECRET_PHOTOS`, `HQ_SECRET_SLIDESHOW`) and the admin now
sends `x-hq-product` on its action calls so the app knows which secret to check. When a site is
reported with its `order_id`, the admin fills in that order's site (the storybook only picks its
address after payment).

## Done

- [x] Product codes aligned (admin seed renamed; party-kit already used them)
- [x] party-kit reports new/changed sites, tags checkouts with `metadata.product`, adds the beacon
      (with TV check-ins), and handles Turn off / Turn on / Add 30 days / Resend email

## Next

1. **Go live checklist** — run `sql/schema.sql` on a fresh admin DB (if it was already run with the old
   codes, rename them: `update products set code = …`), deploy both projects, add domains, set the
   env vars (`HQ_URL` + three secrets in party-kit; each product's app URL = `https://yourbrand.nz` in the admin),
   point one Stripe webhook at the admin.
2. **Shop traffic** — the beacon is on party pages only. Add it to the store's own pages
   (e.g. tagging each app's sales page with its product) to see visit-to-sale in Traffic.
3. **Resthome TV** (`family-screen` repo) — already built: monthly/yearly subscription per screen, family
   send page, TV player with quiet hours and check-ins, owner page to approve senders. It already reports
   to the admin; only its product code and domain were changed to `resthome` / `resthome.yourbrand.nz`.
   Deploy as its own Vercel project (see its README) and set the product Live in the admin.

## Open questions (Resthome TV)

- Customer-facing name: keep "Family Screen" or rename to match "Resthome TV"?
- Prices for the monthly and yearly plans?
