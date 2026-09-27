# Admin (HQ) for the brand

One private dashboard for every product: orders, customer sites, subscriptions, TV screens, traffic,
and a product list you add new apps to.

## Deploy (about 20 minutes)

1. **Database.** Create a free Postgres database on Neon (neon.tech) or Supabase.
   Open its SQL editor and run everything in `sql/schema.sql`. Copy the connection string.
2. **Login values.** On your computer, in this folder: `npm install` then `npm run setup-admin`.
   It prints your login env vars and a two-factor key — add that key to your authenticator app.
3. **GitHub.** Push this folder to a new private repo.
4. **Vercel.** New Project → import the repo → add every variable from `.env.example`
   (the setup script gave you the login ones). Deploy.
5. **Domain.** In the Vercel project → Domains, add `admin.<yourbrand>.nz`.
6. **Stripe webhook.** Stripe → Developers → Webhooks → Add endpoint:
   `https://admin.<yourbrand>.nz/api/stripe/webhook` with the events listed at the top of
   `src/app/api/stripe/webhook/route.ts`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy.
7. **Email alerts (optional).** Create a Resend account, verify your domain, and set `RESEND_API_KEY`
   and `ALERT_FROM_EMAIL`. Without it everything works except the "screen offline" emails.
8. Sign in, go to **Products**, and set each product's real domain once the brand name is decided.

## Pages

| Page | What it's for |
| --- | --- |
| Overview | Sales today and this month, recurring revenue, visitors, anything needing attention |
| Orders | Every payment across products; refund or resend the welcome email |
| Sites | Every customer site; turn off/on, add 30 days, resend email |
| Subscriptions | Recurring plans, failed payments first |
| Screens | Live wall of TV screens (for products with screen monitoring on) |
| Traffic | Visitors, pages, sources, countries, devices, visit-to-sale per product |
| Products | Add the next app, set its status (live, sold out, hidden), get its connection details |

Connecting a product app: see `INTEGRATION.md`.
