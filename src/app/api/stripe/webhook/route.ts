import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { getProduct, productForPrice } from '@/lib/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One webhook for every product. In Stripe → Developers → Webhooks, point it at
 * https://<admin-domain>/api/stripe/webhook and send these events:
 * checkout.session.completed, customer.subscription.created, customer.subscription.updated,
 * customer.subscription.deleted, invoice.paid, invoice.payment_failed, charge.refunded
 *
 * Product apps should set metadata { product, site_slug } on their Checkout Sessions
 * (and subscription_data.metadata for subscriptions). Price IDs are the fallback.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get('stripe-signature') || '', process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (e) {
    return new Response('Bad signature', { status: 400 });
  }

  try {
    await handle(event);
  } catch (e) {
    console.error('webhook failed', event.type, e);
    return new Response('Handler error', { status: 500 }); // Stripe retries
  }
  return Response.json({ received: true });
}

async function productCode(metadata: Stripe.Metadata | null | undefined, priceId?: string | null) {
  const fromMeta = await getProduct(metadata?.product);
  if (fromMeta) return fromMeta.code;
  return (await productForPrice(priceId))?.code ?? null;
}

async function customerEmail(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!customer) return null;
  if (typeof customer !== 'string') return 'email' in customer ? customer.email : null;
  const c = await stripe().customers.retrieve(customer);
  return 'email' in c ? c.email : null;
}

async function handle(event: Stripe.Event) {
  const sql = db();
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status === 'unpaid') return;
      let priceId: string | null = null;
      if (!s.metadata?.product) {
        const items = await stripe().checkout.sessions.listLineItems(s.id, { limit: 1 });
        priceId = items.data[0]?.price?.id ?? null;
      }
      const code = await productCode(s.metadata, priceId);
      const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null;
      const sub = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null;
      await sql`
        insert into orders (id, product_code, site_slug, customer_email, customer_name, amount_cents, currency, kind,
                            stripe_payment_intent, stripe_subscription_id, created_at)
        values (${s.id}, ${code}, ${s.metadata?.site_slug ?? null}, ${s.customer_details?.email ?? null},
                ${s.customer_details?.name ?? null}, ${s.amount_total ?? 0}, ${s.currency ?? 'nzd'},
                ${s.mode === 'subscription' ? 'subscription' : 'one_time'}, ${pi}, ${sub}, to_timestamp(${s.created}))
        on conflict (id) do nothing`;
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const item = sub.items.data[0] as any;
      const code = await productCode(sub.metadata, item?.price?.id);
      const periodEnd = (sub as any).current_period_end ?? item?.current_period_end ?? null;
      const amount = (item?.price?.unit_amount ?? 0) * (item?.quantity ?? 1);
      await sql`
        insert into subscriptions (id, product_code, site_slug, customer_email, status, amount_cents, interval,
                                   current_period_end, cancel_at_period_end, updated_at)
        values (${sub.id}, ${code}, ${sub.metadata?.site_slug ?? null}, ${await customerEmail(sub.customer)},
                ${sub.status}, ${amount}, ${item?.price?.recurring?.interval ?? null},
                ${periodEnd ? new Date(periodEnd * 1000) : null}, ${sub.cancel_at_period_end}, now())
        on conflict (id) do update set
          product_code = coalesce(excluded.product_code, subscriptions.product_code),
          site_slug = coalesce(excluded.site_slug, subscriptions.site_slug),
          customer_email = coalesce(excluded.customer_email, subscriptions.customer_email),
          status = excluded.status, amount_cents = excluded.amount_cents, interval = excluded.interval,
          current_period_end = excluded.current_period_end, cancel_at_period_end = excluded.cancel_at_period_end,
          updated_at = now()`;
      return;
    }

    case 'invoice.paid': {
      const inv = event.data.object as any;
      if (inv.billing_reason !== 'subscription_cycle') return; // first payment is recorded by checkout
      const subId = inv.subscription ?? inv.parent?.subscription_details?.subscription ?? null;
      const [sub] = subId ? await sql`select product_code, site_slug from subscriptions where id = ${subId}` : [];
      await sql`
        insert into orders (id, product_code, site_slug, customer_email, customer_name, amount_cents, currency, kind,
                            stripe_payment_intent, stripe_subscription_id, created_at)
        values (${inv.id}, ${sub?.product_code ?? null}, ${sub?.site_slug ?? null}, ${inv.customer_email ?? null},
                ${inv.customer_name ?? null}, ${inv.amount_paid ?? 0}, ${inv.currency ?? 'nzd'}, 'renewal',
                ${typeof inv.payment_intent === 'string' ? inv.payment_intent : null}, ${subId}, to_timestamp(${inv.created}))
        on conflict (id) do nothing`;
      return;
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as any;
      const subId = inv.subscription ?? inv.parent?.subscription_details?.subscription ?? null;
      if (subId) await sql`update subscriptions set status = 'past_due', updated_at = now() where id = ${subId}`;
      return;
    }

    case 'charge.refunded': {
      const ch = event.data.object as Stripe.Charge;
      const pi = typeof ch.payment_intent === 'string' ? ch.payment_intent : ch.payment_intent?.id;
      if (!pi) return;
      const status = ch.refunded ? 'refunded' : 'partially_refunded';
      await sql`update orders set status = ${status} where stripe_payment_intent = ${pi}`;
      return;
    }
  }
}
