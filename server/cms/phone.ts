import type { MemberImportRow } from '../../shared/validations/cms.ts';
import { CHURCH_MEMBER_STATUSES } from '../../shared/validations/cms.ts';

export function normalizePhone(value: string | null | undefined): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return `256${digits.slice(1)}`;
  return digits;
}

export type ImportPlanAction = 'insert' | 'duplicate' | 'invalid';

export interface PlannedImportRow extends MemberImportRow {
  action: ImportPlanAction;
  reason?: string;
  phoneNormalized: string;
  statusValue: (typeof CHURCH_MEMBER_STATUSES)[number];
}

export function planMemberImport(rows: MemberImportRow[], existingPhones: Array<string | null | undefined>): PlannedImportRow[] {
  const seen = new Set(existingPhones.map((phone) => normalizePhone(phone)).filter(Boolean));
  return rows.map((row) => {
    const firstName = row.firstName.trim();
    const lastName = row.lastName.trim();
    const phoneNormalized = normalizePhone(row.phone);
    const statusValue = (CHURCH_MEMBER_STATUSES as readonly string[]).includes(row.status.trim().toUpperCase())
      ? (row.status.trim().toUpperCase() as PlannedImportRow['statusValue'])
      : 'VISITOR';
    if (!firstName || !lastName) {
      return {
        ...row,
        firstName,
        lastName,
        action: 'invalid',
        reason: 'First and last name are required.',
        phoneNormalized,
        statusValue,
      };
    }
    if (phoneNormalized && seen.has(phoneNormalized)) {
      return {
        ...row,
        firstName,
        lastName,
        action: 'duplicate',
        reason: 'This phone number is already in the church.',
        phoneNormalized,
        statusValue,
      };
    }
    if (phoneNormalized) seen.add(phoneNormalized);
    return { ...row, firstName, lastName, action: 'insert', phoneNormalized, statusValue };
  });
}
