// Calls from the admin to a product app (disable a site, resend an email...).
import { sign } from './signing';
import type { Product } from './products';

export type SiteAction = 'disable' | 'enable' | 'extend' | 'resend_email';

export async function callProduct(p: Product, action: SiteAction, payload: Record<string, unknown>) {
  if (!p.hq_base_url) {
    throw new Error(`${p.name} isn't connected yet. Add its app URL on the Products page.`);
  }
  const body = JSON.stringify({ action, ...payload, ts: Date.now() });
  const res = await fetch(new URL('/api/hq/action', p.hq_base_url), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-hq-product': p.code, 'x-hq-signature': sign(p.hq_secret, body) },
    body,
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${p.name} replied ${res.status}${text ? `: ${text.slice(0, 140)}` : ''}`);
  }
  return res.json().catch(() => ({}));
}
