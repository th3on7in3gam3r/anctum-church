import { z, type ZodError } from 'zod';
import { ValidationError } from './errors.ts';

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const ROOM_TYPES = ['AUDIO_PRAYER', 'PRAYER_LEADER_VIDEO', 'EVENT'] as const;
export const SPEAKER_PERMISSIONS = ['ADMIN_APPROVAL_REQUIRED', 'PRAYER_LEADERS', 'OPEN_MICROPHONE'] as const;
export const RECURRENCE_RULES = ['DAILY', 'WEEKLY', 'SELECTED_DAYS'] as const;

const MAX_ATTENDANCE = 50_000;
const MAX_LOGO_LENGTH = 1_500_000;

export function isSupportedTimeZone(value: string): boolean {
  if (!value.trim()) return false;
  try {
    return Intl.supportedValuesOf('timeZone').includes(value);
  } catch {
    try {
      Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }
}

export function listTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['Africa/Kampala', 'UTC'];
  }
}

export function isLogoReference(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('data:image/')) return trimmed.length <= MAX_LOGO_LENGTH;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const attendance = z
  .number()
  .int('Expected attendance must be a whole number')
  .min(1, 'Expected attendance must be at least 1')
  .max(MAX_ATTENDANCE, 'Maximum 50,000 for a single room');

const prayerRoomFields = {
  name: z.string().min(3, 'Prayer name must be at least 3 characters').max(80, 'Prayer name cannot exceed 80 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(400, 'Description cannot exceed 400 characters').optional(),
  logoUrl: z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z
      .string()
      .refine(isLogoReference, 'Logo must be an uploaded image or a public http or https URL')
      .optional()
  ),
  roomType: z.enum(ROOM_TYPES),
  expectedAttendance: attendance,
  scheduledStart: z.string().min(1, 'Please select a gathering start time'),
  timezone: z.string().min(1, 'Timezone is required').refine(isSupportedTimeZone, 'Choose a valid timezone'),
  isRecurring: z.boolean(),
  recurrenceRule: z.enum(RECURRENCE_RULES).optional(),
  selectedDays: z.array(z.enum(WEEKDAYS)),
  oneTimeDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a gathering date')
    .nullable()
    .optional(),
  durationMinutes: z.number().int().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration cannot exceed 8 hours'),
  speakerPermission: z.enum(SPEAKER_PERMISSIONS),
  recordingEnabled: z.boolean(),
  sermonLeaderUserId: z.string().min(1).nullable().optional(),
  coHostUserIds: z.array(z.string().min(1)),
  passcode: z.union([z.string().min(4, 'Passcode must be at least 4 characters').max(64), z.literal(''), z.null()]).optional(),
  allowGuests: z.boolean(),
  prayerRequestsEnabled: z.boolean(),
  anonymousRequestsAllowed: z.boolean(),
  chatEnabled: z.boolean(),
};

function refineSchedule(
  data: {
    isRecurring?: boolean;
    recurrenceRule?: (typeof RECURRENCE_RULES)[number];
    selectedDays?: string[];
    oneTimeDate?: string | null;
  },
  ctx: z.RefinementCtx
) {
  if (typeof data.isRecurring !== 'boolean') return;
  if (data.isRecurring) {
    if (data.recurrenceRule === 'WEEKLY' && (data.selectedDays?.length ?? 0) !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['selectedDays'],
        message: 'Weekly rooms use exactly one day.',
      });
    }
    if (data.recurrenceRule === 'SELECTED_DAYS' && (data.selectedDays?.length ?? 0) < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['selectedDays'],
        message: 'Choose at least one day.',
      });
    }
    return;
  }
  if (!data.oneTimeDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.oneTimeDate)) {
    ctx.addIssue({
      code: 'custom',
      path: ['oneTimeDate'],
      message: 'Choose the gathering date.',
    });
  }
}

export const createPrayerRoomSchema = z
  .object({
    ...prayerRoomFields,
    roomType: z.enum(ROOM_TYPES).default('AUDIO_PRAYER'),
    isRecurring: z.boolean().default(false),
    selectedDays: z.array(z.enum(WEEKDAYS)).default([]),
    durationMinutes: z
      .number()
      .int()
      .min(15, 'Duration must be at least 15 minutes')
      .max(480, 'Duration cannot exceed 8 hours')
      .default(60),
    speakerPermission: z.enum(SPEAKER_PERMISSIONS).default('ADMIN_APPROVAL_REQUIRED'),
    recordingEnabled: z.boolean().default(false),
    coHostUserIds: z.array(z.string().min(1)).default([]),
    allowGuests: z.boolean().default(true),
    prayerRequestsEnabled: z.boolean().default(true),
    anonymousRequestsAllowed: z.boolean().default(true),
    chatEnabled: z.boolean().default(true),
  })
  .superRefine(refineSchedule);

export const updatePrayerRoomSchema = z
  .object(prayerRoomFields)
  .partial()
  .superRefine((data, ctx) => {
    if (typeof data.isRecurring !== 'boolean') return;
    refineSchedule(data, ctx);
  });

export type CreatePrayerRoomInput = z.infer<typeof createPrayerRoomSchema>;
export type UpdatePrayerRoomInput = z.infer<typeof updatePrayerRoomSchema>;

export function validationErrorFromZod(error: ZodError): ValidationError {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : 'form';
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  if (!Object.keys(fieldErrors).length) fieldErrors.form = 'Please review the form errors';
  return new ValidationError(fieldErrors);
}
