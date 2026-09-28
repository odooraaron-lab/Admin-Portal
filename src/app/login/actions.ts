'use server';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSession, SESSION_COOKIE } from '@/lib/session';

export async function login(_: unknown, form: FormData) {
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const code = String(form.get('code') || '').replace(/\s/g, '');

  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const hashB64 = process.env.ADMIN_PASSWORD_HASH_B64 || '';
  const totpSecret = process.env.ADMIN_TOTP_SECRET || '';
  if (!adminEmail || !hashB64) return { error: 'Admin login isn’t set up. Run npm run setup-admin and add the values to Vercel.' };

  const hash = Buffer.from(hashB64, 'base64').toString('utf8');
  const emailOk = email === adminEmail;
  const pwOk = await bcrypt.compare(password, hash);
  const codeOk = !totpSecret || authenticator.check(code, totpSecret);
console.log('login check', {
  emailOk, pwOk, codeOk,
  emailSet: !!adminEmail, hashLength: hash.length, totpLength: totpSecret.length,
});
  if (!emailOk || !pwOk || !codeOk) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: 'Those details don’t match. Check your email, password and 6-digit code.' };
  }

  cookies().set(SESSION_COOKIE, await createSession(), {
    httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 60 * 60 * 24 * 7,
  });
  redirect('/');
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
  redirect('/login');
}
