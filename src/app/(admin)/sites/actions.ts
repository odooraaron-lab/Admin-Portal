'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getProduct } from '@/lib/products';
import { callProduct, type SiteAction } from '@/lib/hq';
import { audit } from '@/lib/audit';
import { back, errMsg } from '@/lib/flash';

const DONE: Record<SiteAction, string> = {
  disable: 'Site turned off.',
  enable: 'Site turned back on.',
  extend: 'Site extended by 30 days.',
  resend_email: 'Welcome email resent.',
};

export async function siteAction(form: FormData) {
  const code = String(form.get('product') || '');
  const slug = String(form.get('slug') || '');
  const action = String(form.get('action') || '') as SiteAction;
  const returnTo = String(form.get('return') || '/sites');
  const p = await getProduct(code);
  if (!p || !DONE[action]) back(returnTo, 'err', 'Unknown site or action.');

  const [site] = await db()`select * from sites where product_code = ${code} and slug = ${slug}`;
  if (!site) back(returnTo, 'err', 'That site isn’t in the admin yet.');

  const newExpiry = action === 'extend'
    ? new Date(Math.max(Date.now(), site.expires_at ? new Date(site.expires_at).getTime() : Date.now()) + 30 * 86400_000)
    : null;

  let failure = '';
  try {
    await callProduct(p, action, { slug, expires_at: newExpiry?.toISOString() });
  } catch (e) {
    failure = errMsg(e);
  }
  if (failure) back(returnTo, 'err', failure);

  const sql = db();
  if (action === 'disable') await sql`update sites set status = 'disabled', updated_at = now() where product_code = ${code} and slug = ${slug}`;
  if (action === 'enable') await sql`update sites set status = 'live', updated_at = now() where product_code = ${code} and slug = ${slug}`;
  if (action === 'extend') await sql`update sites set expires_at = ${newExpiry}, status = 'live', updated_at = now() where product_code = ${code} and slug = ${slug}`;

  await audit(`site.${action}`, `${code}/${slug}`);
  revalidatePath('/sites');
  back(returnTo, 'ok', `${slug}: ${DONE[action]}`);
}
