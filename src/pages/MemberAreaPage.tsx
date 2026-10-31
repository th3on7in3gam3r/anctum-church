import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, HandHeart, Home, LogOut, MapPin, Radio, User, Users } from 'lucide-react';
import { demoApi, type DemoInfo } from '../services/api/setupApi';
import { MemberApiError, memberApi, memberToken, setMemberToken, type MemberHome } from '../services/api/memberApi';
import { cn } from '../lib/utils';

const INK = '#16251F';
const MUTED = '#3E5148';
const fieldClass = 'w-full min-h-12 rounded-xl border border-[#CFD2CB] bg-white px-3.5 text-base text-[#16251F] focus:outline-none focus:ring-2 focus:ring-[#16251F]/40';
const labelClass = 'mb-1.5 block text-sm font-bold text-[#16251F]';

function linkTo(onNavigate: (path: string) => void, path: string) {
  return (event: React.MouseEvent) => {
    event.preventDefault();
    onNavigate(path);
  };
}

function initials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
}

function when(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  try {
    return new Date(iso).toLocaleString(undefined, { ...options, timeZone });
  } catch {
    return new Date(iso).toLocaleString(undefined, options);
  }
}

/** Remember the member's name so the prayer room fills it in, then open the room. */
function joinRoom(slug: string, name: string) {
  try {
    localStorage.setItem('sanctum_last_attendee_name', name);
  } catch {
    // ignore
  }
  window.location.assign(`/join/${slug}`);
}

// ---------------------------------------------------------------- sign in

export const MemberSignInPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [info, setInfo] = useState<DemoInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Member sign in';
    if (memberToken()) {
      onNavigate('/my');
      return;
    }
    demoApi.info().then(setInfo).catch(() => setInfo({ enabled: false, personas: [] }));
  }, [onNavigate]);

  const signIn = async (key: string) => {
    setBusy(key);
    setError('');
    try {
      setMemberToken(await demoApi.login(key));
      onNavigate('/my');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F7F3] px-4 py-12" style={{ color: INK }}>
      <main className="w-full max-w-md rounded-[26px] border border-[#E5E6E1] bg-white p-7 shadow-[0_24px_70px_rgba(22,37,31,0.10)]">
        <p className="text-center text-xs font-bold uppercase tracking-[0.22em]" style={{ color: MUTED }}>Members</p>
        <h1 className="mt-2 text-center font-display text-3xl">Sign in to your church</h1>
        {!info ? (
          <p className="mt-6 text-center text-sm" style={{ color: MUTED }}>Loading…</p>
        ) : info.enabled && info.members?.length ? (
          <>
            <p className="mt-4 rounded-xl bg-[#F1EADA] px-3 py-2 text-center text-sm font-semibold">
              Demo: pick a church member. Real members sign in with a code sent to their phone.
            </p>
            <ul className="mt-4 space-y-2">
              {info.members.map((member) => (
                <li key={member.key}>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void signIn(member.key)}
                    className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-2xl border border-[#E5E6E1] px-4 py-3 text-left hover:border-[#16251F] disabled:opacity-60"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F1EADA] font-bold">{initials(member.name)}</span>
                    <span className="min-w-0">
                      <span className="block font-bold">{busy === member.key ? 'Signing in…' : member.name}</span>
                      <span className="block text-sm" style={{ color: MUTED }}>{member.description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-6 text-center" style={{ color: MUTED }}>Member sign-in isn’t open yet. Ask your church office.</p>
        )}
        {error ? <p role="alert" className="mt-3 text-center text-sm font-semibold text-[#8E2F2D]">{error}</p> : null}
        <p className="mt-6 text-center text-sm">
          <a href="/" onClick={linkTo(onNavigate, '/')} className="inline-flex min-h-11 items-center gap-1.5 font-bold underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the church website
          </a>
        </p>
        <p className="text-center text-xs" style={{ color: MUTED }}>
          Church staff?{' '}
          <a href="/login" onClick={linkTo(onNavigate, '/login')} className="font-bold underline">Staff sign in</a>
        </p>
      </main>
    </div>
  );
};

// ---------------------------------------------------------------- member home

function Card({ icon: Icon, title, children, id }: { icon: typeof User; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="rounded-[22px] border border-[#E5E6E1] bg-white p-5 sm:p-6">
      <h2 id={id ? `${id}-title` : undefined} className="flex items-center gap-2 text-lg font-bold">
        <Icon className="h-5 w-5" aria-hidden="true" /> {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RsvpControl({ event, primary, onSaved }: { event: MemberHome['events'][number]; primary: string; onSaved: () => void }) {
  const [count, setCount] = useState(event.myRsvp || 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!event.rsvpEnabled) return null;
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await memberApi.rsvp(event.id, count);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 space-y-2">
      {event.myRsvp ? (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-[#E3EFE7] px-3 py-1 text-sm font-bold text-[#1F5A3E]">
          <Check className="h-4 w-4" aria-hidden="true" /> You’re going · {event.myRsvp} {event.myRsvp === 1 ? 'seat' : 'seats'}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-xl border border-[#CFD2CB] px-1.5 py-1">
          <button type="button" aria-label="Fewer seats" onClick={() => setCount((value) => Math.max(1, value - 1))} className="h-10 w-10 cursor-pointer rounded-lg text-lg">−</button>
          <span aria-live="polite" className="w-6 text-center font-bold">{count}</span>
          <button type="button" aria-label="More seats" onClick={() => setCount((value) => Math.min(20, value + 1))} className="h-10 w-10 cursor-pointer rounded-lg text-lg">+</button>
        </span>
        <button type="button" disabled={busy || count === event.myRsvp} onClick={() => void save()} className="min-h-11 cursor-pointer rounded-full px-5 text-sm font-bold text-white disabled:opacity-50" style={{ background: primary }}>
          {busy ? 'Saving…' : event.myRsvp ? 'Update RSVP' : `RSVP for ${count}`}
        </button>
      </div>
      {error ? <p role="alert" className="text-sm font-semibold text-[#8E2F2D]">{error}</p> : null}
    </div>
  );
}

export const MemberAreaPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [home, setHome] = useState<MemberHome | null>(null);
  const [error, setError] = useState('');
  const [live, setLive] = useState<{ status: 'LIVE' | 'NEXT'; name: string | null; slug: string | null; startsAt: string | null } | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!memberToken()) {
      onNavigate('/my/sign-in');
      return;
    }
    try {
      const data = await memberApi.me();
      setHome(data);
      document.title = `My church · ${data.church.name}`;
      if (data.pages.livePrayer) {
        const response = await fetch(`/api/public/${data.church.slug}/live`);
        setLive(response.ok ? await response.json() : null);
      }
    } catch (err) {
      if (err instanceof MemberApiError && err.status === 403 && /Sign in|not linked/.test(err.message)) {
        setMemberToken(null);
        onNavigate('/my/sign-in');
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not load your page.');
    }
  }, [onNavigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const signOut = () => {
    setMemberToken(null);
    onNavigate('/');
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8F7F3] px-6 text-center" style={{ color: INK }}>
        <p className="text-lg font-bold">{error}</p>
        <button type="button" onClick={signOut} className="min-h-11 cursor-pointer font-bold underline">Back to the church website</button>
      </div>
    );
  }
  if (!home) return <div className="flex min-h-screen items-center justify-center bg-[#F8F7F3] text-sm" style={{ color: MUTED }}>Loading your page…</div>;

  const { church, pages, member } = home;
  const theme = church.theme;
  const fullName = `${member.firstName} ${member.lastName}`;
  const nothingOn = !Object.values(pages).some(Boolean);
  const groupWord = church.terminology.smallGroups || 'Groups';

  return (
    <div className="min-h-screen font-sans" style={{ background: '#F8F7F3', color: INK }}>
      <header className="text-white" style={{ background: theme.primary }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3.5">
          <a href="/" onClick={linkTo(onNavigate, '/')} className="flex min-w-0 items-center gap-3">
            {church.logoUrl ? (
              <img src={church.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{ background: theme.accent, color: INK }}>{initials(church.name)}</span>
            )}
            <span className="min-w-0">
              <span className="block truncate font-display text-lg leading-tight">{church.name}</span>
              <span className="block text-xs text-white/75">My church</span>
            </span>
          </a>
          <button type="button" onClick={signOut} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-white/40 px-4 text-sm font-bold">
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </div>
        <div className="mx-auto max-w-5xl px-5 pb-8 pt-4">
          <p className="text-sm text-white/80">Welcome back,</p>
          <h1 className="font-display text-[clamp(2rem,5vw,2.8rem)] leading-tight">{member.firstName}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
        <div aria-live="polite">{notice ? <p className="rounded-xl bg-[#E3EFE7] px-4 py-2.5 font-semibold text-[#1F5A3E]">{notice}</p> : null}</div>

        {nothingOn ? (
          <p className="rounded-2xl border border-[#E5E6E1] bg-white p-6">Your church hasn’t turned on any member pages yet.</p>
        ) : null}

        {pages.livePrayer && live?.slug ? (
          <section className="flex flex-col gap-4 rounded-[22px] p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6" style={{ background: theme.primaryDark }}>
            <div>
              <p className="flex items-center gap-2 text-sm font-bold" style={{ color: theme.accentSoft }}>
                <Radio className="h-4 w-4" aria-hidden="true" /> {live.status === 'LIVE' ? 'Praying now' : 'Next live prayer'}
              </p>
              <p className="mt-1 font-display text-2xl">{live.name}</p>
              {live.status !== 'LIVE' && live.startsAt ? (
                <p className="text-sm text-white/80">{when(live.startsAt, church.timezone, { weekday: 'long', hour: 'numeric', minute: '2-digit' })}</p>
              ) : null}
            </div>
            <button type="button" onClick={() => joinRoom(live.slug!, fullName)} className="min-h-12 cursor-pointer rounded-full px-6 font-bold" style={{ background: theme.accent, color: INK }}>
              {live.status === 'LIVE' ? 'Join now' : 'Open the prayer room'}
            </button>
          </section>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {pages.groups ? (
            <Card icon={Users} title={`My ${groupWord.toLowerCase()}`} id="groups">
              {home.groups.length === 0 ? (
                <p style={{ color: MUTED }}>You’re not in a group yet. Ask the church office to add you.</p>
              ) : (
                <ul className="space-y-3">
                  {home.groups.map((group) => (
                    <li key={group.id} className="rounded-2xl border border-[#E5E6E1] p-4">
                      <p className="flex flex-wrap items-center gap-2 font-bold">
                        {group.name}
                        {group.role === 'LEADER' ? <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: theme.accentSoft }}>Leader</span> : null}
                      </p>
                      {group.meetingTime ? <p className="text-sm" style={{ color: MUTED }}>{group.meetingTime}</p> : null}
                      {group.huddle ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => joinRoom(group.huddle!.slug, fullName)}
                            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-bold text-white"
                            style={{ background: theme.primary }}
                          >
                            <Radio className="h-4 w-4" aria-hidden="true" /> {group.huddle.status === 'LIVE' ? 'Join live huddle' : 'Open huddle'}
                          </button>
                          {group.huddle.status !== 'LIVE' && group.huddle.nextStartsAt ? (
                            <span className="text-sm" style={{ color: MUTED }}>
                              Next: {when(group.huddle.nextStartsAt, church.timezone, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          {pages.events ? (
            <Card icon={CalendarDays} title="Events" id="events">
              {home.events.length === 0 ? (
                <p style={{ color: MUTED }}>No upcoming events.</p>
              ) : (
                <ul className="space-y-3">
                  {home.events.map((event) => (
                    <li key={event.id} className="rounded-2xl border border-[#E5E6E1] p-4">
                      <p className="font-bold">{event.title}</p>
                      <p className="text-sm" style={{ color: MUTED }}>{when(event.startsAt, church.timezone, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                      <p className="flex items-center gap-1 text-sm" style={{ color: MUTED }}><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {event.location}</p>
                      <RsvpControl
                        event={event}
                        primary={theme.primary}
                        onSaved={() => {
                          setNotice(`RSVP saved for ${event.title}.`);
                          void load();
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          {pages.prayer ? (
            <PrayerCard
              home={home}
              primary={theme.primary}
              onSent={() => {
                setNotice('Your prayer request is with the prayer team.');
                void load();
              }}
            />
          ) : null}

          {pages.profile ? <ProfileCard home={home} primary={theme.primary} onSaved={() => { setNotice('Your details are saved.'); void load(); }} /> : null}

          {pages.household && home.household ? (
            <Card icon={Home} title="My household" id="household">
              <p className="font-bold">{home.household.name}</p>
              <ul className="mt-3 space-y-2">
                {home.household.members.map((person) => (
                  <li key={person.id} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ background: theme.accentSoft }}>{initials(person.name)}</span>
                    <span className="font-semibold">{person.name}</span>
                    {person.isYou ? <span className="rounded-full bg-[#F1EADA] px-2 py-0.5 text-xs font-bold">You</span> : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <p className="pt-4 text-center text-sm">
          <a href="/" onClick={linkTo(onNavigate, '/')} className="inline-flex min-h-11 items-center gap-1.5 font-bold underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Church website
          </a>
        </p>
      </main>
    </div>
  );
};

function PrayerCard({ home, primary, onSent }: { home: MemberHome; primary: string; onSent: () => void }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await memberApi.pray(message);
      setMessage('');
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card icon={HandHeart} title="Prayer requests" id="prayer">
      <form onSubmit={send} className="space-y-3">
        <label htmlFor="member-prayer" className={labelClass}>What can we pray for?</label>
        <textarea id="member-prayer" value={message} onChange={(event) => setMessage(event.target.value)} rows={3} maxLength={2000} className={cn(fieldClass, 'py-3')} />
        {error ? <p role="alert" className="text-sm font-semibold text-[#8E2F2D]">{error}</p> : null}
        <button type="submit" disabled={busy || message.trim().length < 3} className="min-h-11 cursor-pointer rounded-full px-5 text-sm font-bold text-white disabled:opacity-50" style={{ background: primary }}>
          {busy ? 'Sending…' : 'Send to the prayer team'}
        </button>
      </form>
      {home.prayers.length ? (
        <ul className="mt-5 space-y-2 border-t border-[#E5E6E1] pt-4">
          {home.prayers.map((prayer) => (
            <li key={prayer.id} className="text-sm">
              <span className="block" style={{ color: INK }}>{prayer.message}</span>
              <span className="block text-xs" style={{ color: MUTED }}>
                {new Date(prayer.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
                {prayer.status === 'NEW' ? 'Received' : prayer.status === 'CONTACTED' ? 'Someone reached out' : 'Prayed for'}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function ProfileCard({ home, primary, onSaved }: { home: MemberHome; primary: string; onSaved: () => void }) {
  const member = home.member;
  const [phone, setPhone] = useState(member.phone || '');
  const [email, setEmail] = useState(member.email || '');
  const [birthday, setBirthday] = useState(member.birthMonthDay || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editable = home.canEditProfile;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await memberApi.updateProfile({ phone, email, birthMonthDay: birthday });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card icon={User} title="My profile" id="profile">
      <form onSubmit={save} className="space-y-3">
        <p className="text-lg font-bold">{member.firstName} {member.lastName}</p>
        {member.status ? <p className="text-sm" style={{ color: MUTED }}>{member.status === 'MEMBER' ? 'Member' : member.status === 'REGULAR' ? 'Regular attender' : member.status.toLowerCase()}{member.joinedAt ? ` since ${new Date(member.joinedAt).getFullYear()}` : ''}</p> : null}
        <div>
          <label htmlFor="member-phone" className={labelClass}>Phone</label>
          <input id="member-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!editable} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="member-email" className={labelClass}>Email</label>
          <input id="member-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={!editable} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="member-birthday" className={labelClass}>Birthday (month-day)</label>
          <input id="member-birthday" inputMode="numeric" placeholder="04-21" value={birthday} onChange={(event) => setBirthday(event.target.value)} disabled={!editable} className={fieldClass} aria-describedby="member-birthday-hint" />
          <p id="member-birthday-hint" className="mt-1 text-xs" style={{ color: MUTED }}>Month and day only. We never ask for the year.</p>
        </div>
        {error ? <p role="alert" className="text-sm font-semibold text-[#8E2F2D]">{error}</p> : null}
        {editable ? (
          <button type="submit" disabled={busy} className="min-h-11 cursor-pointer rounded-full px-5 text-sm font-bold text-white disabled:opacity-50" style={{ background: primary }}>
            {busy ? 'Saving…' : 'Save my details'}
          </button>
        ) : (
          <p className="text-sm" style={{ color: MUTED }}>To change these, contact the church office.</p>
        )}
      </form>
    </Card>
  );
}
