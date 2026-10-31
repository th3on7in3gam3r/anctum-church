/**
 * Prototype shell persistence adapter (Phase 1A / 1B.1).
 * localStorage is labeled and isolated here so UI pages do not write domain
 * state directly. Durable source of truth moves to Postgres via server/.
 */
import type { PrayerRequest, PrayerRoom, PrayerSession } from '../../types';

const KEYS = {
  rooms: 'sanctum_rooms',
  history: 'sanctum_history',
  requests: 'sanctum_requests',
  dataSaver: 'sanctum_data_saver',
  theme: 'sanctum_theme',
  org: 'sanctum_org',
  user: 'sanctum_user',
} as const;

/**
 * Bump STORAGE_VERSION whenever a stored sanctum_ shape changes.
 * A mismatch clears cached lists so an old shape cannot crash startup.
 */
export const STORAGE_VERSION = 3;
const STORAGE_VERSION_KEY = 'sanctum_storage_version';

/** Kept across a reset: the name they join with, and the session they are already in. */
const PRESERVED_KEYS = new Set([
  'sanctum_last_attendee_name',
  'sanctum_active_attendee_session',
]);

export function migrateSanctumStorage(storage: Storage): void {
  let current: string | null;
  try {
    current = storage.getItem(STORAGE_VERSION_KEY);
  } catch {
    return;
  }
  if (current === String(STORAGE_VERSION)) return;

  const keys: string[] = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key) keys.push(key);
    }
  } catch {
    return;
  }

  for (const key of keys) {
    if (!key.startsWith('sanctum_') || key === STORAGE_VERSION_KEY || PRESERVED_KEYS.has(key)) continue;
    try {
      storage.removeItem(key);
    } catch {
      /* this key can stay; the rest still reset */
    }
  }

  try {
    storage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
  } catch {
    /* storage may be unavailable */
  }
}

if (typeof localStorage !== 'undefined') {
  migrateSanctumStorage(localStorage);
}

export const PROTOTYPE_SHELL_PERSISTENCE = 'localStorage (prototype adapter until database is connected)';

function readJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* prototype adapter: storage may be unavailable */
  }
}

export const localPersistenceAdapter = {
  label: PROTOTYPE_SHELL_PERSISTENCE,
  loadRooms: (fallback: PrayerRoom[]) => readJson<PrayerRoom[]>(KEYS.rooms, fallback),
  saveRooms: (rooms: PrayerRoom[]) => writeJson(KEYS.rooms, rooms),
  loadHistory: (fallback: PrayerSession[]) => readJson<PrayerSession[]>(KEYS.history, fallback),
  saveHistory: (sessions: PrayerSession[]) => writeJson(KEYS.history, sessions),
  loadRequests: (fallback: PrayerRequest[]) => readJson<PrayerRequest[]>(KEYS.requests, fallback),
  saveRequests: (requests: PrayerRequest[]) => writeJson(KEYS.requests, requests),
  loadDataSaver: (fallback: string) => {
    try {
      return localStorage.getItem(KEYS.dataSaver) || fallback;
    } catch {
      return fallback;
    }
  },
  saveDataSaver: (mode: string) => {
    try {
      localStorage.setItem(KEYS.dataSaver, mode);
    } catch {}
  },
  loadTheme: () => {
    try {
      return localStorage.getItem(KEYS.theme) !== 'light';
    } catch {
      return true;
    }
  },
  saveTheme: (isDark: boolean) => {
    try {
      localStorage.setItem(KEYS.theme, isDark ? 'dusk' : 'light');
    } catch {}
  },
};
