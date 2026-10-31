export type SiteEnv = {
  apiUrl: string;
  orgSlug: string;
  revalidateSecret: string;
  sanctumAppUrl: string;
  prayerRoomSlug: string;
  siteUrl: string;
};

function trimSlash(value: string) {
  return value.replace(/\/$/, '');
}

export function siteEnv(): SiteEnv {
  const revalidateSecret = process.env.REVALIDATE_SECRET
    || (process.env.NODE_ENV === 'production' ? '' : 'dev-revalidate-secret');
  return {
    apiUrl: trimSlash(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'),
    orgSlug: process.env.ORG_SLUG || 'promised-land-christian-center',
    revalidateSecret,
    sanctumAppUrl: trimSlash(process.env.SANCTUM_APP_URL || 'http://127.0.0.1:3000'),
    prayerRoomSlug: process.env.PRAYER_ROOM_SLUG || 'promised-land-christian-center',
    siteUrl: trimSlash(process.env.SITE_URL || 'http://127.0.0.1:3002'),
  };
}

export function prayerJoinUrl() {
  const env = siteEnv();
  return `${env.sanctumAppUrl}/join/${env.prayerRoomSlug}`;
}
