import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CmsImage } from '@/components/CmsImage';
import { getPage, type PublicPage } from '@/lib/api';
import { Blocks } from '@/lib/blocks';
import { excerptFromBlocks } from '@/lib/format';

export async function loadCmsPage(slug: string): Promise<PublicPage> {
  const page = await getPage(slug);
  if (!page) notFound();
  return page;
}

export async function cmsMetadata(slug: string, fallback: string): Promise<Metadata> {
  const page = await getPage(slug);
  if (!page) return { title: fallback };
  return {
    title: page.title,
    description: excerptFromBlocks(page.body, fallback),
    openGraph: page.heroImageUrl ? { images: [{ url: page.heroImageUrl }] } : undefined,
  };
}

export function CmsArticle({
  page,
  intro,
  children,
}: {
  page: PublicPage;
  intro?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <article className="page-wrap space-y-6">
      <header className="space-y-4">
        <h1 className="page-title">{page.title}</h1>
        {page.heroImageUrl ? (
          <CmsImage src={page.heroImageUrl} alt="" priority sizes="(min-width: 768px) 720px, 100vw" />
        ) : null}
      </header>
      {intro}
      <Blocks blocks={page.body} />
      {children}
    </article>
  );
}
