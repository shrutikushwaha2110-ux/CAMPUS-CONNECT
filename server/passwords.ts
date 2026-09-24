// Password + session-token helpers. Passwords are never stored: only a salted scrypt hash.
// Stored format: scrypt$<N>$<saltHex>$<hashHex>
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384; // CPU/memory cost (Node's default); keeps a login check around ~50 ms
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, { N });
  return `scrypt$${N}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, n, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: Number(n) });
  return timingSafeEqual(actual, expected); // constant-time compare
}

// Used when the email doesn't exist, so a wrong email takes as long as a wrong password
export const DUMMY_HASH = hashPassword('not-a-real-password-0');

// Session tokens: the browser gets the random token in an httpOnly cookie; the DB keeps only its SHA-256,
// so a copy of the database file can't be used to hijack sessions.
export const newToken = () => randomBytes(32).toString('base64url');
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
