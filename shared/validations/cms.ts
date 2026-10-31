import { z, type ZodError } from 'zod';
import { ValidationError } from '../errors.ts';

export const CHURCH_MEMBER_STATUSES = ['VISITOR', 'REGULAR', 'MEMBER', 'INACTIVE'] as const;
export const CHURCH_GROUP_TYPES = ['MINISTRY', 'CELL', 'DEPARTMENT', 'CHOIR', 'OTHER'] as const;
export const GROUP_MEMBER_ROLES = ['LEADER', 'MEMBER'] as const;
export const VISITOR_CARD_SOURCES = ['PLAN_A_VISIT', 'CONTACT', 'PRAYER'] as const;
export const VISITOR_CARD_STATUSES = ['NEW', 'CONTACTED', 'DONE'] as const;

const optionalText = z.string().trim().max(500).optional().nullable();
const requiredName = z.string().trim().min(1, 'Name is required').max(80);

export const pageBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('heading'),
    text: z.string().trim().min(1, 'Heading text is required').max(200),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  }),
  z.object({
    type: z.literal('paragraph'),
    text: z.string().trim().max(4000),
  }),
  z.object({
    type: z.literal('image'),
    url: z.string().trim().min(1, 'Image address is required').max(2000),
    alt: z.string().trim().max(200).optional(),
  }),
  z.object({
    type: z.literal('button'),
    label: z.string().trim().min(1, 'Button label is required').max(80),
    href: z.string().trim().min(1, 'Button link is required').max(2000),
  }),
  z.object({
    type: z.literal('scripture'),
    reference: z.string().trim().min(1, 'Scripture reference is required').max(120),
    text: z.string().trim().min(1, 'Scripture text is required').max(2000),
  }),
]);

export const pageBodySchema = z.array(pageBlockSchema).max(40);

const timestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date and time');
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-10-13');
const birthMonthDay = z
  .string()
  .regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Use month and day, like 04-12')
  .optional()
  .nullable()
  .or(z.literal(''));

export const householdSchema = z.object({
  name: requiredName,
  address: optionalText,
  phone: optionalText,
});

export const memberSchema = z.object({
  firstName: requiredName,
  lastName: requiredName,
  phone: optionalText,
  email: z.string().trim().email('Enter a valid email').optional().nullable().or(z.literal('')),
  gender: optionalText,
  birthMonthDay,
  status: z.enum(CHURCH_MEMBER_STATUSES).default('VISITOR'),
  joinedAt: timestamp.optional().nullable().or(z.literal('')),
  notes: z.string().trim().max(4000).optional().nullable(),
  householdId: z.string().trim().min(1).optional().nullable().or(z.literal('')),
  userId: z.string().trim().min(1).optional().nullable().or(z.literal('')),
});

export const groupSchema = z.object({
  name: requiredName,
  type: z.enum(CHURCH_GROUP_TYPES).default('OTHER'),
  leaderMemberId: z.string().trim().min(1).optional().nullable().or(z.literal('')),
  description: optionalText,
  showOnWebsite: z.boolean().default(false),
  publicDescription: optionalText,
  meetingTime: optionalText,
  imageUrl: optionalText,
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const leaderSchema = z.object({
  name: requiredName,
  role: requiredName,
  photoUrl: optionalText,
  bio: z.string().trim().max(4000).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const faqSchema = z.object({
  question: requiredName,
  answer: z.string().trim().min(1, 'Answer is required').max(4000),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export const groupMemberSchema = z.object({
  memberId: z.string().trim().min(1, 'Choose a member'),
  role: z.enum(GROUP_MEMBER_ROLES).default('MEMBER'),
});

export const pageSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  title: requiredName,
  body: pageBodySchema.default([]),
  heroImageUrl: optionalText,
  isPublished: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const announcementSchema = z.object({
  title: requiredName,
  body: z.string().trim().min(1, 'Announcement text is required').max(4000),
  startsAt: timestamp,
  endsAt: timestamp.optional().nullable().or(z.literal('')),
  isPinned: z.boolean().default(false),
});

export const eventSchema = z.object({
  title: requiredName,
  description: z.string().trim().max(4000).optional().default(''),
  startsAt: timestamp,
  endsAt: timestamp,
  location: z.string().trim().min(1, 'Location is required').max(200),
  imageUrl: optionalText,
  rsvpEnabled: z.boolean().default(false),
  prayerRoomId: z.string().trim().min(1).optional().nullable().or(z.literal('')),
});

export const sermonSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  speaker: requiredName,
  seriesName: optionalText,
  scripture: optionalText,
  preachedOn: day,
  youtubeUrl: optionalText,
  audioUrl: optionalText,
  notes: z.string().trim().max(8000).optional().nullable(),
  isPublished: z.boolean().default(false),
});

export const visitorCardSchema = z.object({
  name: requiredName,
  phone: z.string().trim().min(7, 'Phone number is required').max(30),
  email: z.string().trim().email('Enter a valid email').optional().nullable().or(z.literal('')),
  message: z.string().trim().max(2000).optional().nullable(),
  service: z.string().trim().max(120).optional().nullable().or(z.literal('')),
  source: z.enum(VISITOR_CARD_SOURCES),
  company: z.string().optional(),
});

export const visitorStatusSchema = z.object({
  status: z.enum(VISITOR_CARD_STATUSES),
});

export const eventRsvpSchema = z.object({
  name: requiredName,
  phone: z.string().trim().min(7, 'Phone number is required').max(30),
  count: z.number().int().min(1).max(20).default(1),
  company: z.string().optional(),
});

export const memberImportRowSchema = z.object({
  firstName: z.string().optional().default(''),
  lastName: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  gender: z.string().optional().default(''),
  status: z.string().optional().default(''),
  household: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export const memberImportSchema = z.object({
  rows: z.array(memberImportRowSchema).min(1, 'Add at least one row').max(500, 'Import up to 500 rows at a time'),
});

export type PageBlock = z.infer<typeof pageBlockSchema>;
export type MemberImportRow = z.infer<typeof memberImportRowSchema>;

export function cmsValidationError(error: ZodError): ValidationError {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path.join('.')) : 'form';
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  if (!Object.keys(fieldErrors).length) fieldErrors.form = 'Please review the form errors';
  return new ValidationError(fieldErrors);
}
