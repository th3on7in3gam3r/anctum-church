import { JsonLd } from '@/components/JsonLd';
import { Gather } from '@/components/home/Gather';
import { Hero } from '@/components/home/Hero';
import { MessageAndEvents } from '@/components/home/MessageAndEvents';
import { PastorWelcome } from '@/components/home/PastorWelcome';
import { PhotoStrip, type StripPhoto } from '@/components/home/PhotoStrip';
import { WordMarquee } from '@/components/home/WordMarquee';
import { PlanVisit } from '@/components/home/PlanVisit';
import { SanctumBand } from '@/components/home/SanctumBand';
import { Scripture } from '@/components/home/Scripture';
import { cmsMetadata, loadCmsPage } from '@/components/CmsArticle';
import { getLive, listAnnouncements, listEvents, listLeaders, listPublicAlbums, listServiceTimes, listSermons } from '@/lib/api';
import { prayerJoinUrl, siteEnv } from '@/lib/env';
import { parseHome } from '@/lib/home';
import { churchJsonLd } from '@/lib/jsonld';
import { scheduleFromHome, scheduleFromServiceTimes } from '@/lib/schedule';

export async function generateMetadata() {
  return cmsMetadata('home', 'A Pentecostal church in Kampala.');
}

export default async function HomePage() {
  const [page, announcements, events, sermons, live, gallery, serviceTimes, leaders] = await Promise.all([
    loadCmsPage('home'),
    listAnnouncements(),
    listEvents(),
    listSermons(),
    getLive(),
    listPublicAlbums(),
    listServiceTimes(),
    listLeaders(),
  ]);
  const home = parseHome(page);
  const schedule = serviceTimes.length ? scheduleFromServiceTimes(serviceTimes) : scheduleFromHome(home.times);
  const week = schedule.filter((item) => item.featured);
  const prayerUrl = prayerJoinUrl();
  const liveRoom = live?.rooms?.find((room) => room.status === 'LIVE');
  const liveUrl = liveRoom ? `${siteEnv().sanctumAppUrl}/join/${liveRoom.slug}` : prayerUrl;
  const latest = sermons[0] ?? null;
  const pastor = leaders.find((leader) => leader.photoUrl);

  // Real photos only, in order: the home page photo set in the dashboard, then recent gallery moments.
  const photos: StripPhoto[] = [
    ...(page.heroImageUrl ? [{ key: 'home-hero', url: page.heroImageUrl, alt: 'Promised Land Christian Center', href: '/gallery' }] : []),
    ...gallery.moments.map((photo) => ({
      key: photo.id,
      url: photo.url,
      alt: photo.alt,
      href: photo.album?.slug ? `/gallery/${photo.album.slug}` : '/gallery',
    })),
  ];

  return (
    <>
      <JsonLd data={churchJsonLd(siteEnv().siteUrl, serviceTimes)} />
      <Hero lead={home.lead} week={week} live={live} liveUrl={liveUrl} messageHref={latest ? `/sermons/${latest.id}` : null} />
      <WordMarquee />
      {announcements[0] ? (
        <p className="bg-sand px-4 py-4 text-center text-ink sm:px-6">
          <strong className="mr-2 font-semibold text-gold-ink">Announcement</strong>
          {announcements[0].title}
        </p>
      ) : null}
      <PhotoStrip photos={photos} />
      <PastorWelcome text={home.welcome} photo={pastor?.photoUrl} photoAlt={pastor?.name} />
      {home.scripture ? <Scripture scripture={home.scripture} /> : null}
      {schedule.length ? <Gather items={schedule} liveUrl={liveUrl} /> : null}
      <SanctumBand live={live} prayerUrl={liveUrl} />
      <MessageAndEvents sermon={latest} events={events.slice(0, 3)} />
      <PlanVisit points={home.visit} />
    </>
  );
}
