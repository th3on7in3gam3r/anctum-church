import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import { CHURCH_PUBLIC_NAME, publicSiteUrl, sanctumMode } from './shared/sanctumMode.ts';

const apiPort = process.env.API_PORT || '3001';
const release = process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT || '';
const mode = sanctumMode(process.env.SANCTUM_MODE);
const siteUrl = publicSiteUrl(process.env.PUBLIC_SITE_URL);

function churchModePlugin(): Plugin {
  return {
    name: 'sanctum-church-mode',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (mode !== 'church') {
          next();
          return;
        }
        const pathOnly = (req.url || '/').split('?')[0];
        if (pathOnly !== '/') {
          next();
          return;
        }
        res.statusCode = 302;
        res.setHeader('Location', siteUrl);
        res.end();
      });
    },
    transformIndexHtml(html) {
      if (mode !== 'church') return html;
      const description = `${CHURCH_PUBLIC_NAME} in Kampala. Worship, prayer, and community.`;
      return html
        .replace('<title>Sanctum Live</title>', `<title>${CHURCH_PUBLIC_NAME}</title>`)
        .replace('content="Corporate prayer without barriers."', `content="${description}"`)
        .replace('content="Corporate prayer without barriers."', `content="${description}"`)
        .replace('content="Sanctum Live"', `content="${CHURCH_PUBLIC_NAME}"`)
        .replace('content="#0D1A14"', 'content="#12231C"');
    },
  };
}

export default defineConfig(() => {
  return {
    build: {
      sourcemap: 'hidden' as const,
    },
    plugins: [
      churchModePlugin(),
      react(),
      tailwindcss(),
      ...(process.env.SENTRY_AUTH_TOKEN
        ? [
            sentryVitePlugin({
              org: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT_SANCTUM,
              authToken: process.env.SENTRY_AUTH_TOKEN,
              release: { name: release || undefined },
              silent: true,
              sourcemaps: { assets: './dist/**' },
            }),
          ]
        : []),
    ],
    define: {
      'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(release),
      'import.meta.env.VITE_DEPLOY_ENV': JSON.stringify(process.env.DEPLOY_ENV || ''),
      'import.meta.env.VITE_SANCTUM_MODE': JSON.stringify(mode),
      'import.meta.env.VITE_PUBLIC_SITE_URL': JSON.stringify(siteUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
