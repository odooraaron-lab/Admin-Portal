import { db } from '@/lib/db';
import { allProducts } from '@/lib/products';
import { dateOnly, bytes, ago, num } from '@/lib/format';
import { ProductChip, Status, Notice, Empty, ProductFilter } from '@/components/ui';
import { ConfirmButton, SubmitButton } from '@/components/ConfirmButton';
import { siteAction } from './actions';

export const dynamic = 'force-dynamic';

type SP = { product?: string; status?: string; q?: string; expiring?: string; ok?: string; err?: string };

function ActionForm({ code, slug, action, children, confirm, danger }: {
  code: string; slug: string; action: string; children: React.ReactNode; confirm?: string; danger?: boolean;
}) {
  return (
    <form action={siteAction} className="inline">
      <input type="hidden" name="product" value={code} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="action" value={action} />
      {confirm
        ? <ConfirmButton className={`btn small${danger ? ' danger' : ''}`} message={confirm}>{children}</ConfirmButton>
        : <SubmitButton>{children}</SubmitButton>}
    </form>
  );
}

export default async function Sites({ searchParams }: { searchParams: SP }) {
  const products = await allProducts();
  const byCode = Object.fromEntries(products.map((p) => [p.code, p]));
  const product = searchParams.product || null;
  const status = searchParams.status || null;
  const q = searchParams.q?.trim() || null;
  const expiring = searchParams.expiring === '1';

  const rows = await db()`
    select * from sites
    where (${product}::text is null or product_code = ${product})
      and (${status}::text is null or status = ${status})
      and (${q}::text is null or slug ilike ${'%' + (q ?? '') + '%'} or owner_email ilike ${'%' + (q ?? '') + '%'}
           or owner_name ilike ${'%' + (q ?? '') + '%'})
      and (not ${expiring} or (status = 'live' and expires_at between now() and now() + interval '7 days'))
    order by created_at desc limit 300`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sites</h1>
          <p className="sub">Every customer site across all products. {num(rows.length)} shown.</p>
        </div>
        <ProductFilter
          products={products}
          value={product ?? ''}
          extra={<>
            <select name="status" defaultValue={status ?? ''} aria-label="Status">
              <option value="">Any status</option>
              <option value="live">Live</option>
              <option value="disabled">Turned off</option>
              <option value="expired">Expired</option>
            </select>
            <input name="q" defaultValue={q ?? ''} placeholder="Site name or owner" aria-label="Search" />
          </>}
        />
      </div>
      <Notice ok={searchParams.ok} err={searchParams.err} />

      <section className="panel">
        {rows.length === 0 ? (
          <Empty title="No sites yet">Sites appear here once a product app reports them. See INTEGRATION.md.</Empty>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr>
              <th>Site</th><th>Product</th><th>Owner</th><th>Theme</th><th>Status</th>
              <th>Expires</th><th className="num">Storage</th><th></th>
            </tr></thead>
            <tbody>
              {rows.map((s) => {
                const p = byCode[s.product_code];
                const url = s.url || (p ? `https://${s.slug}.${p.domain}` : '#');
                return (
                  <tr key={`${s.product_code}/${s.slug}`}>
                    <td>
                      <a href={url} target="_blank" rel="noreferrer"><strong>{s.slug}</strong></a>
                      {p?.features?.heartbeat && <div className="small muted">Screen seen {ago(s.last_seen_at)}</div>}
                    </td>
                    <td><ProductChip p={p} code={s.product_code} /></td>
                    <td>
                      <div>{s.owner_name || '—'}</div>
                      <div className="small muted">{s.owner_email}</div>
                    </td>
                    <td className="small">{s.theme || '—'}</td>
                    <td><Status s={s.status} /></td>
                    <td className="nowrap small">{s.expires_at ? dateOnly(s.expires_at) : 'Never'}</td>
                    <td className="num small">{bytes(s.storage_bytes)}</td>
                    <td>
                      <div className="actions">
                        {s.status === 'live'
                          ? <ActionForm code={s.product_code} slug={s.slug} action="disable" danger
                              confirm={`Turn off ${s.slug}? Guests and the TV will see an unavailable page until you turn it back on.`}>Turn off</ActionForm>
                          : <ActionForm code={s.product_code} slug={s.slug} action="enable">Turn on</ActionForm>}
                        {p?.features?.expiry && <ActionForm code={s.product_code} slug={s.slug} action="extend">+30 days</ActionForm>}
                        <ActionForm code={s.product_code} slug={s.slug} action="resend_email">Resend email</ActionForm>
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
