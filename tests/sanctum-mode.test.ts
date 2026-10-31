import { describe, expect, it } from 'vitest';
import { publicSiteUrl, sanctumMode } from '../shared/sanctumMode.ts';

describe('sanctum mode', () => {
  it('defaults to church and sends the home page to the church website', () => {
    expect(sanctumMode(undefined)).toBe('church');
    expect(sanctumMode('')).toBe('church');
    expect(sanctumMode('church')).toBe('church');
    expect(sanctumMode('product')).toBe('product');
    expect(publicSiteUrl(undefined)).toBe('http://localhost:3002');
    expect(publicSiteUrl('http://localhost:3002/')).toBe('http://localhost:3002');
  });
});
