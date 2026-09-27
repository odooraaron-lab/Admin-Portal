import { db } from './db';

export type Product = {
  code: string;
  name: string;
  domain: string;
  pricing_type: 'one_time' | 'subscription';
  status: 'live' | 'hidden' | 'sold_out';
  features: Record<string, boolean>;
  hq_base_url: string | null;
  hq_secret: string;
  stripe_price_ids: string[];
  color: string;
  sort: number;
};

export const FEATURE_LABELS: Record<string, string> = {
  host_page: 'Buyer admin page',
  guest_uploads: 'Guest uploads',
  themes: 'Themes',
  expiry: 'Sites expire',
  heartbeat: 'TV screen monitoring',
};

let cache: { at: number; rows: Product[] } | null = null;

export async function allProducts(fresh = false): Promise<Product[]> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.rows;
  const rows = (await db()`select * from products order by sort, name`) as unknown as Product[];
  cache = { at: Date.now(), rows };
  return rows;
}

export async function getProduct(code: string | null | undefined) {
  if (!code) return null;
  return (await allProducts()).find((p) => p.code === code) ?? null;
}

export async function productForPrice(priceId: string | null | undefined) {
  if (!priceId) return null;
  return (await allProducts()).find((p) => p.stripe_price_ids.includes(priceId)) ?? null;
}

export function clearProductCache() {
  cache = null;
}
