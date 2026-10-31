import { BRAND } from '../packages/brand/brand.ts';

export type SanctumMode = 'church' | 'product';

export const CHURCH_PUBLIC_NAME = BRAND.fullName;

export function sanctumMode(value: string | undefined | null): SanctumMode {
  return value === 'product' ? 'product' : 'church';
}

export function publicSiteUrl(value: string | undefined | null): string {
  const raw = (value || 'http://localhost:3002').trim();
  return raw.replace(/\/$/, '');
}
