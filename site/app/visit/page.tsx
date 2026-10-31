import type { Metadata } from 'next';
import { FindUs } from '@/components/page/FindUs';
import { NumberedItem } from '@/components/page/NumberedItem';
import { PageHero } from '@/components/page/PageHero';
import { PublicForm } from '@/components/PublicForm';
import { submitVisitor } from '@/lib/actions';
import { getPage, listFaqs, listServiceTimes } from '@/lib/api';
import { clock, homeStrip } from '@/lib/schedule';
import { church } from '@/lib/church';
import { parseHome } from '@/lib/home';

export const metadata: Metadata = {
  title: 'Plan a visit',
  description: 'Tell Promised Land Christian Center you are planning to visit.',
};

export default async function VisitPage() {
  const [home, faqs, serviceTimes] = await Promise.all([getPage('home'), listFaqs(), listServiceTimes()]);
  const parsed = home ? parseHome(home) : null;
  const times = serviceTimes.length
    ? serviceTimes.map((time) => ({ day: time.weekday || time.cadence, time: clock(time), name: time.name, line: time.place || time.note || '' }))
    : parsed?.times || [];
  const points = parsed?.visit || [];

  return (
    <>
      <PageHero
        variant="split"
        eyebrow="Visit"
        title="We've saved you a"
        accent="seat."
        lede={(serviceTimes.length ? homeStrip(serviceTimes) : times.map((item) => item.name)).join(' · ') || church.address}
        photo={home?.heroImageUrl}
      >
        <p className="mt-4 text-sand">{church.address}</p>
      </PageHero>
      <section className="bg-cream px-4 py-16 text-ink sm:px-6">
        <div className="mx-auto max-w-6xl border-t border-ink/15 pt-10">
          <h2 className="font-display text-5xl font-light">What to expect</h2>
          <div className="mt-8 grid gap-8 min-[900px]:grid-cols-3">
            {points.map((point, index) => <NumberedItem key={point} index={index + 1} title="" text={point} />)}
          </div>
        </div>
      </section>
      <section className="bg-sand px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 min-[900px]:grid-cols-2">
          <PublicForm
            action={submitVisitor}
            fields={[
              { name: 'name', label: 'Name', required: true },
              { name: 'phone', label: 'Phone', type: 'tel', required: true },
              { name: 'email', label: 'Email (optional)', type: 'email' },
              {
                name: 'service',
                label: 'Which service',
                type: 'select',
                options: times.map((item) => ({ value: `${item.name} ${item.time}`, label: `${item.name} · ${item.time}` })),
              },
              { name: 'message', label: 'Anything we should know', type: 'textarea' },
            ]}
            submitLabel="Save my seat"
            hidden={{ source: 'PLAN_A_VISIT' }}
            formId="visit"
          />
          <FindUs />
        </div>
      </section>
      {faqs.length ? (
        <section className="bg-cream px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-5xl font-light text-ink">Questions</h2>
            <div className="mt-6 divide-y divide-ink/15 border-y border-ink/15">
              {faqs.map((faq) => (
                <details key={faq.id} className="py-4">
                  <summary className="cursor-pointer font-display text-2xl">{faq.question}</summary>
                  <p className="mt-3 leading-relaxed text-ink/80">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
