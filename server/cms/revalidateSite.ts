const TAGS = ['pages', 'announcements', 'events', 'sermons', 'leaders', 'groups', 'faqs', 'albums', 'videos'] as const;
export type SiteTag = (typeof TAGS)[number];

export function revalidateSite(tag: SiteTag) {
  const siteUrl = (process.env.SITE_REVALIDATE_URL || (process.env.SITE_URL ? `${process.env.SITE_URL.replace(/\/$/, '')}/api/revalidate` : ''))
    .replace(/\/$/, '');
  const secret = process.env.REVALIDATE_SECRET;
  if (!siteUrl || !secret) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  void fetch(siteUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret, tag }),
    signal: controller.signal,
  })
    .catch(() => undefined)
    .finally(() => clearTimeout(timer));
}
