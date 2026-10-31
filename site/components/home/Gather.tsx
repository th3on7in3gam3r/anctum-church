import Link from 'next/link';
import type { ScheduleItem } from '@/lib/schedule';
import { groupSchedule } from '@/lib/schedule';
import { Reveal } from '@/components/home/Reveal';

function Rows({ items }: { items: ScheduleItem[] }) {
  return (
    <ul className="divide-y divide-on-dark/10">
      {items.map((item) => (
        <li key={item.key} className="py-4">
          <p className="text-[13px] font-semibold text-gold-light">{item.day ? `${item.day[0]}${item.day.slice(1).toLowerCase()} · ` : ''}{item.time}</p>
          <p className="mt-1 text-[17px] font-semibold text-cream">{item.name}</p>
          {item.detail ? <p className="mt-0.5 text-sm text-muted-dark">{item.detail}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[26px] border border-gold/25 bg-forest-800 p-6 sm:p-7">
      <h3 className="text-xs font-semibold tracking-[0.22em] text-gold">{title}</h3>
      {children}
    </div>
  );
}

export function Gather({ items, liveUrl }: { items: ScheduleItem[]; liveUrl: string }) {
  const { weekly, daily, monthly } = groupSchedule(items);
  const newcomers = weekly.find((item) => /new (members|believers)/i.test(item.name));

  return (
    <section id="schedule" className="bg-forest-900 px-4 py-20 text-on-dark sm:px-6">
      <Reveal className="mx-auto max-w-6xl">
        <h2 className="font-display text-[clamp(38px,4.6vw,54px)] font-light leading-tight text-cream">Find your place in the week.</h2>
        <div className="mt-10 grid gap-5 min-[900px]:grid-cols-3">
          {weekly.length ? (
            <Column title="EVERY WEEK"><Rows items={weekly} /></Column>
          ) : null}
          {daily.length ? (
            <Column title="EVERY DAY">
              <Rows items={daily} />
              <a href={liveUrl} className="site-button mt-4 border border-gold text-gold-light">
                <span className="inline-block h-2 w-2 rounded-full bg-live" aria-hidden="true" /> Pray along live
              </a>
            </Column>
          ) : null}
          {monthly.length || newcomers ? (
            <Column title={monthly.length ? 'EVERY MONTH' : 'NEW HERE'}>
              {monthly.length ? <Rows items={monthly} /> : null}
              {newcomers ? (
                <div className="mt-5 rounded-[18px] bg-forest-900 p-5">
                  <p className="font-display text-[22px] text-cream">New here?</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-sand">
                    Join {newcomers.name}{newcomers.day ? `, ${newcomers.day[0]}${newcomers.day.slice(1).toLowerCase()} ${newcomers.time}` : ''}{/\.$/.test(newcomers.time) ? '' : '.'}
                  </p>
                  <Link href="/visit" className="mt-3 inline-block text-sm font-semibold text-gold-light underline underline-offset-4">Plan your visit</Link>
                </div>
              ) : null}
            </Column>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}
