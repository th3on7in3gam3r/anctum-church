import Link from 'next/link';
import type { PageBlock } from '@shared/validations/cms.ts';
import { CmsImage } from '@/components/CmsImage';

export function Blocks({ blocks }: { blocks: PageBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Tag = block.level === 1 ? 'h2' : block.level === 3 ? 'h4' : 'h3';
          return (
            <Tag key={index} className="font-display text-3xl font-normal text-ink">
              {block.text}
            </Tag>
          );
        }
        if (block.type === 'paragraph') {
          return (
            <p key={index} className="text-lg leading-relaxed text-ink/90 whitespace-pre-wrap">
              {block.text}
            </p>
          );
        }
        if (block.type === 'image') {
          return (
            <CmsImage
              key={index}
              src={block.url}
              alt={block.alt || ''}
              className="w-full rounded-3xl object-cover"
              sizes="(min-width: 768px) 720px, 100vw"
            />
          );
        }
        if (block.type === 'button') {
          const className = 'site-button bg-gold text-ink';
          if (block.href.startsWith('/')) {
            return (
              <Link key={index} href={block.href} className={className}>
                {block.label}
              </Link>
            );
          }
          return (
            <a key={index} href={block.href} className={className}>
              {block.label}
            </a>
          );
        }
        return (
          <blockquote key={index} className="rounded-3xl bg-sand px-5 py-6">
            <p className="font-display text-2xl font-light italic leading-relaxed text-ink">{block.text}</p>
            <footer className="mt-3 text-sm text-gold-ink">{block.reference}</footer>
          </blockquote>
        );
      })}
    </div>
  );
}
