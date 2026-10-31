import { useCallback, useEffect, useRef } from 'react';
import type { TourId } from '../tour/tourIds';
import type { TourStep } from '../tour/createTour';
import { destroyActiveTour, startTour } from '../tour/createTour';
import { hasCompletedTour, resetTour } from '../tour/tourStorage';

interface UseTourOptions {
  /** Delay before auto-start so the page can paint anchors. */
  delayMs?: number;
  /** When false, skip auto-start (still allow manual startTour). */
  enabled?: boolean;
}

/** Prevents StrictMode double-mount from launching two drivers for the same tour. */
const autoStarted = new Set<TourId>();

/**
 * Auto-starts a tour once per browser if not completed.
 * Returns startTour() for Help / Show tutorial replay.
 */
export function useTour(tourId: TourId, steps: TourStep[], options: UseTourOptions = {}) {
  const { delayMs = 600, enabled = true } = options;
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const runTour = useCallback(
    (force = false) => {
      if (force) {
        resetTour(tourId);
        autoStarted.delete(tourId);
      }
      destroyActiveTour();
      return startTour(tourId, stepsRef.current);
    },
    [tourId]
  );

  useEffect(() => {
    if (!enabled) return;
    if (hasCompletedTour(tourId)) return;
    if (autoStarted.has(tourId)) return;

    const timer = window.setTimeout(() => {
      if (hasCompletedTour(tourId)) return;
      if (autoStarted.has(tourId)) return;
      autoStarted.add(tourId);
      startTour(tourId, stepsRef.current);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [tourId, delayMs, enabled]);

  useEffect(() => {
    return () => {
      // Leaving the page mid-tour should not leave orphaned popovers.
      destroyActiveTour();
    };
  }, []);

  return { startTour: () => runTour(true) };
}
