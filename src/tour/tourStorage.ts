import type { TourId } from './tourIds';

const STORAGE_PREFIX = 'sanctum_tour_complete_';

export function hasCompletedTour(id: TourId): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${id}`) === '1';
  } catch {
    return false;
  }
}

export function markTourComplete(id: TourId): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, '1');
  } catch {
    /* private browsing / blocked storage */
  }
}

export function resetTour(id: TourId): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
  } catch {
    /* private browsing / blocked storage */
  }
}
