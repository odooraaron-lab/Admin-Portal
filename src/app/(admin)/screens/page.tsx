import { db } from '@/lib/db';
import { allProducts } from '@/lib/products';
import { ago } from '@/lib/format';
import { Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

function state(lastSeen: string | null) {
  if (!lastSeen) return 'off';
  const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (mins < 12) return 'on';
  if (mins < 60 * 24) return 'stale';
  return 'off';
}

export default async function Screens() {
  const products = (await allProducts()).filter((p) => p.features?.heartbeat);
  const byCode = Object.fromEntries(products.map((p) => [p.code, p]));
  const codes = products.map((p) => p.code);

  const rows = codes.length ? await db()`
    select * from sites where product_code = any(${codes}) and status = 'live'
    order by last_seen_at asc nulls first` : [];

  const counts = { on: 0, stale: 0, off: 0 } as Record<string, number>;
  rows.forEach((r) => counts[state(r.last_seen_at)]++);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Screens</h1>
          <p className="sub">
            {counts.on} on, {counts.stale} quiet for a while, {counts.off} off for over a day.
            Screens check in every 5 minutes. Families get an email after 24 hours offline.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <section className="panel">
          <Empty title="No screens to watch yet">
            {products.length === 0
              ? 'Turn on TV screen monitoring for a product on the Products page.'
              : 'Screens show up after their TV page loads the beacon script with data-heartbeat.'}
          </Empty>
        </section>
      ) : (
        <div className="wall">
          {rows.map((s) => {
            const st = state(s.last_seen_at);
            const p = byCode[s.product_code];
            return (
              <a key={`${s.product_code}/${s.slug}`} className={`tv ${st}`} href={s.url || `https://${s.slug}.${p?.domain}`} target="_blank" rel="noreferrer">
                <div className="tv-glass">
                  <span className="dot" aria-hidden="true" />
                  <span className="tv-name">{s.slug}</span>
                </div>
                <div className="tv-meta">
                  <span>{st === 'on' ? 'On now' : `Last seen ${ago(s.last_seen_at)}`}</span>
                  <span>{s.owner_name || ''}</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
