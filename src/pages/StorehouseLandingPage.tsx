import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Calendar,
  Check,
  Church,
  Coins,
  Globe,
  HandHeart,
  Images,
  Lock,
  Mail,
  Palette,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Users,
} from 'lucide-react';
import { StorehouseLogo, StorehouseMark } from '../components/common/StorehouseLogo';
import { BRAND_THEMES } from '../../shared/churchSetup.ts';
import { cn } from '../lib/utils';

const INK = '#16251F';
const MUTED = '#3E5148';
const CREAM = '#F8F7F3';
const GOLD_TEXT = '#7A5A22';

const READY = [
  { icon: Users, title: 'Members & households', body: 'Families, groups and ministries, with phone-first records and spreadsheet import.' },
  { icon: Mail, title: 'Visitors & follow-ups', body: 'Plan-a-visit and prayer cards from your website land straight in the office queue.' },
  { icon: Calendar, title: 'Events & RSVPs', body: 'Publish an event once. People RSVP on your website and staff see the list.' },
  { icon: Radio, title: 'Live prayer rooms', body: 'Anyone joins from a link with just their name. No app, no account.' },
  { icon: HandHeart, title: 'Prayer requests', body: 'Requests from the room reach the prayer team, with private ones kept private.' },
  { icon: BookOpen, title: 'Sermons', body: 'Messages pulled from your YouTube channel, titled and ready to share.' },
  { icon: Images, title: 'Gallery', body: 'Albums with photo consent and a publish step before anything goes public.' },
  { icon: Bell, title: 'Announcements', body: 'News that appears on your website and in the app, and expires on its own.' },
  { icon: Globe, title: 'Church website', body: 'Pages, leaders and visit questions, edited by your staff, shown on your site.' },
];

const SOON = ['Online giving — mobile money & card', 'Cash counting with two signatures', 'Kids check-in with pickup codes', 'Birthday & anniversary greetings', 'Expenses & budgets', 'Attendance'];

const ROLES: { name: string; levels: number[] }[] = [
  { name: 'Super Admin', levels: [3, 3, 3, 3] },
  { name: 'Pastor', levels: [3, 3, 3, 3] },
  { name: 'Secretary', levels: [2, 1, 2, 1] },
  { name: 'Finance', levels: [1, 3, 1, 0] },
  { name: 'Volunteer', levels: [0, 0, 1, 0] },
];
const ROLE_AREAS = ['People', 'Giving', 'Events', 'Prayer'];
const LEVELS = ['None', 'View', 'Edit', 'Approve'];

const SWITCHES = [
  { label: 'Members & households', on: true },
  { label: 'Events & RSVPs', on: true },
  { label: 'Live prayer rooms', on: true },
  { label: 'Gallery', on: false },
];

function Toggle({ on, onClick, label, color }: { on: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors"
      style={{ background: on ? color : '#CFD2CB', justifyContent: on ? 'flex-end' : 'flex-start' }}
    >
      <span className="h-6 w-6 rounded-full bg-white shadow" />
    </button>
  );
}

/** The hero's working miniature: pick a theme and flip switches, like Church setup does. */
function LiveMiniature() {
  const [themeIndex, setThemeIndex] = useState(0);
  const [switches, setSwitches] = useState(SWITCHES.map((item) => item.on));
  const theme = BRAND_THEMES[themeIndex];
  const menu = ['Overview', ...SWITCHES.filter((_, index) => switches[index]).map((item) => item.label.split(' ')[0].replace('&', ''))];

  return (
    <div className="rounded-[28px] border border-[#E5E6E1] bg-white p-3 shadow-[0_30px_80px_rgba(22,37,31,0.16)]">
      <div className="overflow-hidden rounded-[20px] border border-[#E5E6E1]">
        <div className="flex items-center gap-2 px-4 py-3 text-white transition-colors" style={{ background: theme.primary }}>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold" style={{ background: theme.accent, color: INK }}>
            GF
          </span>
          <span className="font-display text-base">Grace Fellowship</span>
          <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">Church setup</span>
        </div>
        <div className="grid grid-cols-[120px_1fr] bg-[#F8F7F3] sm:grid-cols-[140px_1fr]">
          <nav aria-label="Preview menu" className="space-y-1 border-r border-[#E5E6E1] p-2.5 transition-colors" style={{ background: theme.primary }}>
            {menu.map((item, index) => (
              <span
                key={item}
                className="block truncate rounded-lg px-2 py-1.5 text-xs font-semibold"
                style={index === 0 ? { background: theme.accent, color: INK } : { color: '#F6F1E6' }}
              >
                {item}
              </span>
            ))}
          </nav>
          <div className="space-y-3 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>
              Features
            </p>
            <ul className="space-y-2.5">
              {SWITCHES.map((item, index) => (
                <li key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E6E1] bg-white px-3 py-2">
                  <span className="text-sm font-semibold" style={{ color: INK }}>
                    {item.label}
                  </span>
                  <Toggle
                    on={switches[index]}
                    label={item.label}
                    color={theme.primary}
                    onClick={() => setSwitches((prev) => prev.map((value, i) => (i === index ? !value : value)))}
                  />
                </li>
              ))}
            </ul>
            <p className="pt-1 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: MUTED }}>
              Colors
            </p>
            <div className="flex flex-wrap gap-2">
              {BRAND_THEMES.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={index === themeIndex}
                  aria-label={item.name}
                  onClick={() => setThemeIndex(index)}
                  className={cn('flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-2', index === themeIndex ? 'border-[#16251F]' : 'border-transparent')}
                >
                  <span className="flex overflow-hidden rounded-lg">
                    <span className="h-7 w-3.5" style={{ background: item.primary }} />
                    <span className="h-7 w-3.5" style={{ background: item.accent }} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="px-2 pt-3 text-center text-xs" style={{ color: MUTED }}>
        Try it — this little preview works like the real Church setup.
      </p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: GOLD_TEXT }}>
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.02em]" style={{ color: INK }}>
        {title}
      </h2>
      {body ? (
        <p className="mt-4 text-lg leading-relaxed" style={{ color: MUTED }}>
          {body}
        </p>
      ) : null}
    </div>
  );
}

export const StorehouseLandingPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = 'Sanctum Storehouse — your whole church, in one place';
  }, []);

  const go = (path: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    onNavigate(path);
  };

  const primaryButton =
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#16251F] px-6 text-[15px] font-bold text-[#F8F7F3] transition-transform hover:-translate-y-0.5';
  const secondaryButton =
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#16251F]/25 bg-white px-6 text-[15px] font-bold text-[#16251F] transition-transform hover:-translate-y-0.5';

  return (
    <div className="min-h-screen font-sans" style={{ background: CREAM, color: INK }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-[#E5E6E1]/80 bg-[#F8F7F3]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="/storehouse" onClick={go('/storehouse')} aria-label="Sanctum Storehouse home">
            <StorehouseLogo />
          </a>
          <nav aria-label="Main" className="hidden items-center gap-7 text-[15px] font-semibold md:flex" style={{ color: MUTED }}>
            <a href="#features" className="hover:text-[#16251F]">Features</a>
            <a href="#setup" className="hover:text-[#16251F]">Church setup</a>
            <a href="#roles" className="hover:text-[#16251F]">Roles</a>
            <a href="#connected" className="hover:text-[#16251F]">Website</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="/login" onClick={go('/login')} className="hidden min-h-11 items-center rounded-full px-4 text-[15px] font-bold sm:inline-flex">
              Sign in
            </a>
            <a href="/login" onClick={go('/login')} className={cn(primaryButton, 'min-h-11 px-5 text-sm')}>
              Try the demo
            </a>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(60% 50% at 85% 10%, rgba(201,163,90,0.22), transparent 70%), radial-gradient(40% 40% at 0% 100%, rgba(32,60,50,0.10), transparent 70%)' }}
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 md:pt-20 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#C9A35A]/50 bg-white/70 px-3 py-1 text-xs font-bold" style={{ color: GOLD_TEXT }}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#C9A35A]" /> Built for churches, run by your staff
              </p>
              <h1 className="mt-6 font-display text-[clamp(2.6rem,6vw,4.6rem)] font-light leading-[0.98] tracking-[-0.03em]">
                Your whole church, <em className="italic" style={{ color: '#203C32' }}>in one place.</em>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: MUTED }}>
                Members, events, live prayer and your website — switched on as your church needs them, in your church’s name and colors, with
                every staff member seeing only their part.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/login" onClick={go('/login')} className={primaryButton}>
                  Try the live demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a href="/" onClick={go('/')} className={secondaryButton}>
                  See a church website
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold" style={{ color: MUTED }}>
                {['No app to install', 'Works on any phone', 'Your name, your colors'].map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-[#203C32]" aria-hidden="true" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <LiveMiniature />
          </div>
        </section>

        {/* Three promises */}
        <section id="setup" className="border-y border-[#E5E6E1] bg-white">
          <div className="mx-auto grid max-w-6xl gap-px bg-[#E5E6E1] md:grid-cols-3">
            {[
              { icon: SlidersHorizontal, title: 'Switch on what you need', body: 'Start with members and events. Add prayer rooms or the gallery when you’re ready. Turning something off hides it — it never deletes it.' },
              { icon: Palette, title: 'Make it yours', body: 'Your church name, app name, logo and colors, plus the words you actually use — “Tithe” or “Seed”, “Groups” or “Cells”.' },
              { icon: ShieldCheck, title: 'Everyone sees their part', body: 'Each role is a set of View, Edit and Approve levels. A volunteer sees events, not finances. Only your admins can change setup.' },
            ].map((item) => (
              <div key={item.title} className="bg-white p-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F1EADA]">
                  <item.icon className="h-5 w-5 text-[#203C32]" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
                <p className="mt-2 leading-relaxed" style={{ color: MUTED }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-5 py-24">
          <SectionTitle
            eyebrow="What’s inside"
            title="Everything the office needs, and nothing it doesn’t."
            body="Every part below can be switched on or off by your church. Things that rely on each other switch together, so nothing is left half on."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {READY.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[#E5E6E1] bg-white p-6">
                <item.icon className="h-6 w-6 text-[#203C32]" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                <p className="mt-1.5 leading-relaxed" style={{ color: MUTED }}>
                  {item.body}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-[#C9A35A] bg-[#FBF6EA] p-6">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-[#7A5A22]" aria-hidden="true" />
              <h3 className="font-bold">Coming next</h3>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {SOON.map((item) => (
                <li key={item} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold" style={{ color: INK }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="bg-[#12231C] text-[#F6F1E6]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#E4C98F]">Roles & access</p>
              <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.02em]">
                Give every person exactly the access they need.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[#D5CBB8]">
                Start with ten ready-made roles — Super Admin, Developer, Pastor, Admin, Finance, Secretary, Moderator, Media, Ministry Leader,
                Volunteer — or create your own, like Usher.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  'Only your Super Admin and Developer can change church setup.',
                  'People can only change roles ranked below their own.',
                  'Nobody can change their own role.',
                  'Your church always keeps at least one Super Admin.',
                  'Every change is written to the activity log.',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#E4C98F]" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#1A3328] p-2">
              <table className="w-full min-w-[440px] border-collapse text-sm">
                <caption className="sr-only">Example role access levels</caption>
                <thead>
                  <tr className="text-left text-xs text-[#D5CBB8]">
                    <th scope="col" className="px-3 py-3 font-semibold">Role</th>
                    {ROLE_AREAS.map((area) => (
                      <th key={area} scope="col" className="px-3 py-3 font-semibold">{area}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((role) => (
                    <tr key={role.name} className="border-t border-white/10">
                      <th scope="row" className="px-3 py-3 text-left font-bold">{role.name}</th>
                      {role.levels.map((level, index) => (
                        <td key={ROLE_AREAS[index]} className="px-3 py-3">
                          <span
                            className={cn(
                              'inline-block rounded-full px-2.5 py-1 text-xs font-bold',
                              level === 0 ? 'bg-white/5 text-[#B9B09C]' : level === 3 ? 'bg-[#C9A35A] text-[#16251F]' : 'bg-white/12 text-[#F6F1E6]'
                            )}
                          >
                            {LEVELS[level]}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Connected */}
        <section id="connected" className="mx-auto max-w-6xl px-5 py-24">
          <SectionTitle
            eyebrow="One church, three doors"
            title="Your website, your staff app and live prayer — all connected."
            body="Visitors use your website. Everyone prays in the live rooms. Staff run the church from the Storehouse. A member, an RSVP or a prayer request exists once."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { icon: Globe, title: 'Church website', body: 'Service times, events, sermons and leaders come straight from the app. Visit and prayer cards go straight back.', cta: 'See the demo church site', path: '/' },
              { icon: Church, title: 'Sanctum Storehouse', body: 'The staff app: people, events, prayer, media and Church setup, shaped by each person’s role.', cta: 'Try the staff app', path: '/login' },
              { icon: Smartphone, title: 'Live prayer rooms', body: 'One link, any phone. People type their name and join. Leaders run the room from the control panel.', cta: 'Join a sample room', path: '/join/grace-midweek-prayer' },
            ].map((item) => (
              <article key={item.title} className="flex flex-col rounded-2xl border border-[#E5E6E1] bg-white p-6">
                <item.icon className="h-6 w-6 text-[#203C32]" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                <p className="mt-1.5 flex-1 leading-relaxed" style={{ color: MUTED }}>
                  {item.body}
                </p>
                <a href={item.path} onClick={go(item.path)} className="mt-5 inline-flex min-h-11 items-center gap-1.5 font-bold text-[#203C32] hover:underline">
                  {item.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-24">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-[32px] bg-[#203C32] px-8 py-14 text-[#F8F7F3] md:flex-row md:items-center md:justify-between md:px-14">
            <div className="max-w-xl">
              <h2 className="font-display text-[clamp(1.9rem,3.5vw,2.8rem)] leading-[1.05]">Try it as a pastor, a secretary or a volunteer.</h2>
              <p className="mt-3 text-[#D5CBB8]">The demo church is fully working. Pick a role, change the colors, turn features off — then reset it with one tap.</p>
            </div>
            <a
              href="/login"
              onClick={go('/login')}
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-[#C9A35A] px-6 text-[15px] font-bold text-[#16251F] transition-transform hover:-translate-y-0.5"
            >
              Open the demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E5E6E1] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ color: MUTED }}>
          <span className="inline-flex items-center gap-2">
            <StorehouseMark className="h-7 w-7" /> Sanctum Storehouse
          </span>
          <nav aria-label="Footer" className="flex flex-wrap gap-5 font-semibold">
            <a href="/" onClick={go('/')} className="hover:text-[#16251F]">Demo church site</a>
            <a href="/login" onClick={go('/login')} className="hover:text-[#16251F]">Staff sign in</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};
