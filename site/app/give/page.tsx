import { Blocks } from '@/lib/blocks';
import { PageHero } from '@/components/page/PageHero';
import { cmsMetadata, loadCmsPage } from '@/components/CmsArticle';
import { firstParagraph } from '@/lib/pages';

export async function generateMetadata() {
  return cmsMetadata('give', 'Give to Promised Land Christian Center.');
}

export default async function GivePage() {
  const page = await loadCmsPage('give');
  return (
    <>
      <PageHero variant="centered" eyebrow="Give" title={page.title} lede={firstParagraph(page)} />
      <section className="mx-auto max-w-3xl space-y-6 px-4 py-16 sm:px-6">
        <p className="rounded-[26px] bg-sand px-5 py-4 font-semibold">Online giving is coming soon.</p>
        <Blocks blocks={page.body.filter((block) => !(block.type === 'paragraph' && block.text === firstParagraph(page)))} />
      </section>
    </>
  );
}
