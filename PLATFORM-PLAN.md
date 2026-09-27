# Platform plan — one domain, one admin, many apps

Working draft. Domain is written as `yourbrand.nz` until the name is decided.

## What exists today

| App | Where the code is | State |
| --- | --- | --- |
| Admin Portal (umbrella) | `Admin-Portal` repo | Built: orders, sites, subscriptions, screens, traffic, products. Not yet connected to any app. |
| QR code kids party (Storybook TV) | `party-kit` repo, product `story` | Built and self-provisioning. |
| Party Photo Wall | `party-kit` repo, product `photos` | Built (same repo as above). |
| TV Slideshow (QR / upload) | `party-kit` repo, product `slideshow` | Built (same repo as above). |
| Resthome TV | nowhere yet | Not started. The admin already has a placeholder product `familyscreen` (subscription + TV heartbeat) that fits it. |

The mess, in short: `party-kit` is both the public shop **and** three apps; the admin expects each
app to report to it but nothing does yet; product codes don't match between the two
(`story`/`photos` in party-kit vs `storybook`/`photowall` in the admin seed).

## Target layout (all on one domain)

```
yourbrand.nz              → public shop / marketing          (party-kit, main site)
admin.yourbrand.nz        → Admin Portal, private, 2FA        (Admin-Portal)
<slug>.yourbrand.nz       → a customer's party / slideshow    (party-kit, wildcard)
care.yourbrand.nz         → Resthome TV sign-in + dashboard   (new app, see below)
<home>.care.yourbrand.nz  → optional: each rest home's screen (new app)
```

Vercel matches an explicitly added domain (`admin.…`, `care.…`) before the wildcard `*.…`, so the
admin and future apps can sit on the same domain as the customer subdomains. `admin`, `app`,
`api`, `www` etc. are already reserved in `party-kit/src/lib/slug.ts`; any new app subdomain
(e.g. `care`) must be added to that list too so a customer can never be given it.

Two Vercel projects to start (shop+party apps, admin), a third when Resthome TV is built.
Each keeps its own database; they only talk through the admin's signed API (see `INTEGRATION.md`).

## Decision: keep the three party apps together

Storybook, Photo Wall and Slideshow share checkout, provisioning, the subdomain router, email and
cleanup. Splitting them would triplicate that for no gain. They stay in `party-kit` and appear in
the admin as three products. Resthome TV is different (subscription, care-home staff, always-on
screens) so it becomes its own app.

## Steps

1. **Align product codes.** Pick one set and use it everywhere. Suggested: `story`, `photos`,
   `slideshow`, `resthome` (change the admin seed; party-kit already uses the first three).
2. **Connect party-kit to the admin** (per `INTEGRATION.md`):
   - copy `hq-kit/hq.ts` → `party-kit/src/lib/hq.ts`, `route-hq-action.ts` → `src/app/api/hq/action/route.ts`
   - `provisionParty()` → `reportToHQ({ type: 'site.upsert', … })`
   - add `metadata: { product, site_slug }` to the three checkout routes
   - add the beacon tag; `data-heartbeat` on the TV pages
   - fill the action TODOs (turn off/on, extend, resend) with party-kit's DB calls
   - make sure the middleware lets `/api/hq/action` through on the main domain
3. **Domains.** Point nameservers at Vercel, add `yourbrand.nz` + `*.yourbrand.nz` to party-kit,
   `admin.yourbrand.nz` to the admin project. Point one Stripe webhook at the admin and keep
   party-kit's own webhook for provisioning.
4. **Resthome TV.** New repo from the same pattern: subscription checkout, a staff page to upload
   photos/notices, a TV page with heartbeat so the admin's Screens page shows offline TVs.
   Register it in Admin → Products (starts hidden), then go live.
5. **Later:** single sign-on isn't needed — only you use the admin. A shared UI package is only
   worth it once there are 3+ separate apps.

## Open questions

- Brand name / domain?
- Resthome TV: who uploads (staff, families, both)? Monthly price? One screen or many per home?
- Is the physical-goods shop (party packs) staying, or is it apps only?
