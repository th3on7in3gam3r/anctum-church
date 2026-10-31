'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { BrandLockup } from '@plcc/brand/BrandLockup';
import { BRAND } from '@plcc/brand/brand';
import { church } from '@/lib/church';
import { footerNav, MAIN_NAV, type NavLink } from '@/lib/nav';

function LiveDot({ pulse = false }: { pulse?: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full bg-live ${pulse ? 'live-pulse' : ''}`} aria-hidden="true" />;
}

function isCurrent(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

function NavAnchor({
  link,
  className,
  current,
  onClick,
  children,
}: {
  link: NavLink;
  className?: string;
  current?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  if (link.href.startsWith('/')) {
    return (
      <Link href={link.href} className={className} onClick={onClick} aria-current={current ? 'page' : undefined}>
        {children}
      </Link>
    );
  }
  return (
    <a href={link.href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

export function SiteChrome({ children, prayerUrl, staffLoginUrl, serviceStrip = [], liveNow = false }: { children: React.ReactNode; prayerUrl: string; staffLoginUrl: string; serviceStrip?: string[]; liveNow?: boolean }) {
  const path = usePathname();
  const home = path === '/';
  const [open, setOpen] = useState(false);
  const footer = footerNav(prayerUrl);
  const livePrayer = footer.gather.find((link) => link.label === 'Live prayer');
  const give = footer.gather.find((link) => link.label === 'Give');
  const sticky = footer.gather.filter((link) => link.label !== 'Events' && link.label !== 'Huddles');

  return (
    <div className={home ? 'bg-forest-900 text-on-dark' : 'bg-cream text-ink'}>
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-cream focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <header className={`z-40 ${home ? 'absolute inset-x-0 top-0' : 'bg-forest-900 text-on-dark'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-5 sm:px-6">
          <BrandLockup size="md" href="/" />
          <nav className="hidden items-center gap-5 text-sm text-on-dark min-[900px]:flex" aria-label="Primary">
            {MAIN_NAV.map((link) => {
              const current = isCurrent(path, link.href);
              return (
                <NavAnchor key={link.href} link={link} current={current} className={current ? 'text-gold-light' : 'hover:text-gold-light'}>
                  {link.label}
                </NavAnchor>
              );
            })}
            {livePrayer ? (
              <NavAnchor link={livePrayer} className="site-button border border-sand/40 px-4 text-on-dark">
                <LiveDot pulse={liveNow} /> {liveNow ? 'Live now' : livePrayer.label}
              </NavAnchor>
            ) : null}
            {give ? (
              <NavAnchor link={give} className="site-button bg-gold px-4 text-ink">{give.label}</NavAnchor>
            ) : null}
          </nav>
          <button
            type="button"
            className="site-button mobile-only border border-sand/40 px-4 text-sm text-on-dark"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
        </div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-forest-950 px-6 py-8 text-on-dark min-[900px]:hidden">
          <div className="flex items-center justify-between">
            <BrandLockup size="sm" href="/" />
            <button type="button" className="site-button border border-sand/40 px-4" onClick={() => setOpen(false)}>Close</button>
          </div>
          <nav className="mt-10 flex flex-col gap-5 text-3xl font-display" aria-label="Mobile">
            {MAIN_NAV.map((link) => {
              const current = isCurrent(path, link.href);
              return (
                <NavAnchor key={link.href} link={link} current={current} onClick={() => setOpen(false)} className={current ? 'text-gold-light' : undefined}>
                  {link.label}
                </NavAnchor>
              );
            })}
            {livePrayer ? <NavAnchor link={livePrayer} onClick={() => setOpen(false)}>{livePrayer.label}</NavAnchor> : null}
            {give ? <NavAnchor link={give} onClick={() => setOpen(false)}>{give.label}</NavAnchor> : null}
          </nav>
        </div>
      ) : null}
      <main id="content">{children}</main>
      <footer className="bg-footer px-4 pb-24 pt-14 text-on-dark sm:px-6 min-[900px]:pb-14">
        <div className="mx-auto grid max-w-6xl gap-10 min-[900px]:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <BrandLockup size="lg" />
            <p className="brand-tagline">{BRAND.tagline}</p>
            <p className="mt-3 text-muted-dark">{church.address}</p>
            {serviceStrip.length ? <p className="mt-3 text-sm text-sand">{serviceStrip.join(' · ')}</p> : null}
            <p className="mt-3">
              {church.phones.map((phone) => (
                <a key={phone.href} href={phone.href} className="mr-3 block hover:text-gold-light sm:inline">{phone.label}</a>
              ))}
            </p>
            <a href={`mailto:${church.email}`} className="mt-2 inline-block hover:text-gold-light">{church.email}</a>
          </div>
          <FooterColumn title="Gather" links={footer.gather} />
          <FooterColumn title="Explore" links={footer.explore} />
          <FooterColumn title="Follow" links={footer.follow} />
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-white/10 pt-6 text-sm text-muted-dark min-[900px]:flex-row min-[900px]:justify-between">
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} {church.name}</span>
            <a href={staffLoginUrl} className="text-xs text-on-dark/40 hover:text-on-dark/70">Staff sign in</a>
          </p>
          <p>Times shown in East Africa Time.</p>
        </div>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-white/10 bg-forest-950 text-on-dark min-[900px]:hidden" aria-label="Quick actions">
        {sticky.map((link) => (
          <NavAnchor
            key={link.label}
            link={link}
            className={link.label === 'Give'
              ? 'min-h-14 bg-gold text-center text-sm font-semibold leading-[3.5rem] text-ink'
              : 'min-h-14 text-center text-sm font-semibold leading-[3.5rem]'}
          >
            {link.label === 'Live prayer' ? <LiveDot pulse={liveNow} /> : null} {link.label === 'Live prayer' && liveNow ? 'Live now' : link.label}
          </NavAnchor>
        ))}
      </nav>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-4 space-y-2 text-sand">
        {links.map((link) => (
          <li key={link.label}>
            <NavAnchor link={link} className="hover:text-gold-light">{link.label}</NavAnchor>
          </li>
        ))}
      </ul>
    </div>
  );
}
