import { FEATURE_LABELS, type Product } from '@/lib/products';

export function ProductForm({ p, action, submit }: { p?: Product; action: (f: FormData) => Promise<void>; submit: string }) {
  return (
    <form action={action} className="form">
      {p ? <input type="hidden" name="code" value={p.code} /> : (
        <label className="field">Code
          <span className="help">Short id used in the database and Stripe metadata. Can’t be changed later.</span>
          <input name="code" required pattern="[a-z][a-z0-9-]{1,30}" placeholder="petportrait" />
        </label>
      )}
      <label className="field">Name<input name="name" required defaultValue={p?.name} placeholder="Pet portrait screen" /></label>
      <label className="field">Domain
        <span className="help">Customer sites live under this, like ellie.storybook.yourbrand.nz</span>
        <input name="domain" required defaultValue={p?.domain} placeholder="petportrait.yourbrand.nz" />
      </label>
      <label className="field">App address
        <span className="help">Where the product app is deployed. The admin sends turn off, extend and resend requests here.</span>
        <input name="hq_base_url" type="url" defaultValue={p?.hq_base_url ?? ''} placeholder="https://petportrait.yourbrand.nz" />
      </label>
      <label className="field">How it’s paid for
        <select name="pricing_type" defaultValue={p?.pricing_type ?? 'one_time'}>
          <option value="one_time">One-time payment</option>
          <option value="subscription">Subscription</option>
        </select>
      </label>
      <label className="field">Shop status
        <select name="status" defaultValue={p?.status ?? 'hidden'}>
          <option value="live">Live</option>
          <option value="sold_out">Sold out</option>
          <option value="hidden">Hidden</option>
        </select>
      </label>
      <label className="field">Stripe price IDs
        <span className="help">Lets the admin match payments to this product. Separate with commas.</span>
        <input name="stripe_price_ids" defaultValue={p?.stripe_price_ids?.join(', ')} placeholder="price_123, price_456" />
      </label>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 500, marginBottom: 6 }}>Features</legend>
        <div className="checks">
          {Object.entries(FEATURE_LABELS).map(([k, label]) => (
            <label key={k}><input type="checkbox" name={`f_${k}`} defaultChecked={!!p?.features?.[k]} style={{ minHeight: 0 }} />{label}</label>
          ))}
        </div>
      </fieldset>
      <label className="field">Colour in the admin<input name="color" type="color" defaultValue={p?.color ?? '#1F6F6B'} style={{ width: 70, padding: 2 }} /></label>
      <div><button className="btn primary">{submit}</button></div>
    </form>
  );
}
