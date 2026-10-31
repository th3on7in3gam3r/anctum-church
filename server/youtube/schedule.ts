import { importYoutubeChannels } from './import.ts';

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function startYoutubeImportTimer() {
  const timer = setInterval(() => {
    void importYoutubeChannels().catch((error) => {
      console.error('youtube import:', error instanceof Error ? error.message : error);
    });
  }, SIX_HOURS);
  timer.unref?.();
  return timer;
}
