import Image from 'next/image';
import Link from 'next/link';
import { church } from '@/lib/church';
import { Reveal } from '@/components/home/Reveal';

/**
 * The portrait only renders when a real photo exists (a leader's photo from the dashboard).
 * Without one the section is text-only instead of an empty frame.
 */
export function PastorWelcome({ text, photo, photoAlt }: { text: string; photo?: string | null; photoAlt?: string }) {
  return (
    <section className="bg-cream px-4 py-20 text-ink sm:px-6">
      <Reveal className={`mx-auto grid max-w-6xl items-center gap-12 ${photo ? 'min-[900px]:grid-cols-[380px_1fr] min-[900px]:gap-16' : ''}`}>
        {photo ? (
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[380px] overflow-hidden rounded-t-[200px] rounded-b-[26px] border border-gold">
            <Image src={photo} alt={photoAlt || ''} fill sizes="(min-width: 900px) 380px, 90vw" className="object-cover" />
          </div>
        ) : null}
        <div className={photo ? '' : 'mx-auto max-w-3xl text-center'}>
          <p className="eyebrow !text-gold-ink">A word from our pastor</p>
          <h2 className="font-display mt-4 text-[clamp(38px,4.6vw,56px)] font-light leading-[1.05] tracking-tight">
            You were never meant to walk <em className="italic text-gold-ink">alone.</em>
          </h2>
          {text ? <p className={`mt-6 text-lg leading-relaxed text-ink/80 ${photo ? 'max-w-xl' : 'mx-auto max-w-2xl'}`}>{text}</p> : null}
          <p className="font-display mt-6 text-xl italic text-gold-ink">{church.pastor}</p>
          <Link href="/about" className="mt-6 inline-block font-semibold text-gold-ink underline underline-offset-4">Read our story</Link>
        </div>
      </Reveal>
    </section>
  );
}
