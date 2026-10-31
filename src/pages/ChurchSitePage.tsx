import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, Clock, HandHeart, MapPin, Menu, Phone, PlayCircle, Radio, Users, X } from 'lucide-react';
import { StorehouseMark } from '../components/common/StorehouseLogo';
import { memberToken } from '../services/api/memberApi';
import { cn } from '../lib/utils';

/**
 * A church's public website, read live from the app. Content comes from /api/public/<slug>/…,
 * colors and words from Church setup, and forms write straight back into the staff app.
 */

const DEFAULT_SLUG = 'demo-church';
const INK = '#16251F';
const MUTED = '#3E5148';

interface ChurchProfile {
  name: string;
  slug: string;
  appName: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  joinPageMessage: string | null;
  theme: { primary: string; primaryDark: string; accent: string; accentSoft: string };
  terminology: Record<string, string>;
  features: Record<string, boolean>;
  memberSignIn?: boolean;
}
interface ServiceTime { id: string; name: string; weekday: string | null; startLabel: string; endLabel: string; place: string | null; note: string | null; showOnHome: boolean }
interface ChurchEvent { id: string; title: string; description: string; startsAt: string; endsAt: string; location: string; rsvpEnabled: boolean }
interface Sermon { id: string; title: string; speaker: string; scripture: string | null; seriesName: string | null; preachedOn: string; youtubeUrl: string | null }
interface Leader { id: string; name: string; role: string; bio: string | null; photoUrl: string | null }
interface Group { id: string; name: string; publicDescription: string | null; meetingTime: string | null }
interface Faq { id: string; question: string; answer: string }
interface Announcement { id: string; title: string; body: string }
interface Live { status: 'LIVE' | 'NEXT'; name: string | null; slug: string | null; startsAt: string | null }

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function postJson(path: string, body: unknown): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return { ok: true, message: '' };
    const fieldErrors = data?.details?.fieldErrors as Record<string, string> | undefined;
    return { ok: false, message: (fieldErrors && Object.values(fieldErrors)[0]) || data?.message || 'Something went wrong. Please try again.' };
  } catch {
    return { ok: false, message: 'Could not reach the church. Check your connection and try again.' };
  }
}

function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
}

function formatWhen(iso: string, timeZone: string) {
  const date = new Date(iso);
  const opts = (o: Intl.DateTimeFormatOptions) => {
    try {
      return date.toLocaleString(undefined, { ...o, timeZone });
    } catch {
      return date.toLocaleString(undefined, o);
    }
  };
  return {
    month: opts({ month: 'short' }).toUpperCase(),
    day: opts({ day: 'numeric' }),
    full: opts({ weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
  };
}

function titleCase(day: string | null) {
  return day ? day.charAt(0) + day.slice(1).toLowerCase() : '';
}

const fieldClass = 'w-full min-h-12 rounded-xl border border-[#CFD2CB] bg-white px-3.5 text-base text-[#16251F] placeholder:text-[#68736D] focus:outline-none focus:ring-2';
const labelClass = 'mb-1.5 block text-sm font-bold text-[#16251F]';

/** Visit or prayer card. Lands in the staff app under Visitors. */
function CardForm({
  slug,
  source,
  submitLabel,
  messageLabel,
  accent,
  primary,
  showService,
}: {
  slug: string;
  source: 'PLAN_A_VISIT' | 'PRAYER';
  submitLabel: string;
  messageLabel: string;
  accent: string;
  primary: string;
  showService?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const idBase = `card-${source.toLowerCase()}`;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState('sending');
    setError('');
    const result = await postJson(`/api/public/${slug}/visitor-cards`, {
      name: String(form.get('name') || ''),
      phone: String(form.get('phone') || ''),
      email: String(form.get('email') || ''),
      message: String(form.get('message') || ''),
      service: String(form.get('service') || ''),
      company: String(form.get('company') || ''),
      source,
    });
    if (result.ok) setState('sent');
    else {
      setState('idle');
      setError(result.message);
    }
  };

  if (state === 'sent') {
    return (
      <div role="status" className="rounded-2xl bg-white p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: `${accent}55` }}>
          <Check className="h-6 w-6" style={{ color: primary }} aria-hidden="true" />
        </span>
        <p className="mt-3 text-lg font-bold">{source === 'PRAYER' ? 'We’re praying with you.' : 'We’ll see you soon!'}</p>
        <p className="mt-1" style={{ color: MUTED }}>
          {source === 'PRAYER' ? 'Your request is with the prayer team.' : 'Someone from the church will reach out before Sunday.'}
        </p>
        <button type="button" onClick={() => setState('idle')} className="mt-4 min-h-11 cursor-pointer rounded-full px-4 font-bold underline" style={{ color: primary }}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6" style={{ ['--tw-ring-color' as string]: primary }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idBase}-name`} className={labelClass}>Your name</label>
          <input id={`${idBase}-name`} name="name" required maxLength={80} autoComplete="name" className={fieldClass} />
        </div>
        <div>
          <label htmlFor={`${idBase}-phone`} className={labelClass}>Phone</label>
          <input id={`${idBase}-phone`} name="phone" required minLength={7} maxLength={30} type="tel" autoComplete="tel" className={fieldClass} />
        </div>
      </div>
      {showService ? (
        <div>
          <label htmlFor={`${idBase}-service`} className={labelClass}>Which service?</label>
          <select id={`${idBase}-service`} name="service" className={fieldClass} defaultValue="">
            <option value="">Not sure yet</option>
            <option>9:00 a.m. Sunday</option>
            <option>11:30 a.m. Sunday</option>
            <option>Wednesday prayer</option>
          </select>
        </div>
      ) : null}
      <div>
        <label htmlFor={`${idBase}-message`} className={labelClass}>{messageLabel}</label>
        <textarea id={`${idBase}-message`} name="message" rows={4} maxLength={2000} className={cn(fieldClass, 'py-3')} />
      </div>
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {error ? <p role="alert" className="text-sm font-semibold text-[#8E2F2D]">{error}</p> : null}
      <button
        type="submit"
        disabled={state === 'sending'}
        className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full px-6 font-bold text-white disabled:opacity-60 sm:w-auto"
        style={{ background: primary }}
      >
        {state === 'sending' ? 'Sending…' : submitLabel}
      </button>
    </form>
  );
}

function RsvpForm({ slug, event, primary }: { slug: string; event: ChurchEvent; primary: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const [count, setCount] = useState(1);

  if (state === 'sent') {
    return (
      <p role="status" className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#E3EFE7] px-3 py-1.5 text-sm font-bold text-[#1F5A3E]">
        <Check className="h-4 w-4" aria-hidden="true" /> You’re on the list
      </p>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-full px-5 text-sm font-bold text-white" style={{ background: primary }}>
        RSVP
      </button>
    );
  }
  const submit = async (form: React.FormEvent<HTMLFormElement>) => {
    form.preventDefault();
    const data = new FormData(form.currentTarget);
    setState('sending');
    setError('');
    const result = await postJson(`/api/public/${slug}/events/${event.id}/rsvp`, {
      name: String(data.get('name') || ''),
      phone: String(data.get('phone') || ''),
      count,
      company: String(data.get('company') || ''),
    });
    if (result.ok) setState('sent');
    else {
      setState('idle');
      setError(result.message);
    }
  };
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl bg-[#F8F7F3] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`rsvp-${event.id}-name`} className={labelClass}>Name</label>
          <input id={`rsvp-${event.id}-name`} name="name" required maxLength={80} autoComplete="name" className={fieldClass} />
        </div>
        <div>
          <label htmlFor={`rsvp-${event.id}-phone`} className={labelClass}>Phone</label>
          <input id={`rsvp-${event.id}-phone`} name="phone" required minLength={7} maxLength={30} type="tel" autoComplete="tel" className={fieldClass} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#CFD2CB] bg-white px-3 py-1.5">
        <span className="text-sm font-bold">How many coming?</span>
        <span className="flex items-center gap-2">
          <button type="button" aria-label="Fewer" onClick={() => setCount((value) => Math.max(1, value - 1))} className="h-11 w-11 cursor-pointer rounded-lg border border-[#CFD2CB] text-lg">−</button>
          <span aria-live="polite" className="w-6 text-center font-bold">{count}</span>
          <button type="button" aria-label="More" onClick={() => setCount((value) => Math.min(20, value + 1))} className="h-11 w-11 cursor-pointer rounded-lg border border-[#CFD2CB] text-lg">+</button>
        </span>
      </div>
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {error ? <p role="alert" className="text-sm font-semibold text-[#8E2F2D]">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={state === 'sending'} className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-5 text-sm font-bold text-white disabled:opacity-60" style={{ background: primary }}>
          {state === 'sending' ? 'Sending…' : `RSVP for ${count}`}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 cursor-pointer rounded-full px-4 text-sm font-bold" style={{ color: MUTED }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export const ChurchSitePage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const slug = (import.meta.env.VITE_CHURCH_SLUG as string | undefined) || DEFAULT_SLUG;
  const [church, setChurch] = useState<ChurchProfile | null>(null);
  const [missing, setMissing] = useState(false);
  const [services, setServices] = useState<ServiceTime[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [live, setLive] = useState<Live | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = Boolean(memberToken());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let profile = await getJson<{ church: ChurchProfile }>(`/api/public/${slug}/church`);
      // The demo church is created on first use; wake it up once if it isn't there yet.
      if (!profile && slug === DEFAULT_SLUG) {
        const info = await getJson<{ enabled: boolean }>('/api/demo');
        if (info?.enabled) {
          await fetch('/api/demo/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ persona: 'volunteer' }) }).catch(() => null);
          profile = await getJson<{ church: ChurchProfile }>(`/api/public/${slug}/church`);
        }
      }
      if (cancelled) return;
      if (!profile) {
        setMissing(true);
        return;
      }
      const c = profile.church;
      setChurch(c);
      document.title = c.name;
      const f = c.features;
      const [st, ev, se, le, gr, fa, an, li] = await Promise.all([
        getJson<{ serviceTimes: ServiceTime[] }>(`/api/public/${slug}/service-times`),
        f.events ? getJson<{ events: ChurchEvent[] }>(`/api/public/${slug}/events`) : null,
        f.sermons ? getJson<{ sermons: Sermon[] }>(`/api/public/${slug}/sermons`) : null,
        f.website ? getJson<{ leaders: Leader[] }>(`/api/public/${slug}/leaders`) : null,
        f.members ? getJson<{ groups: Group[] }>(`/api/public/${slug}/groups`) : null,
        f.website ? getJson<{ faqs: Faq[] }>(`/api/public/${slug}/faqs`) : null,
        f.announcements ? getJson<{ announcements: Announcement[] }>(`/api/public/${slug}/announcements`) : null,
        f.prayerRooms ? getJson<Live>(`/api/public/${slug}/live`) : null,
      ]);
      if (cancelled) return;
      setServices(st?.serviceTimes ?? []);
      setEvents(ev?.events ?? []);
      setSermons(se?.sermons ?? []);
      setLeaders(le?.leaders ?? []);
      setGroups(gr?.groups ?? []);
      setFaqs(fa?.faqs ?? []);
      setAnnouncements(an?.announcements ?? []);
      setLive(li);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const theme = church?.theme ?? { primary: '#203C32', primaryDark: '#294D40', accent: '#C9A35A', accentSoft: '#E8D8B2' };
  const words = church?.terminology ?? {};
  const f = church?.features ?? {};

  const nav = useMemo(
    () =>
      [
        { href: '#visit', label: 'Visit' },
        f.events ? { href: '#events', label: 'Events' } : null,
        f.sermons ? { href: '#sermons', label: 'Sermons' } : null,
        f.members ? { href: '#ministries', label: words.smallGroups || 'Ministries' } : null,
        f.visitors ? { href: '#prayer', label: 'Prayer' } : null,
      ].filter(Boolean) as { href: string; label: string }[],
    [f.events, f.sermons, f.members, f.visitors, words.smallGroups]
  );

  if (missing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8F7F3] px-6 text-center" style={{ color: INK }}>
        <h1 className="font-display text-3xl">This church site isn’t set up yet.</h1>
        <a href="/storehouse" onClick={(event) => { event.preventDefault(); onNavigate('/storehouse'); }} className="min-h-11 font-bold underline">Back to Sanctum Storehouse</a>
      </div>
    );
  }
  if (!church) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F8F7F3] text-sm" style={{ color: MUTED }}>Loading…</div>;
  }

  const home = services.filter((item) => item.showOnHome);
  const joinPath = live?.slug ? `/join/${live.slug}` : null;
  const liveNow = live?.status === 'LIVE';
  const nextLabel = live?.startsAt ? formatWhen(live.startsAt, church.timezone).full : null;

  return (
    <div className="min-h-screen font-sans" style={{ background: '#F8F7F3', color: INK }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip to content</a>

      <div className="bg-[#16251F] px-4 py-2 text-center text-xs font-semibold text-[#F6F1E6]">
        Demo church website ·{' '}
        <a href="/storehouse" onClick={(event) => { event.preventDefault(); onNavigate('/storehouse'); }} className="underline">Sanctum Storehouse</a>
        {' '}· changes made in the staff app show up here
      </div>

      <header className="sticky top-0 z-40 text-white" style={{ background: theme.primary }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#main" className="flex min-w-0 items-center gap-3">
            {church.logoUrl ? (
              <img src={church.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{ background: theme.accent, color: INK }}>
                {initials(church.name)}
              </span>
            )}
            <span className="truncate font-display text-xl">{church.name}</span>
          </a>
          <nav aria-label="Main" className="hidden items-center gap-6 text-[15px] font-semibold md:flex">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="opacity-90 hover:opacity-100 hover:underline">{item.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {church.memberSignIn ? (
              <a
                href={signedIn ? '/my' : '/my/sign-in'}
                onClick={(event) => { event.preventDefault(); onNavigate(signedIn ? '/my' : '/my/sign-in'); }}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold"
                style={{ background: theme.accent, color: INK }}
              >
                <Users className="h-4 w-4" aria-hidden="true" /> <span className="sm:hidden">{signedIn ? 'My church' : 'Members'}</span><span className="hidden sm:inline">{signedIn ? 'My church' : 'Member sign in'}</span>
              </a>
            ) : null}
            {joinPath ? (
              <a href={joinPath} className="hidden min-h-11 items-center gap-2 rounded-full border border-white/40 px-4 text-sm font-bold sm:inline-flex">
                <span className={cn('h-2 w-2 rounded-full', liveNow ? 'bg-[#7FD69B]' : 'bg-white/70')} aria-hidden="true" />
                {liveNow ? 'Live now' : 'Live prayer'}
              </a>
            ) : null}
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/40 md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav aria-label="Mobile" className="border-t border-white/15 px-5 py-3 md:hidden">
            {[...nav, ...(joinPath ? [{ href: joinPath, label: liveNow ? 'Live prayer — live now' : 'Live prayer' }] : [])].map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="block min-h-11 py-2.5 text-lg font-semibold">{item.label}</a>
            ))}
          </nav>
        ) : null}
      </header>

      <main id="main">
        <section className="relative overflow-hidden text-white" style={{ background: theme.primary }}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(55% 60% at 90% 0%, ${theme.accent}40, transparent 70%), linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.25))` }} />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-14 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: theme.accentSoft }}>Welcome home</p>
              <h1 className="mt-4 font-display text-[clamp(2.6rem,6vw,4.4rem)] font-light leading-[1] tracking-[-0.03em]">
                There’s a place for you at {church.name}.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/85">
                Worship with us on Sunday, pray with us during the week, and find people to walk with.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#visit" className="inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-bold" style={{ background: theme.accent, color: INK }}>
                  Plan your visit <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                {church.memberSignIn ? (
                  <a href={signedIn ? '/my' : '/my/sign-in'} onClick={(event) => { event.preventDefault(); onNavigate(signedIn ? '/my' : '/my/sign-in'); }} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/40 px-6 font-bold">
                    {signedIn ? 'Go to My church' : 'Members: sign in'}
                  </a>
                ) : null}
                {f.sermons && sermons[0] ? (
                  <a href="#sermons" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/40 px-6 font-bold">Latest message</a>
                ) : null}
              </div>
            </div>

            <aside aria-label="This week" className="rounded-[26px] border border-white/20 bg-black/20 p-6 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: theme.accentSoft }}>This week</p>
              {joinPath ? (
                <div className="mt-4 rounded-2xl bg-white/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <Radio className="h-4 w-4" aria-hidden="true" /> {liveNow ? 'Praying now' : 'Next live prayer'}
                  </p>
                  <p className="mt-1 font-display text-2xl">{live?.name}</p>
                  {!liveNow && nextLabel ? <p className="text-sm text-white/80">{nextLabel}</p> : null}
                  <a href={joinPath} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold" style={{ background: theme.accent, color: INK }}>
                    Join from your phone
                  </a>
                </div>
              ) : null}
              <ul className="mt-3 divide-y divide-white/15">
                {home.map((item) => (
                  <li key={item.id} className="flex gap-4 py-3">
                    <span className="w-12 shrink-0 pt-0.5 text-xs font-bold uppercase tracking-wider" style={{ color: theme.accentSoft }}>{titleCase(item.weekday).slice(0, 3)}</span>
                    <span>
                      <span className="block font-semibold">{item.name}</span>
                      <span className="block text-sm text-white/75">{item.startLabel}{item.place ? ` · ${item.place}` : ''}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        {announcements[0] ? (
          <p className="px-5 py-4 text-center font-semibold" style={{ background: theme.accentSoft }}>
            <span className="mr-2 font-bold uppercase tracking-wider text-xs">Announcement</span>
            {announcements[0].title}
          </p>
        ) : null}

        <section id="visit" className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: MUTED }}>Plan your visit</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight">We saved you a seat.</h2>
            <ul className="mt-6 space-y-4">
              {services.map((item) => (
                <li key={item.id} className="flex gap-4 rounded-2xl border border-[#E5E6E1] bg-white p-4">
                  <Clock className="mt-1 h-5 w-5 shrink-0" style={{ color: theme.primary }} aria-hidden="true" />
                  <span>
                    <span className="block font-bold">{item.name} · {titleCase(item.weekday)} {item.startLabel}</span>
                    {item.place ? <span className="block text-sm" style={{ color: MUTED }}>{item.place}</span> : null}
                    {item.note ? <span className="block text-sm" style={{ color: MUTED }}>{item.note}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            {church.phone ? (
              <p className="mt-6 flex items-center gap-2 font-semibold"><Phone className="h-4 w-4" aria-hidden="true" /> <a href={`tel:${church.phone.replace(/\s/g, '')}`} className="underline">{church.phone}</a></p>
            ) : null}
          </div>
          <div className="rounded-[26px] p-2" style={{ background: theme.accentSoft }}>
            {f.visitors ? (
              <CardForm slug={slug} source="PLAN_A_VISIT" submitLabel="Let us know you’re coming" messageLabel="Anything we should know? (optional)" accent={theme.accent} primary={theme.primary} showService />
            ) : (
              <p className="rounded-2xl bg-white p-6">Just come along — someone will be glad to welcome you.</p>
            )}
          </div>
        </section>

        {f.events && events.length ? (
          <section id="events" className="bg-white">
            <div className="mx-auto max-w-6xl px-5 py-20">
              <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: MUTED }}>Coming up</p>
              <h2 className="mt-3 font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight">Events</h2>
              <ul className="mt-8 grid gap-4 md:grid-cols-2">
                {events.map((event) => {
                  const when = formatWhen(event.startsAt, church.timezone);
                  return (
                    <li key={event.id} className="flex gap-4 rounded-2xl border border-[#E5E6E1] p-5">
                      <span className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl" style={{ background: theme.accentSoft }}>
                        <span className="text-[11px] font-bold">{when.month}</span>
                        <span className="font-display text-2xl leading-none">{when.day}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold">{event.title}</h3>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm" style={{ color: MUTED }}><CalendarDays className="h-4 w-4" aria-hidden="true" /> {when.full}</p>
                        <p className="flex items-center gap-1.5 text-sm" style={{ color: MUTED }}><MapPin className="h-4 w-4" aria-hidden="true" /> {event.location}</p>
                        {event.rsvpEnabled ? <RsvpForm slug={slug} event={event} primary={theme.primary} /> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

        {f.sermons && sermons.length ? (
          <section id="sermons" className="mx-auto max-w-6xl px-5 py-20">
            <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: MUTED }}>Messages</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight">Recent sermons</h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {sermons.slice(0, 3).map((sermon, index) => (
                <li key={sermon.id} className="flex flex-col rounded-2xl border border-[#E5E6E1] bg-white p-5">
                  <span className="flex aspect-video items-center justify-center rounded-xl text-white" style={{ background: index === 0 ? theme.primary : theme.primaryDark }}>
                    <PlayCircle className="h-10 w-10 opacity-90" aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wider" style={{ color: MUTED }}>{sermon.seriesName || 'Sunday message'}</p>
                  <h3 className="mt-1 text-lg font-bold">{sermon.title}</h3>
                  <p className="text-sm" style={{ color: MUTED }}>{sermon.speaker}{sermon.scripture ? ` · ${sermon.scripture}` : ''}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {f.members && groups.length ? (
          <section id="ministries" className="text-white" style={{ background: theme.primaryDark }}>
            <div className="mx-auto max-w-6xl px-5 py-20">
              <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: theme.accentSoft }}>Find your people</p>
              <h2 className="mt-3 font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight">{words.smallGroups || 'Ministries'}</h2>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {groups.map((group) => (
                  <li key={group.id} className="rounded-2xl bg-white/10 p-5">
                    <Users className="h-5 w-5" style={{ color: theme.accentSoft }} aria-hidden="true" />
                    <h3 className="mt-3 text-lg font-bold">{group.name}</h3>
                    {group.publicDescription ? <p className="mt-1 text-sm text-white/80">{group.publicDescription}</p> : null}
                    {group.meetingTime ? <p className="mt-2 text-sm font-semibold" style={{ color: theme.accentSoft }}>{group.meetingTime}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {f.website && leaders.length ? (
          <section className="mx-auto max-w-6xl px-5 py-20">
            <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: MUTED }}>Leadership</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight">Meet the team</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {leaders.map((leader) => (
                <li key={leader.id} className="rounded-2xl border border-[#E5E6E1] bg-white p-5">
                  {leader.photoUrl ? (
                    <img src={leader.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold" style={{ background: theme.accentSoft }}>{initials(leader.name)}</span>
                  )}
                  <h3 className="mt-3 font-bold">{leader.name}</h3>
                  <p className="text-sm font-semibold" style={{ color: theme.primary }}>{leader.role}</p>
                  {leader.bio ? <p className="mt-2 text-sm" style={{ color: MUTED }}>{leader.bio}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {f.visitors ? (
          <section id="prayer" style={{ background: theme.accentSoft }}>
            <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <HandHeart className="h-8 w-8" style={{ color: theme.primary }} aria-hidden="true" />
                <h2 className="mt-4 font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight">Need prayer? Tell us.</h2>
                <p className="mt-4 text-lg" style={{ color: MUTED }}>The prayer team reads every request. Share as much or as little as you like.</p>
                {joinPath ? (
                  <a href={joinPath} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-bold text-white" style={{ background: theme.primary }}>
                    <Radio className="h-4 w-4" aria-hidden="true" /> Pray with us live
                  </a>
                ) : null}
              </div>
              <CardForm slug={slug} source="PRAYER" submitLabel="Send to the prayer team" messageLabel="What can we pray for?" accent={theme.accent} primary={theme.primary} />
            </div>
          </section>
        ) : null}

        {f.website && faqs.length ? (
          <section className="mx-auto max-w-3xl px-5 py-20">
            <h2 className="font-display text-[clamp(2rem,4vw,2.8rem)] leading-tight">Questions</h2>
            <div className="mt-6 divide-y divide-[#E5E6E1] rounded-2xl border border-[#E5E6E1] bg-white">
              {faqs.map((faq) => (
                <details key={faq.id} className="group p-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-bold">
                    {faq.question}
                    <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2" style={{ color: MUTED }}>{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="text-white" style={{ background: theme.primary }}>
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl">{church.name}</p>
            {church.phone ? <p className="mt-2 text-white/80">{church.phone}</p> : null}
            {church.email ? <p className="text-white/80">{church.email}</p> : null}
          </div>
          <nav aria-label="Footer" className="space-y-2">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="block min-h-8 text-white/85 hover:underline">{item.label}</a>
            ))}
          </nav>
          <div className="space-y-3 text-sm">
            <a href="/login" onClick={(event) => { event.preventDefault(); onNavigate('/login'); }} className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-4 font-bold">
              Staff sign in
            </a>
            <a href="/storehouse" onClick={(event) => { event.preventDefault(); onNavigate('/storehouse'); }} className="flex items-center gap-2 text-white/80 hover:underline">
              <StorehouseMark className="h-6 w-6" tone="light" /> Powered by Sanctum Storehouse
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
