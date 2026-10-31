import { DEFAULT_API_ORIGIN } from './api';

const SLUG_KEY = 'sanctum_last_slug';
const NAME_KEY = 'sanctum_guest_name';
const ORIGIN_KEY = 'sanctum_api_origin';

function readLocal<T>(key: string, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([key], (result) => {
        resolve((result[key] as T | undefined) ?? fallback);
      });
    } catch {
      resolve(fallback);
    }
  });
}

function writeLocal(key: string, value: string): void {
  try {
    void chrome.storage.local.set({ [key]: value });
  } catch {
    /* ignore */
  }
}

export const extensionStorage = {
  getLastSlug: () => readLocal(SLUG_KEY, ''),
  setLastSlug: (slug: string) => writeLocal(SLUG_KEY, slug),
  getGuestName: () => readLocal(NAME_KEY, ''),
  setGuestName: (name: string) => writeLocal(NAME_KEY, name),
  getApiOrigin: () => readLocal(ORIGIN_KEY, DEFAULT_API_ORIGIN),
  setApiOrigin: (origin: string) => writeLocal(ORIGIN_KEY, origin.replace(/\/$/, '')),
};
