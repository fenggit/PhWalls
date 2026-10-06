import { pbkdf2Sync, randomBytes } from 'node:crypto';

const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 8) {
  console.error('请通过 ADMIN_PASSWORD 环境变量提供至少 8 位密码。');
  process.exit(1);
}
const iterations = 210000;
const salt = randomBytes(32);
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const value = `PBKDF2_SHA256$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;
console.log(`Cloudflare Secret: ${value}`);
console.log(`.env.local: ADMIN_PASSWORD_HASH=${value.replace(/\$/g, '\\$')}`);
