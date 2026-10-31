import Link from 'next/link';
import { formatKampala } from '@/lib/format';
import type { PublicLive } from '@/lib/api';
import { Reveal } from '@/components/home/Reveal';

export function SanctumBand({ live, prayerUrl }: { live: PublicLive | null; prayerUrl: string }) {
  const liveRoom = live?.rooms?.find((room) => room.status === 'LIVE');
  const onAir = live?.status === 'LIVE' || Boolean(liveRoom);
  const when = live?.startsAt
    ? formatKampala(live.startsAt, { weekday: 'long', hour: 'numeric', minute: '2-digit' })
    : 'The next gathering will be posted here.';

  return (
    <section className="bg-gold px-4 py-16 text-ink sm:px-6">
      <Reveal className="mx-auto grid max-w-6xl items-center gap-8 min-[900px]:grid-cols-2">
        <div>
          <h2 className="font-display text-[clamp(34px,4.2vw,50px)] font-light leading-tight">Pray with the church, wherever you are.</h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed">Open the prayer room on your phone, type your name, and listen in. No account, no app to install.</p>
        </div>
        <div className="rounded-[26px] bg-forest-950 p-6 text-on-dark sm:p-7">
          <p className={`flex items-center gap-2 text-sm font-semibold ${onAir ? 'text-live' : 'text-gold-light'}`}>
            {onAir ? <span className="inline-block h-2 w-2 rounded-full bg-live" aria-hidden="true" /> : null}
            {onAir ? 'Live now' : 'Next prayer'}
          </p>
          <p className="font-display mt-2 text-3xl text-cream">{liveRoom?.name || live?.name || 'Prayer room'}</p>
          {!onAir ? <p className="mt-2 text-muted-dark">{when}</p> : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href={prayerUrl} className="site-button bg-gold text-ink">Join the prayer room</a>
            <Link href="/contact" className="site-button border border-sand/40 text-on-dark">Send a prayer request</Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
