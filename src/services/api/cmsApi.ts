import { ApiClientError } from './sanctumApi';

let getAccessToken: (() => Promise<string | null>) | null = null;

export function setCmsAccessTokenGetter(getter: (() => Promise<string | null>) | null): void {
  getAccessToken = getter;
}

async function cmsFetch<T>(path: string, init: RequestInit | undefined, organizationId: string): Promise<T> {
  const token = getAccessToken ? await getAccessToken() : null;
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-organization-id': organizationId,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = body.details && typeof body.details === 'object' ? body.details : null;
    const fieldErrors =
      details && details.fieldErrors && typeof details.fieldErrors === 'object'
        ? (details.fieldErrors as Record<string, string>)
        : null;
    throw new ApiClientError(
      typeof body.error === 'string' ? body.error : 'REQUEST_FAILED',
      typeof body.message === 'string' ? body.message : 'Request failed',
      response.status,
      fieldErrors
    );
  }
  return body as T;
}

export interface CmsMember {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  birthMonthDay: string | null;
  status: 'VISITOR' | 'REGULAR' | 'MEMBER' | 'INACTIVE';
  joinedAt: string | null;
  notes: string | null;
  householdId: string | null;
  household: { id: string; name: string } | null;
  groups: Array<{ role: string; group: { id: string; name: string; type: string } }>;
}

export interface CmsHousehold {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  _count?: { members: number };
}

export interface CmsGroup {
  id: string;
  name: string;
  type: string;
  description: string | null;
  leaderMemberId: string | null;
  showOnWebsite?: boolean;
  publicDescription?: string | null;
  meetingTime?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  leader: { id: string; firstName: string; lastName: string; userId: string | null } | null;
  members: Array<{ role: string; member: { id: string; firstName: string; lastName: string; phone: string | null } }>;
}

export interface CmsPageBlock {
  type: 'heading' | 'paragraph' | 'image' | 'button' | 'scripture';
  text?: string;
  level?: 1 | 2 | 3;
  url?: string;
  alt?: string;
  label?: string;
  href?: string;
  reference?: string;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  body: CmsPageBlock[];
  heroImageUrl: string | null;
  isPublished: boolean;
  isPlaceholder?: boolean;
  sortOrder: number;
}

export interface CmsAnnouncement {
  id: string;
  title: string;
  body: string;
  startsAt: string;
  endsAt: string | null;
  isPinned: boolean;
  isPlaceholder?: boolean;
}

export interface CmsEvent {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  imageUrl: string | null;
  rsvpEnabled: boolean;
  prayerRoomId?: string | null;
  prayerRoom?: { id: string; name: string; slug: string } | null;
  isPlaceholder?: boolean;
  _count?: { rsvps: number };
}

export interface CmsSermon {
  id: string;
  title: string;
  sourceTitle?: string | null;
  speaker: string;
  seriesName: string | null;
  scripture: string | null;
  preachedOn: string;
  youtubeUrl: string | null;
  youtubeVideoId?: string | null;
  thumbnailUrl?: string | null;
  audioUrl: string | null;
  notes: string | null;
  isPublished: boolean;
  status?: 'DRAFT' | 'PUBLISHED';
  isPlaceholder?: boolean;
}

export interface CmsVisitor {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  service?: string | null;
  source: 'PLAN_A_VISIT' | 'CONTACT' | 'PRAYER';
  status: 'NEW' | 'CONTACTED' | 'DONE';
  createdAt: string;
}

export interface CmsLeader {
  id: string;
  name: string;
  role: string;
  photoUrl: string | null;
  bio: string | null;
  sortOrder: number;
  isPlaceholder?: boolean;
}

export interface CmsFaq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPlaceholder?: boolean;
}

export interface ImportPlanRow {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  action: 'insert' | 'duplicate' | 'invalid';
  reason?: string;
}

export const cmsApi = {
  listMembers: (organizationId: string, filters: { q?: string; status?: string; groupId?: string }) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.status) params.set('status', filters.status);
    if (filters.groupId) params.set('groupId', filters.groupId);
    const query = params.toString();
    return cmsFetch<{ members: CmsMember[] }>(`/api/cms/members${query ? `?${query}` : ''}`, undefined, organizationId);
  },
  saveMember: (organizationId: string, id: string | null, body: Record<string, unknown>) =>
    cmsFetch<{ member: CmsMember }>(id ? `/api/cms/members/${id}` : '/api/cms/members', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }, organizationId),
  deleteMember: (organizationId: string, id: string) =>
    cmsFetch(`/api/cms/members/${id}`, { method: 'DELETE' }, organizationId),
  previewImport: (organizationId: string, rows: Array<Record<string, string>>) =>
    cmsFetch<{ rows: ImportPlanRow[] }>('/api/cms/members/import/preview', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }, organizationId),
  commitImport: (organizationId: string, rows: Array<Record<string, string>>) =>
    cmsFetch<{ inserted: number; skipped: number }>('/api/cms/members/import/commit', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }, organizationId),
  listHouseholds: (organizationId: string) =>
    cmsFetch<{ households: CmsHousehold[] }>('/api/cms/households', undefined, organizationId),
  saveHousehold: (organizationId: string, id: string | null, body: Record<string, unknown>) =>
    cmsFetch<{ household: CmsHousehold }>(id ? `/api/cms/households/${id}` : '/api/cms/households', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }, organizationId),
  deleteHousehold: (organizationId: string, id: string) =>
    cmsFetch(`/api/cms/households/${id}`, { method: 'DELETE' }, organizationId),
  listGroups: (organizationId: string) => cmsFetch<{ groups: CmsGroup[] }>('/api/cms/groups', undefined, organizationId),
  saveGroup: (organizationId: string, id: string | null, body: Record<string, unknown>) =>
    cmsFetch<{ group: CmsGroup }>(id ? `/api/cms/groups/${id}` : '/api/cms/groups', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }, organizationId),
  deleteGroup: (organizationId: string, id: string) =>
    cmsFetch(`/api/cms/groups/${id}`, { method: 'DELETE' }, organizationId),
  addGroupMember: (organizationId: string, groupId: string, body: { memberId: string; role: string }) =>
    cmsFetch(`/api/cms/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(body) }, organizationId),
  removeGroupMember: (organizationId: string, groupId: string, memberId: string) =>
    cmsFetch(`/api/cms/groups/${groupId}/members/${memberId}`, { method: 'DELETE' }, organizationId),
  listPages: (organizationId: string) => cmsFetch<{ pages: CmsPage[] }>('/api/cms/pages', undefined, organizationId),
  savePage: (organizationId: string, id: string | null, body: Record<string, unknown>) =>
    cmsFetch<{ page: CmsPage }>(id ? `/api/cms/pages/${id}` : '/api/cms/pages', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }, organizationId),
  deletePage: (organizationId: string, id: string) => cmsFetch(`/api/cms/pages/${id}`, { method: 'DELETE' }, organizationId),
  listAnnouncements: (organizationId: string) =>
    cmsFetch<{ announcements: CmsAnnouncement[] }>('/api/cms/announcements', undefined, organizationId),
  saveAnnouncement: (organizationId: string, id: string | null, body: Record<string, unknown>) =>
    cmsFetch<{ announcement: CmsAnnouncement }>(id ? `/api/cms/announcements/${id}` : '/api/cms/announcements', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }, organizationId),
  deleteAnnouncement: (organizationId: string, id: string) =>
    cmsFetch(`/api/cms/announcements/${id}`, { method: 'DELETE' }, organizationId),
  listEvents: (organizationId: string) => cmsFetch<{ events: CmsEvent[] }>('/api/cms/events', undefined, organizationId),
  saveEvent: (organizationId: string, id: string | null, body: Record<string, unknown>) =>
    cmsFetch<{ event: CmsEvent }>(id ? `/api/cms/events/${id}` : '/api/cms/events', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }, organizationId),
  deleteEvent: (organizationId: string, id: string) =>
    cmsFetch(`/api/cms/events/${id}`, { method: 'DELETE' }, organizationId),
  listSermons: (organizationId: string) => cmsFetch<{ sermons: CmsSermon[] }>('/api/cms/sermons', undefined, organizationId),
  saveSermon: (organizationId: string, id: string | null, body: Record<string, unknown>) =>
    cmsFetch<{ sermon: CmsSermon }>(id ? `/api/cms/sermons/${id}` : '/api/cms/sermons', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }, organizationId),
  deleteSermon: (organizationId: string, id: string) =>
    cmsFetch(`/api/cms/sermons/${id}`, { method: 'DELETE' }, organizationId),
  lookupYoutube: (organizationId: string, url: string) =>
    cmsFetch<{
      videoId: string;
      title: string;
      sourceTitle: string;
      speaker: string | null;
      scripture: string | null;
      seriesName: string | null;
      authorName: string;
      thumbnailUrl: string;
    }>(
      `/api/cms/youtube/lookup?url=${encodeURIComponent(url)}`,
      undefined,
      organizationId
    ),
  saveYoutubeChannel: (organizationId: string, body: { input: string; defaultSermonSpeaker: string; speakerAliases: string[] }) =>
    cmsFetch<{ organization: Record<string, unknown>; channelTitle: string; message: string }>(
      '/api/cms/youtube/channel',
      { method: 'POST', body: JSON.stringify(body) },
      organizationId
    ),
  importYoutube: (organizationId: string) =>
    cmsFetch<{ created: number }>('/api/cms/youtube/import', { method: 'POST' }, organizationId),
  publishSermon: (organizationId: string, id: string) =>
    cmsFetch<{ sermon: CmsSermon }>(`/api/cms/sermons/${id}/publish`, { method: 'POST' }, organizationId),
  ignoreSermon: (organizationId: string, id: string) =>
    cmsFetch<{ ignored: true }>(`/api/cms/sermons/${id}/ignore`, { method: 'POST' }, organizationId),
  sendSermonToGallery: (organizationId: string, id: string) =>
    cmsFetch<{ video: { id: string } }>(`/api/cms/sermons/${id}/send-to-gallery`, { method: 'POST' }, organizationId),
  moveSermonToGallery: (organizationId: string, id: string) =>
    cmsFetch<{ video: { id: string } }>(`/api/cms/sermons/${id}/move-to-gallery`, { method: 'POST' }, organizationId),
  listGalleryAlbums: (organizationId: string) =>
    cmsFetch<{ reviewCount: number; albums: Array<Record<string, unknown>> }>('/api/cms/gallery/albums', undefined, organizationId),
  createGalleryAlbum: (organizationId: string, body: Record<string, unknown>) =>
    cmsFetch<{ album: { id: string } }>('/api/cms/gallery/albums', { method: 'POST', body: JSON.stringify(body) }, organizationId),
  galleryAlbum: (organizationId: string, id: string) =>
    cmsFetch<{ album: Record<string, unknown> }>(`/api/cms/gallery/albums/${id}`, undefined, organizationId),
  saveGalleryAlbum: (organizationId: string, id: string, body: Record<string, unknown>) =>
    cmsFetch<{ album: Record<string, unknown> }>(`/api/cms/gallery/albums/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, organizationId),
  submitGalleryAlbum: (organizationId: string, id: string) =>
    cmsFetch(`/api/cms/gallery/albums/${id}/submit`, { method: 'POST' }, organizationId),
  publishGalleryAlbum: (organizationId: string, id: string) =>
    cmsFetch(`/api/cms/gallery/albums/${id}/publish`, { method: 'POST' }, organizationId),
  archiveGalleryAlbum: (organizationId: string, id: string) =>
    cmsFetch(`/api/cms/gallery/albums/${id}/archive`, { method: 'POST' }, organizationId),
  galleryUploadSignature: (organizationId: string, id: string) =>
    cmsFetch<Record<string, string | number>>(`/api/cms/gallery/albums/${id}/upload-signature`, { method: 'POST' }, organizationId),
  saveGalleryPhoto: (organizationId: string, albumId: string, body: Record<string, unknown>) =>
    cmsFetch(`/api/cms/gallery/albums/${albumId}/photos`, { method: 'POST', body: JSON.stringify(body) }, organizationId),
  updateGalleryPhoto: (organizationId: string, albumId: string, photoId: string, body: Record<string, unknown>) =>
    cmsFetch(`/api/cms/gallery/albums/${albumId}/photos/${photoId}`, { method: 'PATCH', body: JSON.stringify(body) }, organizationId),
  confirmGalleryConsent: (organizationId: string, albumId: string, photoId: string) =>
    cmsFetch(`/api/cms/gallery/albums/${albumId}/photos/${photoId}/consent`, { method: 'POST' }, organizationId),
  reorderGalleryPhotos: (organizationId: string, albumId: string, photoIds: string[]) =>
    cmsFetch(`/api/cms/gallery/albums/${albumId}/photos/reorder`, { method: 'POST', body: JSON.stringify({ photoIds }) }, organizationId),
  lookupGalleryVideo: (organizationId: string, url: string) =>
    cmsFetch<{ provider: 'YOUTUBE' | 'TIKTOK'; externalId: string; title: string; thumbnailUrl: string }>(
      '/api/cms/gallery/videos/lookup',
      { method: 'POST', body: JSON.stringify({ url }) },
      organizationId
    ),
  addGalleryVideo: (organizationId: string, body: Record<string, unknown>) =>
    cmsFetch('/api/cms/gallery/videos', { method: 'POST', body: JSON.stringify(body) }, organizationId),
  listVisitors: (organizationId: string) =>
    cmsFetch<{ visitors: CmsVisitor[] }>('/api/cms/visitors', undefined, organizationId),
  updateVisitor: (organizationId: string, id: string, status: CmsVisitor['status']) =>
    cmsFetch<{ visitor: CmsVisitor }>(`/api/cms/visitors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, organizationId),
  deleteVisitor: (organizationId: string, id: string) =>
    cmsFetch(`/api/cms/visitors/${id}`, { method: 'DELETE' }, organizationId),
  listLeaders: (organizationId: string) => cmsFetch<{ leaders: CmsLeader[] }>('/api/cms/leaders', undefined, organizationId),
  saveLeader: (organizationId: string, id: string | null, body: Record<string, unknown>) =>
    cmsFetch<{ leader: CmsLeader }>(id ? `/api/cms/leaders/${id}` : '/api/cms/leaders', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }, organizationId),
  deleteLeader: (organizationId: string, id: string) =>
    cmsFetch(`/api/cms/leaders/${id}`, { method: 'DELETE' }, organizationId),
  startHuddle: (organizationId: string, groupId: string) =>
    cmsFetch<{ room: { id: string; slug: string; name: string } }>(`/api/cms/groups/${groupId}/huddle`, { method: 'POST' }, organizationId),
  listFaqs: (organizationId: string) => cmsFetch<{ faqs: CmsFaq[] }>('/api/cms/faqs', undefined, organizationId),
  saveFaq: (organizationId: string, id: string | null, body: Record<string, unknown>) =>
    cmsFetch<{ faq: CmsFaq }>(id ? `/api/cms/faqs/${id}` : '/api/cms/faqs', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }, organizationId),
  deleteFaq: (organizationId: string, id: string) =>
    cmsFetch(`/api/cms/faqs/${id}`, { method: 'DELETE' }, organizationId),
};
