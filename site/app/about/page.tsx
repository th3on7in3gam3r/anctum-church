import Link from 'next/link';
import { CtaBand } from '@/components/page/CtaBand';
import { NumberedItem } from '@/components/page/NumberedItem';
import { PageHero } from '@/components/page/PageHero';
import { PhotoTile } from '@/components/page/PhotoTile';
import { SectionHeader } from '@/components/page/SectionHeader';
import { cmsMetadata, loadCmsPage } from '@/components/CmsArticle';
import { getPage, listLeaders } from '@/lib/api';
import { church } from '@/lib/church';
import { prayerJoinUrl } from '@/lib/env';
import { firstParagraph, headingPairs } from '@/lib/pages';

export async function generateMetadata() {
  return cmsMetadata('about', 'About Promised Land Christian Center.');
}

export default async function AboutPage() {
  const [about, beliefs, leaders] = await Promise.all([
    loadCmsPage('about'),
    getPage('beliefs'),
    listLeaders(),
  ]);
  const story = headingPairs(about, ['Mission', 'Vision', 'Story']);
  const beliefCells = headingPairs(beliefs).slice(0, 4);
  const featured = leaders[0];
  const rest = leaders.slice(1);

  return (
    <>
      <PageHero
        variant="split"
        eyebrow="About us"
        title="Changing hearts."
        accent="Transforming lives."
        lede={firstParagraph(about)}
        photo={about.heroImageUrl}
      />
      <section className="bg-cream px-4 py-20 text-ink sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 min-[900px]:grid-cols-3">
          {story.map((item, index) => <NumberedItem key={item.title} index={index + 1} title={item.title} text={item.text} />)}
        </div>
      </section>
      <section className="bg-sand px-4 py-20 text-ink sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionHeader eyebrow="Leadership" title="Shepherds who" accent="walk with you." />
          {featured ? (
            <div className="mt-12 grid items-center gap-10 min-[900px]:grid-cols-2">
              <PhotoTile src={featured.photoUrl} sizes="(min-width: 900px) 40vw, 100vw" className="min-h-[460px] rounded-[22px]" />
              <div>
                <p className="eyebrow">{featured.role}</p>
                <h3 className="font-display mt-3 text-[52px] font-light leading-none">{featured.name}</h3>
                {featured.bio ? <p className="mt-5 text-lg leading-relaxed">{featured.bio}</p> : null}
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href={church.youtube} className="site-button bg-forest-900 text-on-dark">{church.youtubeLabel}</a>
                  <a href={church.tiktok} className="site-button border border-ink text-ink">{church.tiktokLabel}</a>
                </div>
              </div>
            </div>
          ) : null}
          {rest.length ? (
            <ul className="mt-14 grid gap-6 min-[900px]:grid-cols-3">
              {rest.map((leader) => (
                <li key={leader.id}>
                  <PhotoTile src={leader.photoUrl} sizes="(min-width: 900px) 30vw, 100vw" className="aspect-[4/5] rounded-[22px]" />
                  <p className="font-display mt-4 text-3xl">{leader.name}</p>
                  <p className="text-gold-ink">{leader.role}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
      <section className="bg-forest-900 px-4 py-20 text-on-dark sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionHeader title="Rooted in the Word." href="/beliefs" linkLabel="Full statement of faith →" dark />
          <ul className="mt-10 grid min-[900px]:grid-cols-4">
            {beliefCells.map((cell) => (
              <li key={cell.title} className="border-t border-white/15 py-6 min-[900px]:border-l min-[900px]:px-5 min-[900px]:first:border-l-0">
                <p className="font-display text-2xl">{cell.title}</p>
                <p className="mt-2 text-sand">{cell.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <CtaBand
        title="Come and see for yourself."
        primary={{ href: '/visit', label: 'Plan your visit' }}
        secondary={{ href: prayerJoinUrl(), label: 'Join live prayer' }}
      />
    </>
  );
}
