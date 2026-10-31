import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  Calendar,
  FileText,
  History,
  Home,
  Images,
  LayoutDashboard,
  Mail,
  Radio,
  Settings,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { hasAreaLevel, type AccessArea, type AccessLevel, type ChurchAccess, type FeatureKey } from '../../shared/churchSetup.ts';

export interface StaffNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  feature?: FeatureKey;
  area?: AccessArea;
  level?: AccessLevel;
  setupOnly?: boolean;
}

export interface StaffNavSection {
  title: string | null;
  items: StaffNavItem[];
}

const SECTIONS: StaffNavSection[] = [
  {
    title: null,
    items: [
      { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Prayer Rooms', path: '/dashboard/prayer-rooms', icon: Radio, feature: 'prayerRooms', area: 'prayer', level: 1 },
      { label: 'Prayer Requests', path: '/dashboard/prayer-requests', icon: FileText, feature: 'prayerRequests', area: 'prayer', level: 1 },
      { label: 'Participants', path: '/dashboard/participants', icon: Users, feature: 'prayerRooms', area: 'prayer', level: 2 },
      { label: 'History', path: '/dashboard/history', icon: History, feature: 'prayerRooms', area: 'prayer', level: 1 },
    ],
  },
  {
    title: 'Church',
    items: [
      { label: 'Overview', path: '/dashboard/church', icon: LayoutDashboard, area: 'people', level: 1 },
      { label: 'Members', path: '/dashboard/church/members', icon: Users, feature: 'members', area: 'people', level: 1 },
      { label: 'Households', path: '/dashboard/church/households', icon: Home, feature: 'members', area: 'people', level: 1 },
      { label: 'Groups', path: '/dashboard/church/groups', icon: Users, feature: 'members', area: 'people', level: 1 },
      { label: 'Visitors', path: '/dashboard/church/visitors', icon: Mail, feature: 'visitors', area: 'people', level: 1 },
      { label: 'Events', path: '/dashboard/church/events', icon: Calendar, feature: 'events', area: 'events', level: 1 },
      { label: 'Sermons', path: '/dashboard/church/sermons', icon: BookOpen, feature: 'sermons', area: 'media', level: 1 },
      { label: 'Gallery', path: '/dashboard/gallery', icon: Images, feature: 'gallery', area: 'media', level: 1 },
      { label: 'Announcements', path: '/dashboard/church/announcements', icon: Bell, feature: 'announcements', area: 'communication', level: 1 },
      { label: 'Leaders', path: '/dashboard/church/leaders', icon: Users, feature: 'website', area: 'website', level: 1 },
      { label: 'Visit questions', path: '/dashboard/church/faqs', icon: FileText, feature: 'website', area: 'website', level: 1 },
      { label: 'Website Pages', path: '/dashboard/church/pages', icon: FileText, feature: 'website', area: 'website', level: 1 },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Church setup', path: '/dashboard/setup', icon: SlidersHorizontal, setupOnly: true },
      { label: 'Prayer settings', path: '/dashboard/settings', icon: Settings, setupOnly: true },
    ],
  },
];

export function navItemAllowed(
  item: StaffNavItem,
  access: ChurchAccess | null,
  features: Record<FeatureKey, boolean>
): boolean {
  if (item.feature && !features[item.feature]) return false;
  // Churches without roles yet keep the original menu.
  if (!access) return true;
  if (item.setupOnly) return access.canManageSetup;
  if (item.area) return hasAreaLevel(access, item.area, item.level ?? 1);
  return true;
}

export function staffNav(access: ChurchAccess | null, features: Record<FeatureKey, boolean>): StaffNavSection[] {
  return SECTIONS.map((section) => ({
    title: section.title,
    items: section.items.filter((item) => navItemAllowed(item, access, features)),
  })).filter((section) => section.items.length > 0);
}

/** The menu entry that owns a path: the longest matching path wins. */
export function navItemForPath(path: string): StaffNavItem | null {
  let best: StaffNavItem | null = null;
  for (const section of SECTIONS) {
    for (const item of section.items) {
      const matches = item.path === '/dashboard' ? path === '/dashboard' : path === item.path || path.startsWith(`${item.path}/`);
      if (matches && (!best || item.path.length > best.path.length)) best = item;
    }
  }
  return best;
}
