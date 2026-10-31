import { useCallback, useEffect, useRef } from 'react';
import {
  isPastorJourneyActive,
  isPastorJourneyComplete,
  resetPastorJourney,
  setPastorJourneyActive,
} from '../tour/pastorJourney/storage';
import {
  destroyPastorJourney,
  runPastorJourneySegment,
  startPastorJourneyFromBeginning,
} from '../tour/pastorJourney/runPastorJourney';

interface UsePastorJourneyOptions {
  delayMs?: number;
  enabled?: boolean;
}

const autoStartedPaths = new Set<string>();

export function usePastorJourney(
  currentPath: string,
  onNavigate: (path: string) => void,
  options: UsePastorJourneyOptions = {}
) {
  const { delayMs = 700, enabled = true } = options;
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  const startPastorJourney = useCallback(() => {
    resetPastorJourney();
    setPastorJourneyActive(true);
    autoStartedPaths.clear();
    startPastorJourneyFromBeginning(currentPath, (path) => onNavigateRef.current(path));
  }, [currentPath]);

  useEffect(() => {
    if (!enabled) return;
    if (isPastorJourneyComplete()) return;

    const shouldAutoStart = !isPastorJourneyActive() && currentPath === '/dashboard';
    if (!shouldAutoStart && !isPastorJourneyActive()) return;

    const autoKey = `${currentPath}:${shouldAutoStart ? 'bootstrap' : 'resume'}`;
    if (autoStartedPaths.has(autoKey)) return;

    const timer = window.setTimeout(() => {
      if (isPastorJourneyComplete()) return;
      if (shouldAutoStart) {
        setPastorJourneyActive(true);
      }
      const started = runPastorJourneySegment(currentPath, (path) => onNavigateRef.current(path));
      if (started) {
        autoStartedPaths.add(autoKey);
      }
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentPath, delayMs, enabled]);

  useEffect(() => {
    return () => {
      destroyPastorJourney();
    };
  }, []);

  return { startPastorJourney };
}
