import Link from 'next/link';

export function CtaBand({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
}) {
  return (
    <section className="bg-gold px-4 py-16 text-ink sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
        <h2 className="font-display text-5xl font-light leading-tight">{title}</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={primary.href} className="site-button bg-forest-900 text-on-dark">{primary.label}</Link>
          <a href={secondary.href} className="site-button border border-ink text-ink">{secondary.label}</a>
        </div>
      </div>
    </section>
  );
}
