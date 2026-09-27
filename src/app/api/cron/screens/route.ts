import { db, BRAND } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Daily (see vercel.json): emails the family when a TV screen has been offline for 24h+, and tidies old analytics. */
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const sql = db();
  const offline = await sql`
    select s.*, p.name as product_name, p.domain from sites s join products p on p.code = s.product_code
    where (p.features->>'heartbeat')::boolean and s.status = 'live' and s.owner_email is not null
      and s.last_seen_at < now() - interval '24 hours' and s.offline_alert_sent_at is null`;

  let sent = 0;
  if (process.env.RESEND_API_KEY) {
    for (const s of offline) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.ALERT_FROM_EMAIL,
          to: s.owner_email,
          subject: `The screen for ${s.slug} has been off for a day`,
          text: `Hi ${s.owner_name || 'there'},\n\nThe ${s.product_name} screen at ${s.url || `https://${s.slug}.${s.domain}`} hasn't checked in since yesterday. The TV may be switched off, on a different input, or off the wifi.\n\nCould you ask staff to turn the TV on and open the screen link again? Messages sent in the meantime are saved and will play when it's back.\n\n${BRAND}`,
        }),
      });
      if (res.ok) {
        await sql`update sites set offline_alert_sent_at = now() where product_code = ${s.product_code} and slug = ${s.slug}`;
        sent++;
      }
    }
  }

  await sql`delete from pageviews where created_at < now() - interval '400 days'`;
  return Response.json({ offline: offline.length, emailed: sent });
}
