import { describe, expect, it } from 'vitest';
import { SanctumError } from '../shared/errors.ts';
import { assertInOrganization } from '../server/cms/access.ts';
import { normalizePhone, planMemberImport } from '../server/cms/phone.ts';
import { currentAnnouncements, publishedOnly, upcomingEvents } from '../server/cms/publicContent.ts';

describe('cms organization scope', () => {
  it('returns 404 when a staff member asks for another church record', () => {
    expect(() => assertInOrganization({ organizationId: 'org_other' }, 'org_plcc')).toThrow(SanctumError);
    try {
      assertInOrganization(null, 'org_plcc');
    } catch (error) {
      expect(error).toBeInstanceOf(SanctumError);
      expect((error as SanctumError).status).toBe(404);
      expect((error as SanctumError).code).toBe('CMS_NOT_FOUND');
    }
  });

  it('allows a record that belongs to the signed-in church', () => {
    const record = assertInOrganization({ id: 'member_1', organizationId: 'org_plcc' }, 'org_plcc');
    expect(record.id).toBe('member_1');
  });
});

describe('cms public content', () => {
  const now = new Date('2026-10-13T12:00:00.000Z');

  it('returns only published pages and sermons', () => {
    const pages = publishedOnly([
      { id: 'draft', isPublished: false },
      { id: 'live', isPublished: true },
    ]);
    expect(pages.map((page) => page.id)).toEqual(['live']);
  });

  it('hides announcements outside their window and past events', () => {
    const announcements = currentAnnouncements(
      [
        { id: 'future', startsAt: '2026-10-20T00:00:00.000Z', endsAt: null, isPinned: false },
        { id: 'open', startsAt: '2026-10-01T00:00:00.000Z', endsAt: null, isPinned: false },
        { id: 'ended', startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-10-01T00:00:00.000Z', isPinned: true },
      ],
      now
    );
    expect(announcements.map((row) => row.id)).toEqual(['open']);

    const events = upcomingEvents(
      [
        { id: 'past', startsAt: '2026-10-01T00:00:00.000Z' },
        { id: 'soon', startsAt: '2026-10-20T00:00:00.000Z' },
      ],
      now
    );
    expect(events.map((row) => row.id)).toEqual(['soon']);
  });
});

describe('cms member import', () => {
  it('treats local and international Uganda numbers as the same phone', () => {
    expect(normalizePhone('0772 000 000')).toBe(normalizePhone('+256772000000'));
  });

  it('collapses duplicate phones to one insert and skips numbers already in the church', () => {
    const fresh = planMemberImport(
      [
        { firstName: 'Amina', lastName: 'Kato', phone: '0772111111', email: '', gender: '', status: '', household: '', notes: '' },
        { firstName: 'Amina', lastName: 'Kato', phone: '+256772111111', email: '', gender: '', status: '', household: '', notes: '' },
      ],
      []
    );
    expect(fresh.map((row) => row.action)).toEqual(['insert', 'duplicate']);

    const existing = planMemberImport(
      [
        { firstName: 'Amina', lastName: 'Kato', phone: '0772000000', email: '', gender: '', status: 'MEMBER', household: '', notes: '' },
        { firstName: 'Amina', lastName: 'Again', phone: '+256 772 000 000', email: '', gender: '', status: '', household: '', notes: '' },
      ],
      ['0772000000']
    );
    expect(existing.map((row) => row.action)).toEqual(['duplicate', 'duplicate']);
    expect(existing.filter((row) => row.action === 'insert')).toHaveLength(0);
  });
});
