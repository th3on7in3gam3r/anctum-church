import { PhotoTile } from '@/components/page/PhotoTile';
import type { PublicGroup } from '@/lib/api';

export function groupAnchor(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group';
}

export function MinistryRow({ group, index, href = '/visit', huddleHref }: { group: PublicGroup; index: number; href?: string; huddleHref?: string | null }) {
  const flip = index % 2 === 1;
  return (
    <article id={groupAnchor(group.name)} className="grid items-center gap-8 py-10 min-[900px]:grid-cols-2">
      <PhotoTile
        src={group.imageUrl}
        sizes="(min-width: 900px) 40vw, 100vw"
        className={`aspect-[4/3] rounded-[22px] ${flip ? 'min-[900px]:order-2' : ''}`}
      />
      <div>
        <p className="font-display text-3xl text-gold">{String(index + 1).padStart(2, '0')}</p>
        <h2 className="font-display mt-2 text-5xl font-light">{group.name}</h2>
        {group.publicDescription ? <p className="mt-4 text-lg leading-relaxed">{group.publicDescription}</p> : null}
        {group.meetingTime ? <p className="mt-4 font-semibold">{group.meetingTime}</p> : null}
        <a href={href} className="mt-4 inline-block font-semibold text-gold-ink">Learn more</a>
        {huddleHref ? <a href={huddleHref} className="mt-3 block font-semibold text-gold-ink">Join the live huddle</a> : null}
      </div>
    </article>
  );
}
