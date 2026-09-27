import { db } from '@/lib/db';
import { getProduct } from '@/lib/products';
import { verify, isFresh } from '@/lib/signing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Signed server-to-server reports from product apps.
 * Headers: x-hq-product: <code>, x-hq-signature: hex HMAC-SHA256(secret, body)
 * Body: { ts: Date.now(), events: [ { type: 'site.upsert' | 'heartbeat' | 'event', ...fields } ] }
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const p = await getProduct(req.headers.get('x-hq-product'));
  if (!p || !verify(p.hq_secret, raw, req.headers.get('x-hq-signature'))) {
    return Response.json({ error: 'Unknown product or bad signature' }, { status: 401 });
  }
  let body: any;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: 'Body must be JSON' }, { status: 400 }); }
  if (!isFresh(body.ts)) return Response.json({ error: 'Stale request; check the server clock' }, { status: 401 });

  const items: any[] = Array.isArray(body.events) ? body.events.slice(0, 200) : [body];
  const sql = db();
  let handled = 0;

  for (const e of items) {
    const slug = typeof e.slug === 'string' ? e.slug.toLowerCase().slice(0, 80) : null;
    if (e.type === 'site.upsert' && slug) {
      await sql`
        insert into sites (product_code, slug, url, owner_email, owner_name, theme, status, expires_at, storage_bytes, order_id, updated_at)
        values (${p.code}, ${slug}, ${e.url ?? null}, ${e.owner_email ?? null}, ${e.owner_name ?? null}, ${e.theme ?? null},
                ${e.status ?? 'live'}, ${e.expires_at ? new Date(e.expires_at) : null}, ${Number(e.storage_bytes) || 0},
                ${e.order_id ?? null}, now())
        on conflict (product_code, slug) do update set
          url = coalesce(excluded.url, sites.url),
          owner_email = coalesce(excluded.owner_email, sites.owner_email),
          owner_name = coalesce(excluded.owner_name, sites.owner_name),
          theme = coalesce(excluded.theme, sites.theme),
          status = coalesce(${e.status ?? null}::text, sites.status),
          expires_at = coalesce(excluded.expires_at, sites.expires_at),
          storage_bytes = case when ${e.storage_bytes != null} then excluded.storage_bytes else sites.storage_bytes end,
          order_id = coalesce(excluded.order_id, sites.order_id),
          updated_at = now()`;
      handled++;
    } else if (e.type === 'heartbeat' && slug) {
      await sql`update sites set last_seen_at = now(), offline_alert_sent_at = null where product_code = ${p.code} and slug = ${slug}`;
      handled++;
    } else if (e.type === 'event' && typeof e.name === 'string') {
      await sql`insert into events (product_code, site_slug, name, data) values (${p.code}, ${slug}, ${e.name.slice(0, 60)}, ${sql.json(e.data ?? {})})`;
      handled++;
    }
  }
  return Response.json({ ok: true, handled });
}
