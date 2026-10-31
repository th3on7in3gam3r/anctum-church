import { describe, expect, it } from 'vitest';
import { parseJoinInput } from '../src/services/joinLink.ts';

describe('parseJoinInput', () => {
  it('extracts a slug from a full join URL', () => {
    expect(parseJoinInput('https://sanctum.live/join/dawn-intercession')).toBe('dawn-intercession');
    expect(parseJoinInput('http://localhost:3010/join/morning-prayer?x=1')).toBe('morning-prayer');
  });

  it('accepts a path or short code', () => {
    expect(parseJoinInput('/join/friday-vigil')).toBe('friday-vigil');
    expect(parseJoinInput('dawn-intercession')).toBe('dawn-intercession');
  });

  it('rejects empty or invalid input', () => {
    expect(parseJoinInput('')).toBeNull();
    expect(parseJoinInput('join')).toBeNull();
    expect(parseJoinInput('not a slug!!!')).toBeNull();
  });
});
