import type { Metadata } from 'next';
import { prayerJoinUrl } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Live prayer',
  description: 'Join Promised Land Christian Center for live prayer in Sanctum.',
};

export default function PrayerPage() {
  const href = prayerJoinUrl();
  return (
    <article className="page-wrap space-y-5">
      <h1 className="page-title">Live prayer</h1>
      <p className="text-lg leading-relaxed">
        Prayer at Promised Land Christian Center continues beyond the Sunday gathering. When the room is open, you can listen, pray along, and raise a hand from your phone.
      </p>
      <p className="text-lg leading-relaxed">
        The prayer room opens in Sanctum. You will choose a name, then join the live room. This page does not play the room itself.
      </p>
      <a href={href} className="site-button bg-gold text-ink">
        Join live prayer
      </a>
    </article>
  );
}
