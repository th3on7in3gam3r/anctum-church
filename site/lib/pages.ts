import type { PageBlock } from '@shared/validations/cms.ts';
import type { PublicPage } from './api';

export type NamedBlock = { title: string; text: string };

function pairs(blocks: PageBlock[]): NamedBlock[] {
  const items: NamedBlock[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block?.type !== 'heading') continue;
    const next = blocks[index + 1];
    items.push({ title: block.text, text: next?.type === 'paragraph' ? next.text : '' });
  }
  return items;
}

export function firstParagraph(page: PublicPage | null) {
  const block = page?.body.find((item) => item.type === 'paragraph');
  return block?.type === 'paragraph' ? block.text : '';
}

export function headingPairs(page: PublicPage | null, names?: string[]) {
  if (!page) return [];
  const items = pairs(page.body);
  if (!names) return items;
  return names.map((name) => items.find((item) => item.title === name) || { title: name, text: '' }).filter((item) => item.text);
}
