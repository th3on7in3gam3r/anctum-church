import { createApp } from './app.ts';
import { env } from './env.ts';
import { assertApiProductionEnv, logOptionalFeatures } from './productionEnv.ts';
import { disconnectPrisma } from './prisma.ts';
import { initSentry } from './sentry.ts';
import { startYoutubeImportTimer } from './youtube/schedule.ts';

assertApiProductionEnv();
logOptionalFeatures();
initSentry();

const app = createApp();

if (process.env.NODE_ENV === 'development') {
  startYoutubeImportTimer();
}

const server = app.listen(env.port, env.bindHost, () => {
  console.log(`Sanctum Live API listening on http://${env.bindHost}:${env.port}`);
});

let shuttingDown = false;

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 5000);
    server.close(() => {
      clearTimeout(timer);
      resolve();
    });
  });
  await disconnectPrisma();
  process.exit(0);
}

process.once('SIGTERM', () => {
  void shutdown();
});
process.once('SIGINT', () => {
  void shutdown();
});
