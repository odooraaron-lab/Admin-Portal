import { db } from '@/lib/db';
import { allProducts } from '@/lib/products';
import { money, dateTime, num } from '@/lib/format';
import { ProductChip, Status, Notice, Empty, ProductFilter } from '@/components/ui';
import { ConfirmButton, SubmitButton } from '@/components/ConfirmButton';
import { refundOrder, resendWelcome } from './actions';

export const dynamic = 'force-dynamic';

type SP = { product?: string; status?: string; q?: string; ok?: string; err?: string };

export default async function Orders({ searchParams }: { searchParams: SP }) {
  const products = await allProducts();
  const byCode = Object.fromEntries(products.map((p) => [p.code, p]));
  const sql = db();
  const product = searchParams.product || null;
  const status = searchParams.status || null;
  const q = searchParams.q?.trim() || null;

  const rows = await sql`
    select * from orders
    where (${product}::text is null or product_code = ${product})
      and (${status}::text is null or status = ${status})
      and (${q}::text is null or customer_email ilike ${'%' + (q ?? '') + '%'}
           or customer_name ilike ${'%' + (q ?? '') + '%'} or site_slug ilike ${'%' + (q ?? '') + '%'})
    order by created_at desc limit 200`;

  const total = rows.filter((r) => r.status !== 'refunded').reduce((a, r) => a + Number(r.amount_cents), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p className="sub">{num(rows.length)} shown, {money(total)} not refunded. Newest first, up to 200.</p>
        </div>
        <ProductFilter
          products={products}
          value={product ?? ''}
          extra={<>
            <select name="status" defaultValue={status ?? ''} aria-label="Status">
              <option value="">Any status</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
              <option value="partially_refunded">Part refunded</option>
            </select>
            <input name="q" defaultValue={q ?? ''} placeholder="Email, name or site" aria-label="Search" />
          </>}
        />
      </div>
      <Notice ok={searchParams.ok} err={searchParams.err} />

      <section className="panel">
        {rows.length === 0 ? (
          <Empty title="No orders match">Try a different product or clear the search.</Empty>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr>
              <th>When</th><th>Product</th><th>Customer</th><th>Site</th><th>Type</th>
              <th className="num">Amount</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {rows.map((o) => {
                const p = byCode[o.product_code];
                return (
                  <tr key={o.id}>
                    <td className="nowrap muted">{dateTime(o.created_at)}</td>
                    <td><ProductChip p={p} code={o.product_code} /></td>
                    <td>
                      <div>{o.customer_name || '—'}</div>
                      <div className="small muted">{o.customer_email}</div>
                    </td>
                    <td>
                      {o.site_slug && p ? (
                        <a href={`https://${o.site_slug}.${p.domain}`} target="_blank" rel="noreferrer">{o.site_slug}</a>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td className="small">{o.kind === 'one_time' ? 'One-time' : o.kind === 'renewal' ? 'Renewal' : 'Subscription'}</td>
                    <td className="num">{money(o.amount_cents, o.currency)}</td>
                    <td><Status s={o.status} /></td>
                    <td>
                      <div className="actions">
                        {o.site_slug && (
                          <form action={resendWelcome} className="inline">
                            <input type="hidden" name="id" value={o.id} />
                            <SubmitButton>Resend email</SubmitButton>
                          </form>
                        )}
                        {o.status === 'paid' && (
                          <form action={refundOrder} className="inline">
                            <input type="hidden" name="id" value={o.id} />
                            <ConfirmButton className="btn small danger" message={`Refund ${money(o.amount_cents, o.currency)} to ${o.customer_email || 'this customer'}? This can’t be undone.`}>
                              Refund
                            </ConfirmButton>
                          </form>
                        )}
                      </div>
                    </td>
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
