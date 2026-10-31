export function registerSanctumServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* PWA registration is best-effort */
    });
  });
}

export async function promptInstall(): Promise<boolean> {
  const deferred = (window as Window & { __sanctumInstallPrompt?: BeforeInstallPromptEvent }).__sanctumInstallPrompt;
  if (!deferred) return false;
  await deferred.prompt();
  const result = await deferred.userChoice;
  return result.outcome === 'accepted';
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    (window as Window & { __sanctumInstallPrompt?: BeforeInstallPromptEvent }).__sanctumInstallPrompt =
      event as BeforeInstallPromptEvent;
  });
}
