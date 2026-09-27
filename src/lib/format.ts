import { TZ } from './tz';

export function money(cents: number | string | null | undefined, currency = 'nzd') {
  const n = Number(cents || 0) / 100;
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function num(n: number | string | null | undefined) {
  return new Intl.NumberFormat('en-NZ').format(Number(n || 0));
}

export function dateTime(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }).format(new Date(d));
}

export function dateOnly(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-NZ', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(d));
}

export function ago(d: Date | string | null | undefined) {
  if (!d) return 'never';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

export function bytes(b: number | string | null | undefined) {
  let n = Number(b || 0);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
