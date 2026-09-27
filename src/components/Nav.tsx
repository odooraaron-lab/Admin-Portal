'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/orders', label: 'Orders' },
  { href: '/sites', label: 'Sites' },
  { href: '/subscriptions', label: 'Subscriptions', badge: 'failed' as const },
  { href: '/screens', label: 'Screens', badge: 'offline' as const },
  { href: '/traffic', label: 'Traffic' },
  { href: '/products', label: 'Products' },
];

export function Nav({ failed, offline }: { failed: number; offline: number }) {
  const path = usePathname();
  const counts = { failed, offline };
  return (
    <nav className="nav" aria-label="Admin">
      {LINKS.map((l) => {
        const active = l.href === '/' ? path === '/' : path.startsWith(l.href);
        const n = l.badge ? counts[l.badge] : 0;
        return (
          <Link key={l.href} href={l.href} aria-current={active ? 'page' : undefined}>
            {l.label}
            {n > 0 && <span className="count" aria-label={`${n} need attention`}>{n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
