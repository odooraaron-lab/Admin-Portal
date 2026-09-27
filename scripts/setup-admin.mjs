// Generates the admin login values for your .env / Vercel env vars.
// Usage: npm run setup-admin
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';
import readline from 'readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const email = (await rl.question('Admin email: ')).trim();
const pw = await rl.question('Choose a password (12+ characters): ');
rl.close();
if (pw.length < 12) { console.error('Password must be at least 12 characters.'); process.exit(1); }

const hash = bcrypt.hashSync(pw, 12);
const totp = authenticator.generateSecret();
const otpauth = authenticator.keyuri(email, 'HQ Admin', totp);

console.log('\nPaste these into Vercel → Project → Settings → Environment Variables:\n');
console.log(`ADMIN_EMAIL=${email}`);
console.log(`ADMIN_PASSWORD_HASH_B64=${Buffer.from(hash).toString('base64')}`);
console.log(`ADMIN_TOTP_SECRET=${totp}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}`);
console.log(`CRON_SECRET=${randomBytes(24).toString('hex')}`);
console.log('\nAdd the two-factor code to Google Authenticator / 1Password using this key:');
console.log(`  ${totp}`);
console.log(`  (or this link: ${otpauth})\n`);
