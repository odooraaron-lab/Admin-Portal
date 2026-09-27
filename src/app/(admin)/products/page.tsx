import Link from 'next/link';
import { db } from '@/lib/db';
import { allProducts } from '@/lib/products';
import { money, num } from '@/lib/format';
import { ProductChip, Status } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Products() {
  const products = await allProducts(true);
  const stats = await db()`
    select p.code,
      (select count(*) from sites s where s.product_code = p.code and s.status = 'live')::int as live,
      (select coalesce(sum(amount_cents), 0) from orders o where o.product_code = p.code and o.status <> 'refunded')::bigint as revenue,
      (select max(created_at) from pageviews v where v.product_code = p.code) as last_ping
    from products p`;
  const s = Object.fromEntries(stats.map((r) => [r.code, r]));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p className="sub">Each app under the brand. Add the next one here, then connect its code.</p>
        </div>
        <Link href="/products/new" className="btn primary">Add product</Link>
      </div>
      <section className="panel">
        <div className="table-wrap"><table>
          <thead><tr><th>Product</th><th>Domain</th><th>Paid</th><th>Shop</th><th>Connected</th><th className="num">Live sites</th><th className="num">Revenue</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.code}>
                <td><Link href={`/products/${p.code}`}><ProductChip p={p} /></Link></td>
                <td className="small">{p.domain}</td>
                <td className="small">{p.pricing_type === 'subscription' ? 'Subscription' : 'One-time'}</td>
                <td><Status s={p.status} /></td>
                <td>{p.hq_base_url && s[p.code]?.last_ping ? <span className="pill good">yes</span> : <span className="pill warn">not yet</span>}</td>
                <td className="num">{num(s[p.code]?.live)}</td>
                <td className="num">{money(s[p.code]?.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </>
  );
}
