import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import { BRAND } from '@plcc/brand/brand';
import { SiteChrome } from '@/components/SiteChrome';
import { getLive } from '@/lib/api';
import { listServiceTimes } from '@/lib/api';
import { prayerJoinUrl, siteEnv } from '@/lib/env';
import { homeStrip } from '@/lib/schedule';
import { staffSignInLink } from '@/lib/nav';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
});

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteEnv().siteUrl),
  title: {
    default: BRAND.fullName,
    template: `%s · ${BRAND.fullName}`,
  },
  description: `${BRAND.fullName} in Kampala. Worship, prayer, and community.`,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [live, serviceTimes] = await Promise.all([getLive(), listServiceTimes()]);
  const liveRoom = live?.rooms?.find((room) => room.status === 'LIVE');
  const prayerUrl = prayerJoinUrl();
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <SiteChrome prayerUrl={prayerUrl} liveNow={Boolean(liveRoom)} staffLoginUrl={staffSignInLink(siteEnv().sanctumAppUrl).href} serviceStrip={homeStrip(serviceTimes)}>{children}</SiteChrome>
      </body>
    </html>
  );
}
