import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CmsImage } from '@/components/CmsImage';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/page/PageHero';
import { PublicForm } from '@/components/PublicForm';
import Link from 'next/link';
import { getEvent, listPublicAlbums } from '@/lib/api';
import { submitRsvp } from '@/lib/actions';
import { siteEnv } from '@/lib/env';
import { eventJsonLd, eventWhen } from '@/lib/jsonld';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: 'Event' };
  return {
    title: event.title,
    description: event.description || `${event.title} at ${event.location}.`,
    openGraph: event.imageUrl ? { images: [{ url: event.imageUrl }] } : undefined,
  };
}

export default async function EventDetailPage({ params }: Params) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  const albums = await listPublicAlbums(`?eventId=${event.id}`);

  return (
    <article>
      <JsonLd data={eventJsonLd(event, `${siteEnv().siteUrl}/events/${event.id}`)} />
      <PageHero fitTitle variant="split" eyebrow="Event" title={event.title} lede={eventWhen(event)} photo={event.imageUrl} />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 min-[900px]:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 text-lg leading-relaxed">
          <p className="font-semibold">{event.location}</p>
          {event.prayerRoom ? <p className="text-gold-ink">Also live on Sanctum</p> : null}
          {event.imageUrl ? <CmsImage src={event.imageUrl} alt="" sizes="(min-width: 900px) 640px, 100vw" /> : null}
          {event.description ? <p className="whitespace-pre-wrap">{event.description}</p> : null}
          {albums.albums.length ? (
            <div>
              <h2 className="font-display text-3xl">Photos from this event</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {albums.albums.map((album) => <Link key={album.id} href={`/gallery/${album.slug}`} className="underline">{album.title}</Link>)}
              </div>
            </div>
          ) : null}
          <a href={`/events/${event.id}/calendar`} className="site-button border border-ink text-ink">Add to calendar</a>
        </div>
        {event.rsvpEnabled ? (
          <section id="rsvp" className="space-y-3">
            <h2 className="font-display text-4xl font-normal">I'm coming</h2>
            <PublicForm
              action={submitRsvp}
              formId="rsvp"
              submitLabel="Save my place"
              hidden={{ eventId: event.id }}
              fields={[
                { name: 'name', label: 'Name', required: true },
                { name: 'phone', label: 'Phone', type: 'tel', required: true },
                { name: 'count', label: 'How many people', type: 'number', min: 1, max: 20, required: true, defaultValue: '1' },
              ]}
            />
          </section>
        ) : null}
      </div>
    </article>
  );
}
