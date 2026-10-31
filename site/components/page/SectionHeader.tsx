import Link from 'next/link';

export function SectionHeader({
  eyebrow,
  title,
  accent,
  href,
  linkLabel,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  href?: string;
  linkLabel?: string;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="font-display mt-3 text-5xl font-light leading-tight">
          {title}{accent ? <> <em className={dark ? 'italic text-gold-light' : 'italic text-gold-ink'}>{accent}</em></> : null}
        </h2>
      </div>
      {href && linkLabel ? <Link href={href} className="font-semibold text-gold-ink">{linkLabel}</Link> : null}
    </div>
  );
}
