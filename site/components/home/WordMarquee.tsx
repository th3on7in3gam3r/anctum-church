const DEFAULT_PHRASES = [
  'Worship & Word',
  'Prayer & Power',
  'Family & Faith',
  'Changing hearts. Transforming lives.',
];

function Diamond() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      <path d="M7 0 L14 7 L7 14 L0 7 Z" fill="#C9A35A" />
    </svg>
  );
}

function Phrase({ text }: { text: string }) {
  if (!text.includes('&')) {
    return <span className="italic text-[#E4C98F]">{text}</span>;
  }
  const [before, after] = text.split('&');
  return (
    <span>
      {before.trim()} <em className="italic text-[#C9A35A]">&amp;</em> {after.trim()}
    </span>
  );
}

function PhraseRow({ phrases }: { phrases: string[] }) {
  return (
    <span className="inline-flex items-center gap-10 pr-10">
      {phrases.map((phrase) => (
        <span key={phrase} className="inline-flex items-center gap-10">
          <Phrase text={phrase} />
          <Diamond />
        </span>
      ))}
    </span>
  );
}

export function WordMarquee({ phrases = DEFAULT_PHRASES }: { phrases?: readonly string[] }) {
  return (
    <section
      aria-label={phrases.join(', ')}
      className="overflow-hidden border-y bg-[#0D1A14] py-[26px]"
      style={{ borderColor: 'rgba(201,163,90,0.35)' }}
    >
      <div
        className="plcc-marquee inline-flex w-max items-center whitespace-nowrap font-display text-[clamp(30px,3.6vw,52px)] tracking-[-0.02em] text-[#F5EEDD]"
        style={{ fontWeight: 350 }}
        aria-hidden="true"
      >
        <PhraseRow phrases={[...phrases]} />
        <PhraseRow phrases={[...phrases]} />
      </div>
    </section>
  );
}
