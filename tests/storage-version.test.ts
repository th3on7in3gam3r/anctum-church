import { describe, expect, it } from 'vitest';
import { migrateSanctumStorage, STORAGE_VERSION } from '../src/services/persistence/localPersistenceAdapter.ts';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    key(index: number) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}

describe('sanctum storage version', () => {
  it('clears outdated sanctum keys and keeps the saved name and active session', () => {
    const storage = memoryStorage({
      sanctum_rooms: '{"not":"a list"}',
      sanctum_history: '[]',
      sanctum_requests: 'null',
      sanctum_theme: 'dark',
      sanctum_tour_complete_joinGate: '1',
      sanctum_last_attendee_name: 'Grace',
      sanctum_active_attendee_session: 'Grace',
      sanctum_storage_version: '1',
      __clerk_environment: 'keep-me',
    });

    migrateSanctumStorage(storage);

    expect(storage.getItem('sanctum_rooms')).toBeNull();
    expect(storage.getItem('sanctum_history')).toBeNull();
    expect(storage.getItem('sanctum_requests')).toBeNull();
    expect(storage.getItem('sanctum_theme')).toBeNull();
    expect(storage.getItem('sanctum_tour_complete_joinGate')).toBeNull();
    expect(storage.getItem('sanctum_last_attendee_name')).toBe('Grace');
    expect(storage.getItem('sanctum_active_attendee_session')).toBe('Grace');
    expect(storage.getItem('__clerk_environment')).toBe('keep-me');
    expect(storage.getItem('sanctum_storage_version')).toBe(String(STORAGE_VERSION));
  });

  it('resets when the version is missing and leaves a current version alone', () => {
    const missing = memoryStorage({ sanctum_rooms: '[]', sanctum_last_attendee_name: 'Anna' });
    migrateSanctumStorage(missing);
    expect(missing.getItem('sanctum_rooms')).toBeNull();
    expect(missing.getItem('sanctum_last_attendee_name')).toBe('Anna');
    expect(missing.getItem('sanctum_storage_version')).toBe(String(STORAGE_VERSION));

    const current = memoryStorage({
      sanctum_storage_version: String(STORAGE_VERSION),
      sanctum_rooms: '[{"id":"room_1"}]',
    });
    migrateSanctumStorage(current);
    expect(current.getItem('sanctum_rooms')).toBe('[{"id":"room_1"}]');
  });

  it('clears a light theme saved before the dusk default', () => {
    const storage = memoryStorage({
      sanctum_storage_version: '2',
      sanctum_theme: 'light',
      sanctum_last_attendee_name: 'Amina',
    });
    migrateSanctumStorage(storage);
    expect(storage.getItem('sanctum_theme')).toBeNull();
    expect(storage.getItem('sanctum_last_attendee_name')).toBe('Amina');
    expect(storage.getItem('sanctum_storage_version')).toBe('3');
  });
});
