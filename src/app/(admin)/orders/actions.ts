'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { getProduct } from '@/lib/products';
import { callProduct, disableSiteForRefund } from '@/lib/hq';
import { audit } from '@/lib/audit';
import { back, errMsg } from '@/lib/flash';

export async function refundOrder(form: FormData) {
  const id = String(form.get('id') || '');
  const [o] = await db()`select * from orders where id = ${id}`;
  if (!o) back('/orders', 'err', 'That order no longer exists.');
  if (!o.stripe_payment_intent) {
    back('/orders', 'err', 'This order has no card payment to refund here. Refund it from the Stripe dashboard.');
  }
  let failure = '';
  try {
    await stripe().refunds.create({ payment_intent: o.stripe_payment_intent });
  } catch (e) {
    failure = errMsg(e);
  }
  if (failure) back('/orders', 'err', `Stripe didn’t refund it: ${failure}`);

  await db()`update orders set status = 'refunded' where id = ${id}`;
  const siteOff = await disableSiteForRefund(o as any);
  await audit('order.refund', id, { amount_cents: o.amount_cents, site: o.site_slug });
  revalidatePath('/orders');
  revalidatePath('/sites');
  const siteNote = o.kind === 'one_time' && o.site_slug
    ? (siteOff ? ' Their site is turned off.' : ' The site couldn’t be turned off automatically; turn it off on the Sites page.')
    : '';
  back('/orders', 'ok', `Refunded ${o.customer_email || 'the customer'}.${siteNote}`);
}

export async function resendWelcome(form: FormData) {
  const id = String(form.get('id') || '');
  const [o] = await db()`select * from orders where id = ${id}`;
  const p = await getProduct(o?.product_code);
  if (!o || !p || !o.site_slug) back('/orders', 'err', 'This order isn’t linked to a site, so there’s no email to resend.');

  let failure = '';
  try {
    await callProduct(p, 'resend_email', { slug: o.site_slug });
  } catch (e) {
    failure = errMsg(e);
  }
  if (failure) back('/orders', 'err', failure);
  await audit('order.resend_email', id, { slug: o.site_slug });
  back('/orders', 'ok', `Welcome email resent to ${o.customer_email}.`);
}
