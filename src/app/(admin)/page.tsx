import Link from 'next/link';
import { db, TZ } from '@/lib/db';
import { allProducts } from '@/lib/products';
import { money, num, dateTime } from '@/lib/format';
import { Bars, ProductChip, Status, Empty } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Overview() {
  const sql = db();
  const products = await allProducts();
  const byCode = Object.fromEntries(products.map((p) => [p.code, p]));

  const [[totals], [subs], [sites], visitors, perProduct, recent] = await Promise.all([
    sql`
      select
        coalesce(sum(amount_cents) filter (where created_at >= (date_trunc('day', now() at time zone ${TZ}) at time zone ${TZ})), 0)::int as today,
        coalesce(sum(amount_cents) filter (where created_at >= (date_trunc('month', now() at time zone ${TZ}) at time zone ${TZ})), 0)::int as month,
        count(*) filter (where created_at >= (date_trunc('day', now() at time zone ${TZ}) at time zone ${TZ}))::int as orders_today
      from orders where status <> 'refunded'`,
    sql`
      select
        coalesce(sum(case interval when 'year' then amount_cents / 12.0 when 'week' then amount_cents * 52 / 12.0 else amount_cents end)
          filter (where status in ('active','trialing')), 0)::int as mrr,
        count(*) filter (where status in ('active','trialing'))::int as active,
        count(*) filter (where status in ('past_due','unpaid'))::int as failed
      from subscriptions`,
    sql`
      select
        count(*) filter (where s.status = 'live')::int as live,
        count(*) filter (where s.status = 'live' and s.expires_at between now() and now() + interval '7 days')::int as expiring,
        count(*) filter (where (p.features->>'heartbeat')::boolean and s.status = 'live'
          and (s.last_seen_at is null or s.last_seen_at < now() - interval '24 hours'))::int as offline
      from sites s join products p on p.code = s.product_code`,
    sql`
      select to_char(d, 'FMDD Mon') as label, coalesce(v.n, 0)::int as value
      from generate_series(date_trunc('day', now() at time zone ${TZ}) - interval '13 days',
                           date_trunc('day', now() at time zone ${TZ}), interval '1 day') d
      left join (
        select date_trunc('day', created_at at time zone ${TZ}) as day, count(distinct visitor_hash) as n
        from pageviews where created_at > now() - interval '15 days' group by 1
      ) v on v.day = d
      order by d`,
    sql`
      select product_code, coalesce(sum(amount_cents), 0)::int as cents, count(*)::int as n
      from orders
      where status <> 'refunded' and created_at >= (date_trunc('month', now() at time zone ${TZ}) at time zone ${TZ})
      group by 1 order by 2 desc`,
    sql`select * from orders order by created_at desc limit 8`,
  ]);

  const monthTotal = Math.max(1, perProduct.reduce((a, r) => a + Number(r.cents), 0));
  const attention = [
    subs.failed > 0 && { href: '/subscriptions?status=failed', text: `${subs.failed} subscription payment${subs.failed > 1 ? 's' : ''} failed` },
    sites.offline > 0 && { href: '/screens', text: `${sites.offline} TV screen${sites.offline > 1 ? 's' : ''} offline for over a day` },
    sites.expiring > 0 && { href: '/sites?expiring=1', text: `${sites.expiring} site${sites.expiring > 1 ? 's expire' : ' expires'} this week` },
  ].filter(Boolean) as { href: string; text: string }[];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="sub">{new Intl.DateTimeFormat('en-NZ', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
        </div>
      </div>

      <dl className="figures">
        <div className="figure"><dt>Sales today</dt><dd>{money(totals.today)}</dd><div className="hint">{totals.orders_today} order{totals.orders_today === 1 ? '' : 's'}</div></div>
        <div className="figure"><dt>Sales this month</dt><dd>{money(totals.month)}</dd></div>
        <div className="figure"><dt>Monthly recurring</dt><dd>{money(subs.mrr)}</dd><div className="hint">{subs.active} active subscription{subs.active === 1 ? '' : 's'}</div></div>
        <div className="figure"><dt>Live sites</dt><dd>{num(sites.live)}</dd></div>
        <div className="figure"><dt>Needs attention</dt><dd className={attention.length ? 'bad' : ''}>{attention.length}</dd></div>
      </dl>

      <div className="grid two">
        <div className="stack">
          <section className="panel">
            <h2>Visitors, last 14 days</h2>
            <Bars data={visitors as any} label="Daily unique visitors across all products" />
          </section>
          <section className="panel">
            <h2>Latest orders</h2>
            {recent.length === 0 ? (
              <Empty title="No orders yet">They’ll appear here as soon as Stripe sends the first payment.</Empty>
            ) : (
              <div className="table-wrap"><table>
                <thead><tr><th>When</th><th>Product</th><th>Customer</th><th className="num">Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id}>
                      <td className="nowrap muted">{dateTime(o.created_at)}</td>
                      <td><ProductChip p={byCode[o.product_code]} code={o.product_code} /></td>
                      <td>{o.customer_name || o.customer_email || '—'}</td>
                      <td className="num">{money(o.amount_cents, o.currency)}</td>
                      <td><Status s={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
            <p className="small"><Link href="/orders">All orders</Link></p>
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <h2>Needs attention</h2>
            {attention.length === 0 ? <p className="muted">Nothing right now.</p> : (
              <ul className="list-rows">
                {attention.map((a) => <li key={a.href}><Link href={a.href}>{a.text}</Link></li>)}
              </ul>
            )}
          </section>
          <section className="panel">
            <h2>This month by product</h2>
            {perProduct.length === 0 ? <p className="muted">No sales yet this month.</p> : (
              <ul className="list-rows">
                {perProduct.map((r) => {
                  const p = byCode[r.product_code];
                  return (
                    <li key={r.product_code} style={{ display: 'block' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <ProductChip p={p} code={r.product_code} />
                        <span>{money(r.cents)} <span className="muted small">({r.n})</span></span>
                      </div>
                      <div className="meter" style={{ ['--c' as any]: p?.color }}><i style={{ width: `${(100 * Number(r.cents)) / monthTotal}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
