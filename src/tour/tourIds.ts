export const TOUR_IDS = {
  dashboard: 'dashboard',
  controlRoom: 'controlRoom',
  listenerRoom: 'listenerRoom',
  joinGate: 'joinGate',
  createRoom: 'createRoom',
} as const;

export type TourId = (typeof TOUR_IDS)[keyof typeof TOUR_IDS];
