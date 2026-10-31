import Link from 'next/link';
import { GlowPhoto } from '@/components/GlowPhoto';

export function heroTitleClass(title: string) {
  if (title.length <= 28) return 'text-[clamp(56px,7vw,104px)]';
  if (title.length <= 48) return 'text-[clamp(44px,5.4vw,80px)]';
  return 'text-[clamp(36px,4.2vw,60px)]';
}

export function PageHero({
  eyebrow,
  title,
  accent,
  lede,
  photo,
  variant = 'split',
  jumps = [],
  aside,
  children,
  fitTitle = false,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  lede?: string;
  photo?: string | null;
  variant?: 'split' | 'centered' | 'overlap';
  jumps?: { href: string; label: string }[];
  aside?: React.ReactNode;
  children?: React.ReactNode;
  fitTitle?: boolean;
}) {
  const centered = variant === 'centered';
  const overlap = variant === 'overlap';
  const split = variant === 'split';
  return (
    <section className={`relative overflow-hidden bg-forest-900 text-on-dark ${overlap ? 'pb-36' : ''}`}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 88% 8%, rgba(201,163,90,0.28), transparent 36%), linear-gradient(180deg, #1d372c 0%, #12231c 55%, #0d1a14 100%)' }}
      />
      <div className={`relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 ${split ? 'min-[900px]:grid-cols-2' : ''} ${overlap ? 'pb-28' : ''}`}>
        <div className={centered ? 'mx-auto max-w-3xl text-center' : ''}>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1
            title={accent ? `${title} ${accent}` : title}
            className={`font-display mt-4 font-light leading-[0.92] tracking-[-0.035em] ${fitTitle ? `${heroTitleClass(title)} text-balance line-clamp-3` : 'text-[clamp(56px,7vw,104px)]'}`}
          >
            {title}{accent ? <> <em className="italic text-gold-light">{accent}</em></> : null}
          </h1>
          {lede ? <p className="mt-6 text-[19px] leading-relaxed text-[#CFC6B2]">{lede}</p> : null}
          {jumps.length ? (
            <ul className="mt-8 flex flex-wrap justify-center gap-2">
              {jumps.map((jump) => (
                <li key={jump.href}>
                  <Link href={jump.href} className="site-button border border-sand/40 px-4 text-sm text-on-dark">{jump.label}</Link>
                </li>
              ))}
            </ul>
          ) : null}
          {children}
        </div>
        {aside}
        {variant === 'split' && !aside ? (
          <GlowPhoto
            src={photo}
            alt=""
            sizes="(min-width: 900px) 40vw, 100vw"
            className="min-h-[420px] rounded-t-[220px] border border-gold/80"
          />
        ) : null}
      </div>
    </section>
  );
}
