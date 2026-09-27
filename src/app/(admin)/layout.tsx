import { Nav } from '@/components/Nav';
import { db, BRAND } from '@/lib/db';
import { logout } from '../login/actions';

export const dynamic = 'force-dynamic';

async function attentionCounts() {
  try {
    const [r] = await db()`
      select
        (select count(*) from subscriptions where status in ('past_due','unpaid'))::int as failed,
        (select count(*) from sites s join products p on p.code = s.product_code
          where (p.features->>'heartbeat')::boolean and s.status = 'live'
            and (s.last_seen_at is null or s.last_seen_at < now() - interval '24 hours'))::int as offline`;
    return { failed: r.failed as number, offline: r.offline as number };
  } catch {
    return { failed: 0, offline: 0 };
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { failed, offline } = await attentionCounts();
  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">{BRAND}<small>Admin</small></div>
        <Nav failed={failed} offline={offline} />
        <form action={logout} className="rail-foot"><button>Sign out</button></form>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
