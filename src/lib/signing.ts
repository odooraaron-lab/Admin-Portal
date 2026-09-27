import { createHmac, timingSafeEqual } from 'crypto';

/** HMAC-SHA256 hex signature of a raw request body. */
export function sign(secret: string, body: string) {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function verify(secret: string, body: string, signature: string | null) {
  if (!signature) return false;
  const expected = Buffer.from(sign(secret, body), 'hex');
  const given = Buffer.from(signature, 'hex');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Rejects messages older than 5 minutes (stops replayed requests). */
export function isFresh(ts: unknown) {
  return typeof ts === 'number' && Math.abs(Date.now() - ts) < 5 * 60 * 1000;
}
