import Link from 'next/link';
import { church } from '@/lib/church';
import { directionsUrl } from '@/components/home/Hero';
import { Reveal } from '@/components/home/Reveal';

export function PlanVisit({ points }: { points: string[] }) {
  return (
    <section className="relative overflow-hidden bg-forest-900 px-4 py-20 text-on-dark sm:px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 85% 15%, rgba(201,163,90,0.22), transparent 40%), linear-gradient(165deg, #1d372c, #12231c 60%, #0d1a14)' }}
      />
      <Reveal className="relative mx-auto max-w-6xl">
        <h2 className="font-display text-[clamp(38px,4.6vw,56px)] font-light leading-tight text-cream">
          We’ve saved you a <em className="italic text-gold-light">seat.</em>
        </h2>
        {points.length ? (
          <ul className="mt-10 grid gap-x-8 gap-y-6 min-[600px]:grid-cols-2 min-[900px]:grid-cols-4">
            {points.map((point) => (
              <li key={point} className="border-t border-gold/70 pt-4 text-[16px] leading-relaxed text-sand">{point}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-12 flex flex-col gap-5 rounded-[26px] border border-gold/40 bg-forest-950/60 p-6 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between sm:p-7">
          <div>
            <p className="text-[17px] font-semibold text-cream">{church.address}</p>
            <p className="mt-1 text-[15px] text-muted-dark">
              <a href={church.phones[0].href} className="hover:underline">{church.phones[0].label}</a>
              {' · '}
              <a href={`mailto:${church.email}`} className="hover:underline">{church.email}</a>
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={directionsUrl()} className="site-button bg-gold text-ink">Get directions</a>
            <a href={church.whatsapp} className="site-button border border-sand/40 text-on-dark">Message us on WhatsApp</a>
            <Link href="/visit" className="site-button border border-sand/40 text-on-dark">Plan your visit</Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
