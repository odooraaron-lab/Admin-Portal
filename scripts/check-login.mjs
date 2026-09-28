import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import readline from 'readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const hashB64 = (await rl.question('Paste ADMIN_PASSWORD_HASH_B64 from Vercel: ')).trim();
const pw = await rl.question('Your password: ');
const secret = (await rl.question('Paste ADMIN_TOTP_SECRET from Vercel: ')).trim();
const code = (await rl.question('Current 6-digit code from your app: ')).trim();
rl.close();

authenticator.options = { window: 1 };
console.log('Password matches:', bcrypt.compareSync(pw, Buffer.from(hashB64, 'base64').toString('utf8')));
console.log('Code matches:', authenticator.check(code, secret));