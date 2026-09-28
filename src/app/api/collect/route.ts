import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { getProduct } from '@/lib/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const done = () => new Response(null, { status: 204, headers: CORS });

export function OPTIONS() { return done(); }

function device(ua: string) {
  if (/SmartTV|SMART-TV|Tizen|Web0S|webOS|BRAVIA|AFT[A-Z]|CrKey|HbbTV|NetCast|Roku|GoogleTV|Android TV/i.test(ua)) return 'tv';
  if (/Mobi|Android|iPhone|iPad/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Public, cookie-free page-view + TV heartbeat collector, fed by /beacon.js.
 * Visitors are counted with a daily-rotating hash, so no personal data is stored.
 */
export async function POST(req: Request) {
  let b: any;
  try { b = JSON.parse(await req.text()); } catch { return done(); }
  const p = await getProduct(typeof b.p === 'string' ? b.p : null);
  if (!p) return done();

  // Work out which customer site this came from (ellie.yourbrand.nz → "ellie").
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  let host = '';
  try { host = new URL(origin).hostname.toLowerCase(); } catch {}
  const domain = p.domain.toLowerCase();
  const allowed = !host || host === domain || host.endsWith(`.${domain}`) || host.endsWith('.vercel.app') || host === 'localhost';
  if (!allowed) return done();
  let slug: string | null = typeof b.s === 'string' && b.s ? b.s.toLowerCase().slice(0, 80) : null;
  if (!slug && host.endsWith(`.${domain}`)) slug = host.slice(0, -(domain.length + 1)).split('.').pop() || null;

  const sql = db();
  if (b.t === 'hb') {
    if (slug && p.features?.heartbeat) {
      await sql`update sites set last_seen_at = now(), offline_alert_sent_at = null
                where product_code = ${p.code} and slug = ${slug}
                  and (last_seen_at is null or last_seen_at < now() - interval '60 seconds')`;
    }
    return done();
  }

  const ua = req.headers.get('user-agent') || '';
  if (/bot|crawler|spider|preview|headless/i.test(ua)) return done();
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const day = new Date().toISOString().slice(0, 10);
  const visitor = createHash('sha256').update(`${process.env.SESSION_SECRET}|${day}|${ip}|${ua}`).digest('hex').slice(0, 24);
  const path = typeof b.path === 'string' ? b.path.slice(0, 200) : '/';

  if (b.t === 'ev' && typeof b.name === 'string') {
    await sql`insert into events (product_code, site_slug, name, data) values (${p.code}, ${slug}, ${b.name.slice(0, 60)}, ${sql.json({ path })})`;
    return done();
  }

  let ref: string | null = null;
  try {
    const r = new URL(b.ref);
    if (r.hostname !== host) ref = r.hostname.replace(/^www\./, '');
  } catch {}

  await sql`
    insert into pageviews (product_code, site_slug, path, referrer_host, country, device, visitor_hash)
    values (${p.code}, ${slug}, ${path}, ${ref}, ${req.headers.get('x-vercel-ip-country')}, ${device(ua)}, ${visitor})`;
  return done();
}
