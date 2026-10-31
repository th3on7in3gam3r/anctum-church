import Link from 'next/link';
import { YoutubeFacade } from '@/components/YoutubeFacade';
import { formatDay, formatKampala } from '@/lib/format';
import type { PublicEvent, PublicSermon } from '@/lib/api';
import { Reveal } from '@/components/home/Reveal';

function LatestMessage({ sermon }: { sermon: PublicSermon }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow !text-gold-ink">Latest message</p>
      <div className="mt-4 overflow-hidden rounded-[22px]">
        {sermon.youtubeUrl ? (
          <YoutubeFacade url={sermon.youtubeUrl} title={sermon.title} />
        ) : null}
      </div>
      <h3 className="font-display mt-5 text-[clamp(28px,3vw,36px)] font-light leading-tight">{sermon.title}</h3>
      <p className="mt-2 text-ink/70">
        {[sermon.speaker, sermon.scripture, formatDay(sermon.preachedOn)].filter(Boolean).join(' · ')}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/sermons/${sermon.id}`} className="site-button bg-forest-900 text-on-dark">{sermon.youtubeUrl ? 'Watch' : 'Listen'}</Link>
        <Link href="/sermons" className="site-button border border-ink text-ink">All messages</Link>
      </div>
    </div>
  );
}

function ComingUp({ events }: { events: PublicEvent[] }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow !text-gold-ink">Coming up</p>
      <ul className="mt-4 divide-y divide-ink/15 border-y border-ink/15">
        {events.map((event) => (
          <li key={event.id} className="flex items-center gap-4 py-5">
            <p className="w-16 shrink-0">
              <span className="font-display block text-[44px] leading-none">{formatKampala(event.startsAt, { day: 'numeric' })}</span>
              <span className="text-xs text-gold-ink">{formatKampala(event.startsAt, { month: 'short' })} · {formatKampala(event.startsAt, { weekday: 'short' })}</span>
            </p>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[22px] leading-tight">{event.title}</p>
              <p className="mt-1 text-sm text-ink/70">{formatKampala(event.startsAt, { hour: 'numeric', minute: '2-digit' })} · {event.location}</p>
            </div>
            <Link
              href={`/events/${event.id}`}
              className={event.rsvpEnabled ? 'site-button shrink-0 bg-forest-900 text-on-dark' : 'site-button shrink-0 border border-ink text-ink'}
            >
              {event.rsvpEnabled ? 'RSVP' : 'Details'}
            </Link>
          </li>
        ))}
      </ul>
      {events.length === 0 ? <p className="mt-5 text-ink/80">The next gatherings will be posted here.</p> : null}
      <Link href="/events" className="mt-5 inline-block font-semibold text-gold-ink underline underline-offset-4">See all events</Link>
    </div>
  );
}

export function MessageAndEvents({ sermon, events }: { sermon: PublicSermon | null; events: PublicEvent[] }) {
  return (
    <section className="bg-cream px-4 py-20 text-ink sm:px-6">
      <Reveal className={`mx-auto grid max-w-6xl gap-14 ${sermon ? 'min-[900px]:grid-cols-[1.2fr_1fr]' : ''}`}>
        {sermon ? <LatestMessage sermon={sermon} /> : null}
        <ComingUp events={events} />
      </Reveal>
    </section>
  );
}
