import Link from 'next/link';
import { PageHero } from '@/components/page/PageHero';
import { prayerJoinUrl } from '@/lib/env';

export default function NotFound() {
  return (
    <PageHero variant="centered" eyebrow="404" title="Page not found" lede="That page is not published.">
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/" className="site-button bg-gold text-ink">Back home</Link>
        <a href={prayerJoinUrl()} className="site-button border border-sand text-on-dark">Join live prayer</a>
      </div>
    </PageHero>
  );
}
