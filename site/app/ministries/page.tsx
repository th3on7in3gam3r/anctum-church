import Link from 'next/link';
import { MinistryRow, groupAnchor } from '@/components/page/MinistryRow';
import { PageHero } from '@/components/page/PageHero';
import { cmsMetadata, loadCmsPage } from '@/components/CmsArticle';
import { listPublicGroups } from '@/lib/api';
import { siteEnv } from '@/lib/env';
import { firstParagraph } from '@/lib/pages';

export async function generateMetadata() {
  return cmsMetadata('ministries', 'Ministries at Promised Land Christian Center.');
}

export default async function MinistriesPage() {
  const [page, groups] = await Promise.all([loadCmsPage('ministries'), listPublicGroups()]);
  const ministries = groups.filter((group) => group.type === 'MINISTRY');
  return (
    <>
      <PageHero
        variant="centered"
        eyebrow="Ministries"
        title={page.title}
        lede={firstParagraph(page)}
        jumps={ministries.map((group) => ({ href: `#${groupAnchor(group.name)}`, label: group.name }))}
      />
      <section className="bg-cream px-4 text-ink sm:px-6">
        <div className="mx-auto max-w-6xl divide-y divide-ink/10">
          {ministries.map((group, index) => (
            <MinistryRow
              key={group.id}
              group={group}
              index={index}
              huddleHref={group.huddle ? `${siteEnv().sanctumAppUrl}/join/${group.huddle.slug}` : null}
            />
          ))}
        </div>
      </section>
      <section className="bg-forest-900 px-4 py-16 text-on-dark sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
          <h2 className="font-display text-5xl font-light">Live huddles</h2>
          <Link href="/huddles" className="site-button bg-gold text-ink">See the huddles</Link>
        </div>
      </section>
    </>
  );
}
