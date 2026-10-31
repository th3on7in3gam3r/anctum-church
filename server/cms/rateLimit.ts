import { RateLimited } from '../../shared/errors.ts';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;
const hits = new Map<string, number[]>();

export function assertPublicRateLimit(key: string, now = Date.now()): void {
  const recent = (hits.get(key) || []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= MAX_HITS) throw RateLimited();
  recent.push(now);
  hits.set(key, recent);
}

export function resetPublicRateLimit(): void {
  hits.clear();
}
