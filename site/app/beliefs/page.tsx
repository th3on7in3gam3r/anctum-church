import { Blocks } from '@/lib/blocks';
import { NumberedItem } from '@/components/page/NumberedItem';
import { PageHero } from '@/components/page/PageHero';
import { cmsMetadata, loadCmsPage } from '@/components/CmsArticle';
import { firstParagraph, headingPairs } from '@/lib/pages';

export async function generateMetadata() {
  return cmsMetadata('beliefs', 'What Promised Land Christian Center believes.');
}

export default async function BeliefsPage() {
  const page = await loadCmsPage('beliefs');
  const cells = headingPairs(page);
  return (
    <>
      <PageHero variant="centered" eyebrow="Beliefs" title={page.title} lede={firstParagraph(page)} />
      <section className="bg-cream px-4 py-16 text-ink sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 min-[900px]:grid-cols-2">
          {cells.map((cell, index) => <NumberedItem key={cell.title} index={index + 1} title={cell.title} text={cell.text} />)}
        </div>
        <div className="mx-auto mt-12 max-w-3xl">
          <Blocks blocks={page.body.filter((block) => block.type === 'scripture' || block.type === 'image' || block.type === 'button')} />
        </div>
      </section>
    </>
  );
}
