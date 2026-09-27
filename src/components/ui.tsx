import type { Product } from '@/lib/products';

export function ProductChip({ p, code }: { p?: Product | null; code?: string | null }) {
  if (!p) return <span className="chip muted">{code || 'Unknown'}</span>;
  return <span className="chip" style={{ ['--c' as any]: p.color }}>{p.name}</span>;
}

const TONES: Record<string, string> = {
  paid: 'good', live: 'good', active: 'good', trialing: 'good', online: 'good',
  refunded: 'warn', partially_refunded: 'warn', past_due: 'bad', unpaid: 'bad', incomplete: 'warn',
  disabled: 'bad', expired: '', canceled: '', hidden: '', sold_out: 'warn', offline: 'bad', stale: 'warn',
};
const WORDS: Record<string, string> = {
  partially_refunded: 'part refunded', past_due: 'payment failed', sold_out: 'sold out', one_time: 'one-time',
};

export function Status({ s }: { s: string | null | undefined }) {
  const v = s || 'unknown';
  return <span className={`pill ${TONES[v] ?? ''}`}>{WORDS[v] ?? v}</span>;
}

export function Notice({ ok, err }: { ok?: string; err?: string }) {
  if (err) return <div className="notice bad" role="alert">{err}</div>;
  if (ok) return <div className="notice good" role="status">{ok}</div>;
  return null;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="empty"><strong>{title}</strong>{children}</div>;
}

export function ProductFilter({ products, value, extra }: {
  products: Product[]; value?: string; extra?: React.ReactNode;
}) {
  return (
    <form className="filters" method="get">
      <select name="product" defaultValue={value || ''} aria-label="Product">
        <option value="">All products</option>
        {products.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
      </select>
      {extra}
      <button className="btn">Apply</button>
    </form>
  );
}

/** Tiny dependency-free bar chart (server-rendered SVG). */
export function Bars({ data, color = 'var(--accent)', height = 150, label }: {
  data: { label: string; value: number }[]; color?: string; height?: number; label: string;
}) {
  const w = 600, padB = 20, max = Math.max(1, ...data.map((d) => d.value));
  const bw = w / Math.max(1, data.length);
  const every = Math.ceil(data.length / 8);
  return (
    <svg className="bars" viewBox={`0 0 ${w} ${height}`} role="img" aria-label={label}>
      {data.map((d, i) => {
        const h = ((height - padB - 6) * d.value) / max;
        return (
          <g key={i}>
            <rect x={i * bw + bw * 0.15} y={height - padB - h} width={bw * 0.7} height={Math.max(h, d.value ? 2 : 0)} rx="2" fill={color}>
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            {i % every === 0 && <text x={i * bw + bw / 2} y={height - 5} textAnchor="middle">{d.label}</text>}
          </g>
        );
      })}
      <line x1="0" x2={w} y1={height - padB} y2={height - padB} stroke="var(--line)" />
    </svg>
  );
}
