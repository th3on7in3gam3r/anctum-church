import type { TourStep } from './createTour';

export const dashboardTourSteps: TourStep[] = [
  {
    element: '[data-tour="dashboard-welcome"]',
    popover: {
      title: 'Welcome to your dashboard',
      description:
        'This is home base for your church. From here you create prayer rooms, share join links, and lead gatherings.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="dashboard-nav"]',
    popover: {
      title: 'Find your way here',
      description:
        'Use these buttons to move around: Overview, Prayer Rooms, Requests, Participants, History, and Settings.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="dashboard-create-room"]',
    popover: {
      title: 'Create a prayer room',
      description:
        'Start here when you need a new gathering. You can add a room logo, set the schedule, and get a permanent join link.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="dashboard-empty-create"]',
    popover: {
      title: 'Create your first room',
      description:
        'You do not have a prayer room yet. Tap Create Prayer Room — add a name, optional logo, and share the join link.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="dashboard-copy-link"]',
    popover: {
      title: 'Share the join link',
      description:
        'Copy this link and send it to your congregation. They open it on their phone — no account needed.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="dashboard-control-room"]',
    popover: {
      title: 'Lead from the Control Room',
      description:
        'Open the shared Control Room when you are ready to start. Admins can operate and moderate while the named sermon leader speaks from another Control Room. Congregants use the public join link.',
      side: 'left',
      align: 'center',
    },
  },
  {
    element: '[data-tour="dashboard-settings"]',
    popover: {
      title: 'Settings & team',
      description:
        'Update your church name, branding, and invite helpers from Settings. You can replay this tutorial anytime from Show tutorial.',
      side: 'right',
      align: 'end',
    },
  },
];
