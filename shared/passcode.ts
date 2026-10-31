import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPasscode(passcode: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(passcode, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPasscode(passcode: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const next = scryptSync(passcode, salt, 32);
  const prev = Buffer.from(hash, 'hex');
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}
