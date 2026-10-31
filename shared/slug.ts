import { DuplicateSlug } from './errors.ts';

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ensureSlugAvailable(taken: boolean, slug: string): void {
  if (taken) throw DuplicateSlug(slug);
}
