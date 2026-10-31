import type { Scripture as ScriptureBlock } from '@/lib/home';
import { Reveal } from '@/components/home/Reveal';

export function Scripture({ scripture }: { scripture: ScriptureBlock }) {
  return (
    <section className="bg-sand px-4 py-20 text-center text-ink sm:px-6">
      <Reveal className="mx-auto max-w-3xl">
        <span className="mx-auto mb-8 block h-2 w-2 rotate-45 bg-gold" aria-hidden="true" />
        <blockquote>
          <p className="font-display text-[clamp(30px,3.6vw,50px)] font-light italic leading-snug">{scripture.text}</p>
          <footer className="mt-6 text-sm tracking-wide text-gold-ink">{scripture.reference}</footer>
        </blockquote>
      </Reveal>
    </section>
  );
}
