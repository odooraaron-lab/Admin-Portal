import { db } from '@/lib/db';
import { allProducts } from '@/lib/products';
import { money, dateOnly } from '@/lib/format';
import { ProductChip, Status, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'failed', label: 'Payment failed' },
  { key: 'ending', label: 'Cancelling' },
  { key: 'canceled', label: 'Ended' },
];

export default async function Subscriptions({ searchParams }: { searchParams: { status?: string } }) {
  const products = await allProducts();
  const byCode = Object.fromEntries(products.map((p) => [p.code, p]));
  const tab = searchParams.status || '';
  const test = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? '/test' : '';

  const rows = await db()`
    select * from subscriptions
    where case ${tab}
      when 'active' then status in ('active','trialing') and not cancel_at_period_end
      when 'failed' then status in ('past_due','unpaid')
      when 'ending' then cancel_at_period_end and status <> 'canceled'
      when 'canceled' then status = 'canceled'
      else true end
    order by (status in ('past_due','unpaid')) desc, current_period_end asc nulls last
    limit 300`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Subscriptions</h1>
          <p className="sub">Recurring plans, like Family Screen. Payment problems are listed first.</p>
        </div>
        <nav className="filters" aria-label="Filter subscriptions">
          {TABS.map((t) => (
            <a key={t.key} href={t.key ? `?status=${t.key}` : '?'} className={`btn small${tab === t.key ? ' primary' : ''}`}>{t.label}</a>
          ))}
        </nav>
      </div>

      <section className="panel">
        {rows.length === 0 ? (
          <Empty title="No subscriptions here">When someone subscribes, Stripe tells the admin and they appear on this page.</Empty>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Customer</th><th>Product</th><th>Site</th><th className="num">Price</th><th>Status</th><th>Renews or ends</th><th></th></tr></thead>
            <tbody>
              {rows.map((s) => {
                const p = byCode[s.product_code];
                return (
                  <tr key={s.id}>
                    <td>{s.customer_email || '—'}</td>
                    <td><ProductChip p={p} code={s.product_code} /></td>
                    <td>{s.site_slug || <span className="muted">—</span>}</td>
                    <td className="num nowrap">{money(s.amount_cents)}/{s.interval === 'year' ? 'yr' : 'mo'}</td>
                    <td>
                      <Status s={s.status} />
                      {s.cancel_at_period_end && s.status !== 'canceled' && <span className="pill warn" style={{ marginLeft: 6 }}>cancelling</span>}
                    </td>
                    <td className="nowrap small">{dateOnly(s.current_period_end)}</td>
                    <td><a className="btn small" href={`https://dashboard.stripe.com${test}/subscriptions/${s.id}`} target="_blank" rel="noreferrer">Open in Stripe</a></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
