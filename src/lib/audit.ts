import { db } from './db';

export async function audit(action: string, target: string, detail: Record<string, unknown> = {}) {
  try {
    await db()`insert into audit_log (action, target, detail) values (${action}, ${target}, ${db().json(detail as any)})`;
  } catch (e) {
    console.error('audit failed', e);
  }
}
