import type { MetadataRoute } from 'next';
import { siteEnv } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  if (process.env.DEPLOY_ENV === 'staging') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteEnv().siteUrl}/sitemap.xml`,
  };
}
