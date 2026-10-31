import type { TourStep } from '../createTour';

export const PASTOR_JOURNEY_TOTAL = 17;

export type PastorRouteMatcher = string | RegExp;

export interface PastorJourneyStep extends TourStep {
  globalStep: number;
  route: PastorRouteMatcher;
  alternateElement?: string;
  /** Navigate after the user clicks Next on this step. */
  navigateAfter?: string | ((context: { roomId?: string }) => string);
}

export const pastorJourneySteps: PastorJourneyStep[] = [
  {
    globalStep: 1,
    route: '/dashboard',
    element: '[data-tour="dashboard-welcome"]',
    popover: {
      title: 'Welcome to Sanctum Live',
      description:
        'This walkthrough takes you from creating a prayer room to leading your first gathering. Follow each numbered step in order.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    globalStep: 2,
    route: '/dashboard',
    element: '[data-tour="dashboard-create-room"]',
    alternateElement: '[data-tour="dashboard-empty-create"]',
    popover: {
      title: 'Create your first prayer room',
      description:
        'Tap Create Prayer Room to set up a permanent gathering space with its own join link. Click Next to go there now.',
      side: 'bottom',
      align: 'end',
    },
    navigateAfter: '/dashboard/prayer-rooms/new',
  },
  {
    globalStep: 3,
    route: '/dashboard/prayer-rooms/new',
    element: '[data-tour="create-room-name"]',
    popover: {
      title: 'Name your prayer room',
      description:
        'Choose a clear name your congregation will recognize — for example Morning Prayer or Dawn Intercession.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    globalStep: 4,
    route: '/dashboard/prayer-rooms/new',
    element: '[data-tour="create-room-logo"]',
    popover: {
      title: 'Add a room logo (optional)',
      description:
        'Paste a public image URL if this room should show its own logo. Leave blank to use your church logo.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    globalStep: 5,
    route: '/dashboard/prayer-rooms/new',
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
    globalStep: 6,
    route: '/dashboard/prayer-rooms/new',
    element: '[data-tour="create-room-save"]',
    popover: {
      title: 'Save your prayer room',
      description:
        'Tap Create Prayer Room to save. The walkthrough continues on the room details page after you save.',
      side: 'top',
      align: 'end',
    },
  },
  {
    globalStep: 7,
    route: /^\/dashboard\/prayer-rooms\/[^/]+$/,
    element: '[data-tour="room-details-copy-link"]',
    popover: {
      title: 'Copy the join link',
      description:
        'Copy this link and send it to your congregation. They join as listeners — no account needed.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    globalStep: 8,
    route: /^\/dashboard\/prayer-rooms\/[^/]+$/,
    element: '[data-tour="room-details-control-room"]',
    popover: {
      title: 'Open the Control Room',
      description: 'Lead from the Control Room when you are ready. Click Next to open it now.',
      side: 'top',
      align: 'center',
    },
    navigateAfter: (context) =>
      context.roomId ? `/dashboard/prayer-rooms/${context.roomId}/control` : '/dashboard/prayer-rooms',
  },
  {
    globalStep: 9,
    route: /^\/dashboard\/prayer-rooms\/[^/]+\/control$/,
    element: '[data-tour="control-welcome"]',
    popover: {
      title: 'You are in the Control Room',
      description:
        'This is where pastors and Admins lead. Congregants use the public join link — they never see this screen.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    globalStep: 10,
    route: /^\/dashboard\/prayer-rooms\/[^/]+\/control$/,
    element: '[data-tour="control-open-sanctuary"]',
    popover: {
      title: 'Open the sanctuary',
      description:
        'Before going live, open the sanctuary and enter who is giving the sermon today. This name is shown to congregants.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    globalStep: 11,
    route: /^\/dashboard\/prayer-rooms\/[^/]+\/control$/,
    element: '[data-tour="control-pre-prayer"]',
    popover: {
      title: 'Pre-Prayer Check',
      description:
        'Run Pre-Prayer Check to test your microphone and confirm the sermon leader before you start.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    globalStep: 12,
    route: /^\/dashboard\/prayer-rooms\/[^/]+\/control$/,
    element: '[data-tour="control-host-mic"]',
    popover: {
      title: 'Host microphone',
      description:
        'Your host microphone carries sermon audio. Turn it on when you are ready to speak to the congregation.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    globalStep: 13,
    route: /^\/dashboard\/prayer-rooms\/[^/]+\/control$/,
    element: '[data-tour="control-congregation-mute"]',
    popover: {
      title: 'Sermon or open floor',
      description:
        'Sermon mode keeps congregants muted. Open the floor when you want them to hold to speak, one at a time.',
      side: 'top',
      align: 'end',
    },
  },
  {
    globalStep: 14,
    route: /^\/dashboard\/prayer-rooms\/[^/]+\/control$/,
    element: '[data-tour="control-roster"]',
    popover: {
      title: 'Congregation roster',
      description:
        'See who is connected, mic status, raised hands, and prayer requests. Press and hold a name for private prayer.',
      side: 'right',
      align: 'start',
    },
  },
  {
    globalStep: 15,
    route: /^\/dashboard\/prayer-rooms\/[^/]+\/control$/,
    element: '[data-tour="control-raised-hands"]',
    popover: {
      title: 'Raised hands',
      description:
        'When someone raises their hand, they appear here. Invite them to pray once the session is live.',
      side: 'left',
      align: 'start',
    },
  },
  {
    globalStep: 16,
    route: /^\/dashboard\/prayer-rooms\/[^/]+\/control$/,
    element: '[data-tour="control-chat-tab"]',
    popover: {
      title: 'Gathering chat',
      description: 'Monitor messages from the congregation during the gathering.',
      side: 'bottom',
      align: 'center',
    },
  },
  {
    globalStep: 17,
    route: /^\/dashboard\/prayer-rooms\/[^/]+\/control$/,
    element: '[data-tour="control-end"]',
    popover: {
      title: 'End the session',
      description:
        'When prayer is finished, end the session here. You can replay this walkthrough anytime from the sidebar.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export function matchesPastorRoute(path: string, route: PastorRouteMatcher): boolean {
  if (typeof route === 'string') return path === route;
  return route.test(path);
}

export function parseRoomIdFromPath(path: string): string | undefined {
  const match = path.match(/^\/dashboard\/prayer-rooms\/([^/]+)(?:\/|$)/);
  if (!match) return undefined;
  const id = match[1];
  if (id === 'new') return undefined;
  return id;
}
