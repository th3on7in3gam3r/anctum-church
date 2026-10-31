import type { MetadataRoute } from 'next';
import { listEvents, listSermons } from '@/lib/api';
import { siteEnv } from '@/lib/env';

const paths = ['', '/about', '/leadership', '/ministries', '/huddles', '/beliefs', '/events', '/gallery', '/sermons', '/visit', '/contact', '/prayer', '/give'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteEnv().siteUrl;
  const entries: MetadataRoute.Sitemap = paths.map((path) => ({
    url: `${base}${path || '/'}`,
  }));

  try {
    const [events, sermons] = await Promise.all([listEvents(), listSermons()]);
    for (const event of events) entries.push({ url: `${base}/events/${event.id}` });
    for (const sermon of sermons) entries.push({ url: `${base}/sermons/${sermon.id}` });
  } catch {
    return entries;
  }

  return entries;
}
