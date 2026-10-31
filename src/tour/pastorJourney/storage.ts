const STEP_KEY = 'sanctum_pastor_journey_step';
const ACTIVE_KEY = 'sanctum_pastor_journey_active';
const COMPLETE_KEY = 'sanctum_pastor_journey_complete';

export function getPastorJourneyStep(): number {
  try {
    const raw = localStorage.getItem(STEP_KEY);
    const parsed = raw ? Number(raw) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } catch {
    return 1;
  }
}

export function setPastorJourneyStep(step: number): void {
  try {
    localStorage.setItem(STEP_KEY, String(Math.max(1, step)));
  } catch {
    /* private browsing */
  }
}

export function isPastorJourneyActive(): boolean {
  try {
    return localStorage.getItem(ACTIVE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPastorJourneyActive(active: boolean): void {
  try {
    if (active) {
      localStorage.setItem(ACTIVE_KEY, '1');
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  } catch {
    /* private browsing */
  }
}

export function isPastorJourneyComplete(): boolean {
  try {
    return localStorage.getItem(COMPLETE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markPastorJourneyComplete(): void {
  try {
    localStorage.setItem(COMPLETE_KEY, '1');
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* private browsing */
  }
}

export function resetPastorJourney(): void {
  try {
    localStorage.removeItem(STEP_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(COMPLETE_KEY);
  } catch {
    /* private browsing */
  }
}
