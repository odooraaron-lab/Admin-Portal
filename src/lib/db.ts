import postgres from 'postgres';

let client: ReturnType<typeof postgres> | null = null;

/** Lazily-created Postgres client (works with Neon, Supabase or any Postgres). */
export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    client = postgres(url, { ssl: /localhost|127\.0\.0\.1/.test(url) ? false : 'require', max: 5, prepare: false, idle_timeout: 20 });
  }
  return client;
}

export { TZ } from './tz';
export const BRAND = process.env.BRAND_NAME || 'HQ';
