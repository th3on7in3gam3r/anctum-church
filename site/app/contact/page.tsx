import type { Metadata } from 'next';
import { FindUs } from '@/components/page/FindUs';
import { PageHero } from '@/components/page/PageHero';
import { PublicForm } from '@/components/PublicForm';
import { submitVisitor } from '@/lib/actions';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact Promised Land Christian Center or send a prayer request.',
};

const fields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'phone', label: 'Phone', type: 'tel' as const, required: true },
  { name: 'email', label: 'Email', type: 'email' as const },
  { name: 'message', label: 'Message', type: 'textarea' as const },
];

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Write to us." lede="The church office reads every note, including prayer requests." variant="centered" />
      <section className="bg-sand px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 min-[900px]:grid-cols-2">
          <div className="space-y-10">
            <PublicForm action={submitVisitor} fields={fields} submitLabel="Send message" hidden={{ source: 'CONTACT' }} formId="contact" />
            <div>
              <h2 className="font-display mb-4 text-4xl font-normal text-ink">Prayer request</h2>
              <PublicForm
                action={submitVisitor}
                fields={fields.map((field) => field.name === 'message' ? { ...field, label: 'Prayer request' } : field)}
                formId="prayer"
                submitLabel="Send prayer request"
                hidden={{ source: 'PRAYER' }}
              />
            </div>
          </div>
          <FindUs />
        </div>
      </section>
    </>
  );
}
