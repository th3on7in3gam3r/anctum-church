import { z } from 'zod';

export {
  createPrayerRoomSchema,
  updatePrayerRoomSchema,
  type CreatePrayerRoomInput,
  type UpdatePrayerRoomInput,
} from '../../../shared/prayerRoom.ts';

export const prayerRequestSchema = z.object({
  request: z.string().min(5, 'Prayer request must be at least 5 characters').max(600, 'Prayer request cannot exceed 600 characters'),
  isPrivate: z.boolean().default(false),
  participantName: z.string().min(2, 'Name is required').max(50, 'Name cannot exceed 50 characters'),
});

export type PrayerRequestInput = z.infer<typeof prayerRequestSchema>;

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const onboardingSchema = z.object({
  churchName: z.string().min(3, 'Church name must be at least 3 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  country: z.string().min(2, 'Country is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  primaryContactName: z.string().min(2, 'Contact name is required'),
  primaryContactEmail: z.string().email('Valid contact email is required'),
  phone: z.string().optional(),
});
