import { driver, type Config, type Driver } from 'driver.js';
import { destroyActiveTour } from '../createTour';
import {
  PASTOR_JOURNEY_TOTAL,
  parseRoomIdFromPath,
  pastorJourneySteps,
  type PastorJourneyStep,
} from './steps';
import {
  getPastorJourneyStep,
  markPastorJourneyComplete,
  setPastorJourneyStep,
} from './storage';

let activePastorDriver: Driver | null = null;

function stepTitle(step: PastorJourneyStep): string {
  return `Step ${step.globalStep} of ${PASTOR_JOURNEY_TOTAL}: ${step.popover?.title || 'Guide'}`;
}

function resolveStepElement(step: PastorJourneyStep): string | null {
  if (step.element && document.querySelector(step.element)) return step.element;
  if (step.alternateElement && document.querySelector(step.alternateElement)) {
    return step.alternateElement;
  }
  return null;
}

function filterStepsForPage(currentPath: string, fromStep: number): Array<PastorJourneyStep & { resolvedElement: string }> {
  return pastorJourneySteps.flatMap((step) => {
    if (step.globalStep < fromStep) return [];
    if (!(typeof step.route === 'string' ? currentPath === step.route : step.route.test(currentPath))) {
      return [];
    }
    const resolvedElement = resolveStepElement(step);
    if (!resolvedElement) return [];
    return [{ ...step, resolvedElement }];
  });
}

export function destroyPastorJourney(): void {
  if (!activePastorDriver) return;
  try {
    activePastorDriver.destroy();
  } catch {
    /* already destroyed */
  }
  activePastorDriver = null;
}

export function runPastorJourneySegment(
  currentPath: string,
  onNavigate: (path: string) => void,
  options?: { fromStep?: number }
): boolean {
  const fromStep = options?.fromStep ?? getPastorJourneyStep();
  const segment = filterStepsForPage(currentPath, fromStep);
  if (segment.length === 0) return false;

  destroyActiveTour();
  destroyPastorJourney();

  const roomId = parseRoomIdFromPath(currentPath);
  let completedThrough = fromStep - 1;

  const driverSteps = segment.map((step, index) => {
    const isLastInSegment = index === segment.length - 1;
    const navigateAfter = step.navigateAfter;

    return {
      element: step.resolvedElement,
      popover: {
        ...step.popover,
        title: stepTitle(step),
        ...(isLastInSegment && navigateAfter
          ? {
              doneBtnText: 'Continue',
              onNextClick: (
                _element: Element | undefined,
                _driveStep: unknown,
                opts: { driver: Driver }
              ) => {
                completedThrough = step.globalStep;
                const nextStep = step.globalStep + 1;
                setPastorJourneyStep(nextStep);
                opts.driver.destroy();

                const target =
                  typeof navigateAfter === 'function'
                    ? navigateAfter({ roomId })
                    : navigateAfter;
                if (target && target !== currentPath) {
                  onNavigate(target);
                }
              },
            }
          : {}),
      },
    };
  });

  const config: Config = {
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
    steps: driverSteps,
    onDestroyed: () => {
      if (activePastorDriver) {
        activePastorDriver = null;
      }

      const lastShown = segment[segment.length - 1];
      const advancedTo = Math.max(completedThrough, lastShown.globalStep);
      const nextStep = advancedTo + 1;

      if (lastShown.globalStep >= PASTOR_JOURNEY_TOTAL) {
        markPastorJourneyComplete();
        return;
      }

      if (nextStep > getPastorJourneyStep()) {
        setPastorJourneyStep(nextStep);
      }
    },
  };

  const instance = driver(config);
  activePastorDriver = instance;
  instance.drive();
  return true;
}

export function startPastorJourneyFromBeginning(
  currentPath: string,
  onNavigate: (path: string) => void
): void {
  setPastorJourneyStep(1);
  if (currentPath !== '/dashboard') {
    onNavigate('/dashboard');
    window.setTimeout(() => runPastorJourneySegment('/dashboard', onNavigate, { fromStep: 1 }), 500);
    return;
  }
  runPastorJourneySegment('/dashboard', onNavigate, { fromStep: 1 });
}
