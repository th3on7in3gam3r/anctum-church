import type { TourStep } from './createTour';

export const createRoomTourSteps: TourStep[] = [
  {
    element: '[data-tour="create-room-name"]',
    popover: {
      title: 'Name your prayer room',
      description:
        'Give this gathering a clear name — like Morning Prayer or Dawn Intercession. Your congregation will see it on the join page.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="create-room-logo"]',
    popover: {
      title: 'Add a logo for this room',
      description:
        'Optional. Paste a public image link if this room should show its own logo. Leave blank to use your church logo instead.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="create-room-slug"]',
    popover: {
      title: 'Your permanent join link',
      description:
        'This link never changes. Share it once with your congregation — they open it whenever prayer starts.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="create-room-save"]',
    popover: {
      title: 'Save when you are ready',
      description:
        'Tap Save to create the room. You can edit the logo and other settings anytime later.',
      side: 'top',
      align: 'end',
    },
  },
];
