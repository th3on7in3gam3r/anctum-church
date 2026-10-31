import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * Suggests an alternative unique slug by appending incremental integers
 */
export function suggestAlternativeSlug(baseSlug: string, existingSlugs: string[]): string {
  const normalizedBase = slugify(baseSlug) || 'prayer-room';
  let counter = 2;
  let candidate = `${normalizedBase}-${counter}`;
  
  const existingSet = new Set(existingSlugs.map((s) => s.toLowerCase().trim()));
  while (existingSet.has(candidate)) {
    counter += 1;
    candidate = `${normalizedBase}-${counter}`;
  }
  
  return candidate;
}
