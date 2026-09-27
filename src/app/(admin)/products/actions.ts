'use server';
import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { clearProductCache, FEATURE_LABELS } from '@/lib/products';
import { audit } from '@/lib/audit';
import { back, errMsg } from '@/lib/flash';

function readForm(form: FormData) {
  const features: Record<string, boolean> = {};
  for (const k of Object.keys(FEATURE_LABELS)) features[k] = form.get(`f_${k}`) === 'on';
  const url = String(form.get('hq_base_url') || '').trim().replace(/\/$/, '');
  return {
    name: String(form.get('name') || '').trim(),
    domain: String(form.get('domain') || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
    pricing_type: form.get('pricing_type') === 'subscription' ? 'subscription' : 'one_time',
    status: ['live', 'hidden', 'sold_out'].includes(String(form.get('status'))) ? String(form.get('status')) : 'hidden',
    color: /^#[0-9a-fA-F]{6}$/.test(String(form.get('color'))) ? String(form.get('color')) : '#1F6F6B',
    hq_base_url: url || null,
    stripe_price_ids: String(form.get('stripe_price_ids') || '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean),
    features,
  };
}

export async function createProduct(form: FormData) {
  const code = String(form.get('code') || '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(code)) back('/products/new', 'err', 'Use a short code of lowercase letters, numbers or dashes, like "petportrait".');
  const f = readForm(form);
  if (!f.name || !f.domain) back('/products/new', 'err', 'Add a name and a domain.');
  let failure = '';
  try {
    await db()`
      insert into products (code, name, domain, pricing_type, status, features, hq_base_url, hq_secret, stripe_price_ids, color, sort)
      values (${code}, ${f.name}, ${f.domain}, ${f.pricing_type}, ${f.status}, ${db().json(f.features)}, ${f.hq_base_url},
              ${randomBytes(32).toString('hex')}, ${f.stripe_price_ids}, ${f.color},
              (select coalesce(max(sort), 0) + 10 from products))`;
  } catch (e) {
    failure = errMsg(e).includes('duplicate') ? `The code "${code}" is already used.` : errMsg(e);
  }
  if (failure) back('/products/new', 'err', failure);
  clearProductCache();
  await audit('product.create', code);
  revalidatePath('/products');
  back(`/products/${code}`, 'ok', `${f.name} added. Copy the connection details below into the app.`);
}

export async function updateProduct(form: FormData) {
  const code = String(form.get('code') || '');
  const f = readForm(form);
  if (!f.name || !f.domain) back(`/products/${code}`, 'err', 'Add a name and a domain.');
  await db()`
    update products set name = ${f.name}, domain = ${f.domain}, pricing_type = ${f.pricing_type}, status = ${f.status},
      features = ${db().json(f.features)}, hq_base_url = ${f.hq_base_url}, stripe_price_ids = ${f.stripe_price_ids}, color = ${f.color}
    where code = ${code}`;
  clearProductCache();
  await audit('product.update', code, { status: f.status });
  revalidatePath('/products');
  back(`/products/${code}`, 'ok', 'Changes saved.');
}

export async function rotateSecret(form: FormData) {
  const code = String(form.get('code') || '');
  await db()`update products set hq_secret = ${randomBytes(32).toString('hex')} where code = ${code}`;
  clearProductCache();
  await audit('product.rotate_secret', code);
  back(`/products/${code}`, 'ok', 'New secret made. Update HQ_SECRET in the product app now, or it will stop reporting.');
}
