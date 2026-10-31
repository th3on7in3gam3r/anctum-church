import { Organization } from '../types';

/** Shape default for AuthContext before /api/me. Not dashboard content. */
export const SEED_ORGANIZATION: Organization = {
  id: 'org_pending',
  name: '',
  slug: 'church',
  country: 'Uganda',
  timezone: 'Africa/Kampala',
  website: '',
  primaryContactName: '',
  primaryContactEmail: '',
  phone: '',
  accentColor: '#203C32',
  joinPageMessage: 'Join your church family in prayer.',
  defaultSermonSpeaker: '',
  speakerAliases: [],
  defaultRoomType: 'AUDIO_PRAYER',
  defaultSpeakerPermission: 'ADMIN_APPROVAL_REQUIRED',
  defaultRecording: false,
  defaultExpectedAttendance: 2000,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-08-18T00:00:00.000Z',
};
