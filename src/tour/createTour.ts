import { driver, type DriveStep, type Config, type Driver } from 'driver.js';
import type { TourId } from './tourIds';
import { markTourComplete } from './tourStorage';

export type TourStep = DriveStep & {
  /** Stable selector; step is skipped if the element is missing. */
  element?: string;
};

let activeDriver: Driver | null = null;

function filterAvailableSteps(steps: TourStep[]): DriveStep[] {
  return steps.filter((step) => {
    if (!step.element) return true;
    return Boolean(document.querySelector(step.element));
  });
}

/** Tear down any in-progress tour so popovers cannot stack. */
export function destroyActiveTour(): void {
  if (!activeDriver) return;
  try {
    activeDriver.destroy();
  } catch {
    /* already destroyed */
  }
  activeDriver = null;
}

export function createTour(tourId: TourId, steps: TourStep[], overrides?: Config) {
  const available = filterAvailableSteps(steps);
  if (available.length === 0) return null;

  destroyActiveTour();

  const instance = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 10,
    stageRadius: 12,
    popoverClass: 'sanctum-tour-popover',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    progressText: '{{current}} of {{total}}',
    steps: available,
    onDestroyed: () => {
      if (activeDriver === instance) {
        activeDriver = null;
      }
      markTourComplete(tourId);
    },
    ...overrides,
  });

  activeDriver = instance;
  return instance;
}

export function startTour(tourId: TourId, steps: TourStep[], overrides?: Config): boolean {
  const instance = createTour(tourId, steps, overrides);
  if (!instance) return false;
  instance.drive();
  return true;
}
