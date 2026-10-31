import { church } from '@/lib/church';

export type NavLink = {
  label: string;
  href: string;
};

export const MAIN_NAV = [
  { label: 'About', href: '/about' },
  { label: 'Ministries', href: '/ministries' },
  { label: 'Messages', href: '/sermons' },
  { label: 'Events', href: '/events' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Visit', href: '/visit' },
] as const;

export function staffSignInLink(sanctumAppUrl: string): NavLink {
  const base = sanctumAppUrl.replace(/\/$/, '');
  return { label: 'Staff sign in', href: `${base}/login` };
}

export function footerNav(prayerUrl: string) {
  return {
    gather: [
      { label: 'Visit', href: '/visit' },
      { label: 'Live prayer', href: prayerUrl },
      { label: 'Huddles', href: '/huddles' },
      { label: 'Give', href: '/give' },
      { label: 'Events', href: '/events' },
    ],
    explore: [
      { label: 'About', href: '/about' },
      { label: 'Ministries', href: '/ministries' },
      { label: 'Messages', href: '/sermons' },
      { label: 'Gallery', href: '/gallery' },
      { label: 'Beliefs', href: '/beliefs' },
      { label: 'Leadership', href: '/leadership' },
      { label: 'Contact', href: '/contact' },
    ],
    follow: [
      { label: church.youtubeLabel, href: church.youtube },
      { label: church.tiktokLabel, href: church.tiktok },
      { label: 'WhatsApp', href: church.whatsapp },
    ],
  } satisfies Record<string, NavLink[]>;
}
