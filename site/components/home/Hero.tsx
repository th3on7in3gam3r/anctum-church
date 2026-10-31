import Link from 'next/link';
import { church } from '@/lib/church';
import { formatKampala } from '@/lib/format';
import type { PublicLive } from '@/lib/api';
import type { ScheduleItem } from '@/lib/schedule';

function LiveDot() {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-live" aria-hidden="true" />;
}

export function directionsUrl() {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(church.mapsQuery)}`;
}

function LivePanel({ live, liveUrl }: { live: PublicLive | null; liveUrl: string }) {
  const liveRoom = live?.rooms?.find((room) => room.status === 'LIVE');
  const onAir = live?.status === 'LIVE' || Boolean(liveRoom);
  const name = liveRoom?.name || live?.name || 'Prayer room';
  const when = live?.startsAt ? formatKampala(live.startsAt, { weekday: 'long', hour: 'numeric', minute: '2-digit' }) : null;

  return (
    <div className={`rounded-[18px] border p-5 ${onAir ? 'border-live/40 bg-forest-800' : 'border-gold/30 bg-forest-800/70'}`}>
      <p className={`flex items-center gap-2 text-[13px] font-semibold tracking-wide ${onAir ? 'text-live' : 'text-gold-light'}`}>
        {onAir ? <LiveDot /> : null}
        {onAir ? 'LIVE NOW' : 'NEXT PRAYER'}
      </p>
      <p className="font-display mt-2 text-[28px] leading-tight text-cream">{name}</p>
      {!onAir && when ? <p className="mt-1 text-[15px] text-muted-dark">{when}</p> : null}
      <a href={liveUrl} className="site-button mt-4 bg-gold text-ink">Join the prayer room</a>
    </div>
  );
}

export function Hero({
  lead,
  week,
  live,
  liveUrl,
  messageHref,
}: {
  lead: string;
  week: ScheduleItem[];
  live: PublicLive | null;
  liveUrl: string;
  messageHref: string | null;
}) {
  return (
    <section className="relative overflow-hidden bg-forest-900 text-on-dark">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 80% 8%, rgba(201,163,90,0.30), transparent 42%), linear-gradient(165deg, #1d372c 0%, #12231c 55%, #0d1a14 100%)' }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-28 sm:px-6 min-[900px]:grid-cols-[1.1fr_1fr] min-[900px]:gap-14 min-[900px]:pb-20 min-[900px]:pt-36">
        <div>
          <p className="eyebrow">A Pentecostal family in Kampala</p>
          <h1 className="font-display mt-5 max-w-xl text-[clamp(46px,6.4vw,84px)] font-light leading-[0.98] tracking-[-0.03em] text-cream">
            Come home to the <em className="italic text-gold-light">land of promise.</em>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-sand">
            {lead || 'Changing hearts. Transforming lives.'}{' '}
            Worship with us in Kira-Kitukutwe, or pray with the church from wherever you are.
          </p>
          <div className="mt-8 hidden gap-3 min-[900px]:flex">
            <Link href="/visit" className="site-button bg-gold text-ink">Plan your visit</Link>
            {messageHref ? (
              <Link href={messageHref} className="site-button border border-sand/50 text-on-dark">Watch the latest message</Link>
            ) : (
              <a href={liveUrl} className="site-button border border-sand/50 text-on-dark"><LiveDot /> Join live prayer</a>
            )}
          </div>
        </div>

        <aside aria-label="Tonight and this week" className="rounded-[26px] border border-gold/45 bg-forest-950/55 p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-xs font-semibold tracking-[0.22em] text-gold">TONIGHT &amp; THIS WEEK</p>
            <p className="text-[13px] text-muted-dark">East Africa Time</p>
          </div>
          <LivePanel live={live} liveUrl={liveUrl} />
          {week.length ? (
            <ul className="mt-2 divide-y divide-on-dark/10">
              {week.map((item) => (
                <li key={item.key} className="flex gap-4 py-4">
                  <span className="w-12 shrink-0 pt-0.5 text-[13px] font-semibold tracking-[0.12em] text-gold">{item.day || 'DAILY'}</span>
                  <span className="min-w-0">
                    <span className="block text-[17px] font-semibold text-cream">{item.name}</span>
                    <span className="mt-0.5 block text-sm text-muted-dark">{[item.time, item.detail].filter(Boolean).join(' · ')}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <a href={directionsUrl()} className="mt-1 inline-block text-sm font-semibold text-gold-light underline-offset-4 hover:underline">
            {church.address} · Get directions
          </a>
        </aside>

        <Link href="/visit" className="site-button mobile-only border border-sand/50 text-on-dark">Plan your visit</Link>
      </div>
    </section>
  );
}
