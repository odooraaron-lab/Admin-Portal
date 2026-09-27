import { db, TZ } from '@/lib/db';
import { allProducts } from '@/lib/products';
import { num } from '@/lib/format';
import { Bars, ProductChip, ProductFilter } from '@/components/ui';

export const dynamic = 'force-dynamic';

const COUNTRY = new Intl.DisplayNames(['en-NZ'], { type: 'region' });
const countryName = (c: string | null) => { try { return c ? COUNTRY.of(c) ?? c : 'Unknown'; } catch { return c || 'Unknown'; } };

function Top({ title, rows, render }: { title: string; rows: any[]; render?: (r: any) => React.ReactNode }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.n)));
  return (
    <section className="panel">
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="muted">No visits in this period.</p> : (
        <ul className="list-rows">
          {rows.map((r, i) => (
            <li key={i} style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ overflowWrap: 'anywhere' }}>{render ? render(r) : r.k || 'Direct'}</span>
                <span>{num(r.n)}</span>
              </div>
              <div className="meter"><i style={{ width: `${(100 * Number(r.n)) / max}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Traffic({ searchParams }: { searchParams: { product?: string; days?: string } }) {
  const products = await allProducts();
  const byCode = Object.fromEntries(products.map((p) => [p.code, p]));
  const product = searchParams.product || null;
  const days = [7, 30, 90].includes(Number(searchParams.days)) ? Number(searchParams.days) : 30;
  const sql = db();
  const since = sql`now() - make_interval(days => ${days})`;
  const pf = sql`(${product}::text is null or product_code = ${product})`;

  const [daily, [totals], paths, sites, refs, countries, devices, funnel] = await Promise.all([
    sql`
      select to_char(d, 'FMDD Mon') as label, coalesce(v.n, 0)::int as value
      from generate_series(date_trunc('day', now() at time zone ${TZ}) - make_interval(days => ${days - 1}),
                           date_trunc('day', now() at time zone ${TZ}), interval '1 day') d
      left join (
        select date_trunc('day', created_at at time zone ${TZ}) as day, count(distinct visitor_hash) as n
        from pageviews where created_at > ${since} and ${pf} group by 1
      ) v on v.day = d order by d`,
    sql`select count(distinct visitor_hash)::int as visitors, count(*)::int as views from pageviews where created_at > ${since} and ${pf}`,
    sql`select path as k, count(*)::int as n from pageviews where created_at > ${since} and ${pf} and site_slug is null group by 1 order by 2 desc limit 10`,
    sql`select product_code, site_slug as k, count(*)::int as n from pageviews where created_at > ${since} and ${pf} and site_slug is not null group by 1, 2 order by 3 desc limit 10`,
    sql`select referrer_host as k, count(distinct visitor_hash)::int as n from pageviews where created_at > ${since} and ${pf} group by 1 order by 2 desc limit 8`,
    sql`select country as k, count(distinct visitor_hash)::int as n from pageviews where created_at > ${since} and ${pf} group by 1 order by 2 desc limit 8`,
    sql`select device as k, count(distinct visitor_hash)::int as n from pageviews where created_at > ${since} and ${pf} group by 1 order by 2 desc`,
    sql`
      select p.code,
        (select count(distinct visitor_hash) from pageviews v where v.product_code = p.code and v.site_slug is null and v.created_at > ${since})::int as visitors,
        (select count(*) from events e where e.product_code = p.code and e.name = 'checkout_started' and e.created_at > ${since})::int as checkouts,
        (select count(*) from orders o where o.product_code = p.code and o.kind <> 'renewal' and o.created_at > ${since})::int as paid
      from products p where (${product}::text is null or p.code = ${product}) order by p.sort`,
  ]);

  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '—');
  const DEVICE: Record<string, string> = { tv: 'TV', mobile: 'Phone', desktop: 'Computer' };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Traffic</h1>
          <p className="sub">{num(totals.visitors)} visitors and {num(totals.views)} page views in the last {days} days.</p>
        </div>
        <ProductFilter
          products={products}
          value={product ?? ''}
          extra={
            <select name="days" defaultValue={String(days)} aria-label="Period">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          }
        />
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Visitors per day</h2>
        <Bars data={daily as any} label="Unique visitors per day" color={product ? byCode[product]?.color : undefined} />
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>From visit to sale</h2>
        <p className="small muted" style={{ marginTop: -6 }}>Shop page visitors, how many started checkout, and how many paid.</p>
        <div className="table-wrap"><table>
          <thead><tr><th>Product</th><th className="num">Shop visitors</th><th className="num">Started checkout</th><th className="num">Paid</th><th className="num">Visitors who paid</th></tr></thead>
          <tbody>
            {funnel.map((f) => (
              <tr key={f.code}>
                <td><ProductChip p={byCode[f.code]} code={f.code} /></td>
                <td className="num">{num(f.visitors)}</td>
                <td className="num">{num(f.checkouts)}</td>
                <td className="num">{num(f.paid)}</td>
                <td className="num">{pct(f.paid, f.visitors)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <div className="grid two" style={{ marginBottom: 16 }}>
        <Top title="Top shop pages" rows={paths} />
        <Top title="Busiest customer sites" rows={sites} render={(r) => <><ProductChip p={byCode[r.product_code]} /> <span className="muted">{r.k}</span></>} />
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <Top title="Where visitors came from" rows={refs} />
        <Top title="Countries" rows={countries} render={(r) => countryName(r.k)} />
        <Top title="Devices" rows={devices} render={(r) => DEVICE[r.k] || r.k || 'Unknown'} />
      </div>
    </>
  );
}
