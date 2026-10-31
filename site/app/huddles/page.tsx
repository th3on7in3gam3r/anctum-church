import type { Metadata } from 'next';
import { PageHero } from '@/components/page/PageHero';
import { listPublicGroups, type PublicGroup } from '@/lib/api';
import { siteEnv } from '@/lib/env';
import { formatKampala } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Live huddles',
  description: 'Small gatherings through the week at Promised Land Christian Center.',
};

function joinHref(slug: string) {
  return `${siteEnv().sanctumAppUrl}/join/${slug}`;
}

function whatsAppHref(name: string, slug: string) {
  const text = `Join ${name}: ${joinHref(slug)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function whenLabel(group: PublicGroup) {
  if (group.huddle?.status === 'LIVE' || group.huddle?.status === 'WAITING') return 'Open now';
  if (group.huddle?.nextStartsAt) {
    return formatKampala(group.huddle.nextStartsAt, { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  }
  return group.meetingTime || 'Time to be announced';
}

export default async function HuddlesPage() {
  const groups = (await listPublicGroups()).filter((group) => group.huddle);
  const types = [...new Set(groups.map((group) => group.type))];
  return (
    <>
      <PageHero
        variant="centered"
        eyebrow="Through the week"
        title="Live huddles"
        lede="Smaller gatherings for prayer and company. When a room is open, you can join from your phone."
      />
      <section className="bg-cream px-4 py-12 text-ink sm:px-6">
        <div className="mx-auto max-w-6xl space-y-12">
          {types.map((type) => (
            <div key={type}>
              <h2 className="font-display text-4xl font-light">{type.charAt(0) + type.slice(1).toLowerCase()}</h2>
              <ul className="mt-4 divide-y divide-ink/10">
                {groups.filter((group) => group.type === type).map((group) => {
                  const href = joinHref(group.huddle!.slug);
                  return (
                    <li key={group.id} className="flex flex-col gap-3 py-5 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
                      <div>
                        <p className="font-display text-3xl">{group.huddle!.name}</p>
                        <p className="mt-1 text-ink/70">{group.name} · {whenLabel(group)}</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <a href={href} className="site-button bg-gold text-ink">Join</a>
                        <a href={whatsAppHref(group.huddle!.name, group.huddle!.slug)} className="site-button border border-ink text-ink">Share on WhatsApp</a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {groups.length === 0 ? <p className="py-8 text-lg">Huddle times will be posted here.</p> : null}
        </div>
      </section>
    </>
  );
}
