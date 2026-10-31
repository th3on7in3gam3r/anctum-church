import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import path from 'node:path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '..'),
  transpilePackages: ['@plcc/brand'],
  webpack: (config) => {
    config.resolve.modules = [
      path.join(__dirname, 'node_modules'),
      ...(config.resolve.modules ?? ['node_modules']),
    ];
    return config;
  },
  env: {
    NEXT_PUBLIC_SENTRY_RELEASE: process.env.VERCEL_GIT_COMMIT_SHA || process.env.SENTRY_RELEASE || '',
    NEXT_PUBLIC_DEPLOY_ENV: process.env.DEPLOY_ENV || '',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',
      },
    ],
  },
};

export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT_SITE,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: process.env.VERCEL_GIT_COMMIT_SHA || process.env.SENTRY_RELEASE },
      silent: true,
      widenClientFileUpload: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    })
  : nextConfig;
