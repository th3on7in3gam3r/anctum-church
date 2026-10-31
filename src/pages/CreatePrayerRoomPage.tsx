import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { slugify, suggestAlternativeSlug } from '../lib/utils';
import { createPrayerRoomSchema } from '../../shared/prayerRoom.ts';
import { WEEKDAYS } from '../../shared/prayerRoom.ts';
import { formatClockTime, formatScheduledDisplay, getNextOccurrences, parseClockTime } from '../services/sessionScheduler';
import { BackButton } from '../components/common/BackButton';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { TimezoneSelect } from '../components/common/TimezoneSelect';
import { isHttpUrl } from '../components/common/LogoUrlField';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { useTour } from '../hooks/useTour';
import { TOUR_IDS } from '../tour/tourIds';
import { createRoomTourSteps } from '../tour/createRoomTour';
import { isPastorJourneyComplete } from '../tour/pastorJourney/storage';
import { sanctumApi } from '../services/api/sanctumApi';
import type { Organization, PrayerRoom, RoomType, SpeakerPermissionMode } from '../types';
import { Save, Radio, Shield, Users, Clock, AlertCircle, CircleHelp, KeyRound, MessageCircle, Upload } from 'lucide-react';

interface CreatePrayerRoomPageProps {
  onNavigate: (path: string, options?: { ignoreUnsaved?: boolean }) => void;
  roomId?: string;
}

type RecurrenceRule = 'DAILY' | 'WEEKLY' | 'SELECTED_DAYS';

interface RoomFormState {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  expectedAttendance: number;
  roomType: RoomType;
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule;
  selectedDays: string[];
  oneTimeDate: string;
  durationMinutes: number;
  scheduledStart: string;
  timezone: string;
  speakerPermission: SpeakerPermissionMode;
  recordingEnabled: boolean;
  sermonLeaderUserId: string;
  coHostUserIds: string[];
  passcode: string;
  clearPasscode: boolean;
  allowGuests: boolean;
  prayerRequestsEnabled: boolean;
  anonymousRequestsAllowed: boolean;
  chatEnabled: boolean;
}

interface MemberOption {
  userId: string;
  name: string;
  email: string;
  role: string;
}

const fieldClass =
  'w-full px-4 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#203C32] dark:focus:ring-[#C9A35A]';
const labelClass = 'block text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3] mb-1.5';

function initialForm(existing: PrayerRoom | null, organization: Organization): RoomFormState {
  if (existing) {
    return {
      name: existing.name,
      slug: existing.slug,
      description: existing.description || '',
      logoUrl: existing.logoUrl || '',
      expectedAttendance: existing.expectedAttendance,
      roomType: existing.roomType,
      isRecurring: existing.isRecurring,
      recurrenceRule: existing.recurrenceRule || 'DAILY',
      selectedDays: existing.selectedDays || [],
      oneTimeDate: existing.oneTimeDate || '',
      durationMinutes: existing.durationMinutes || 60,
      scheduledStart: existing.scheduledStart || '05:00 AM',
      timezone: existing.timezone || organization.timezone || 'Africa/Kampala',
      speakerPermission: existing.speakerPermission,
      recordingEnabled: existing.recordingEnabled,
      sermonLeaderUserId: existing.sermonLeaderUserId || '',
      coHostUserIds: existing.coHostUserIds || [],
      passcode: '',
      clearPasscode: false,
      allowGuests: existing.allowGuests !== false,
      prayerRequestsEnabled: existing.prayerRequestsEnabled !== false,
      anonymousRequestsAllowed: existing.anonymousRequestsAllowed !== false,
      chatEnabled: existing.chatEnabled !== false,
    };
  }
  return {
    name: '',
    slug: '',
    description: '',
    logoUrl: '',
    expectedAttendance: organization.defaultExpectedAttendance || 1000,
    roomType: organization.defaultRoomType || 'AUDIO_PRAYER',
    isRecurring: false,
    recurrenceRule: 'DAILY',
    selectedDays: [],
    oneTimeDate: '',
    durationMinutes: 60,
    scheduledStart: '05:00 AM',
    timezone: organization.timezone || 'Africa/Kampala',
    speakerPermission: organization.defaultSpeakerPermission || 'ADMIN_APPROVAL_REQUIRED',
    recordingEnabled: Boolean(organization.defaultRecording),
    sermonLeaderUserId: '',
    coHostUserIds: [],
    passcode: '',
    clearPasscode: false,
    allowGuests: true,
    prayerRequestsEnabled: true,
    anonymousRequestsAllowed: true,
    chatEnabled: true,
  };
}

function comparable(form: RoomFormState) {
  return {
    ...form,
    selectedDays: [...form.selectedDays].sort(),
    coHostUserIds: [...form.coHostUserIds].sort(),
    passcode: form.passcode.trim(),
    description: form.description.trim(),
    logoUrl: form.logoUrl.trim(),
    name: form.name,
    slug: form.slug,
  };
}

export const CreatePrayerRoomPage: React.FC<CreatePrayerRoomPageProps> = ({ onNavigate, roomId }) => {
  const { prayerRooms, createPrayerRoom, updatePrayerRoom, addToast, setHasUnsavedChanges } = useApp();
  const { organization, user } = useAuth();
  const existing = roomId ? prayerRooms.find((room) => room.id === roomId) || null : null;

  const [form, setForm] = useState<RoomFormState>(() => initialForm(existing, organization));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateSlugWarning, setDuplicateSlugWarning] = useState<{
    inUse: boolean;
    suggestedAlternative: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const { startTour } = useTour(TOUR_IDS.createRoom, createRoomTourSteps, {
    delayMs: 700,
    enabled: isPastorJourneyComplete() && !roomId,
  });

  useEffect(() => {
    if (!existing?.id) return;
    setForm(initialForm(existing, organization));
    setErrors({});
    setDuplicateSlugWarning(null);
  }, [existing?.id]);

  useEffect(() => {
    let cancelled = false;
    sanctumApi
      .listHostCandidates({ userId: user?.id, organizationId: organization.id })
      .then((result) => {
        if (!cancelled) setMembers(result.members);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, organization.id]);

  const baseline = useMemo(
    () => comparable(initialForm(existing, organization)),
    [
      existing?.id,
      existing?.updatedAt,
      organization.id,
      organization.defaultRoomType,
      organization.defaultSpeakerPermission,
      organization.defaultRecording,
      organization.defaultExpectedAttendance,
      organization.timezone,
    ]
  );
  const isDirty = useMemo(() => JSON.stringify(comparable(form)) !== JSON.stringify(baseline), [form, baseline]);
  useUnsavedChanges(isDirty);

  const previewRoom = useMemo<PrayerRoom>(
    () => ({
      id: existing?.id || 'preview',
      organizationId: organization.id,
      name: form.name || 'Prayer room',
      slug: form.slug || 'preview',
      roomType: form.roomType,
      expectedAttendance: form.expectedAttendance,
      speakerPermission: form.speakerPermission,
      isRecurring: form.isRecurring,
      recurrenceRule: form.recurrenceRule,
      selectedDays: form.selectedDays,
      oneTimeDate: form.oneTimeDate || undefined,
      durationMinutes: form.durationMinutes,
      scheduledStart: form.scheduledStart,
      timezone: form.timezone,
      recordingEnabled: false,
      status: 'SCHEDULED',
      permanentUrl: `/join/${form.slug || 'preview'}`,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: existing?.updatedAt || new Date().toISOString(),
    }),
    [existing, form, organization.id]
  );
  const nextGatherings = useMemo(() => {
    try {
      return getNextOccurrences(previewRoom, 5);
    } catch {
      return [];
    }
  }, [previewRoom]);

  const backTo = existing ? `/dashboard/prayer-rooms/${existing.id}` : '/dashboard/prayer-rooms';
  const backLabel = existing ? 'Back to Prayer Room' : 'Back to Prayer Rooms';

  const patch = (updates: Partial<RoomFormState>) => setForm((prev) => ({ ...prev, ...updates }));

  const handleNameChange = (val: string) => {
    const next: Partial<RoomFormState> = { name: val };
    if (!existing) {
      const generatedSlug = slugify(val);
      next.slug = generatedSlug;
      checkSlugDuplicate(generatedSlug);
    }
    patch(next);
  };

  const handleSlugChange = (val: string) => {
    const cleanSlug = slugify(val);
    patch({ slug: cleanSlug });
    checkSlugDuplicate(cleanSlug);
  };

  const checkSlugDuplicate = (targetSlug: string) => {
    const normalized = targetSlug.toLowerCase().trim();
    if (!normalized) {
      setDuplicateSlugWarning(null);
      return;
    }
    const otherRooms = prayerRooms.filter((room) => (!existing ? true : room.id !== existing.id));
    const isTaken = otherRooms.some((room) => room.slug.toLowerCase().trim() === normalized);
    if (isTaken) {
      setDuplicateSlugWarning({
        inUse: true,
        suggestedAlternative: suggestAlternativeSlug(normalized, prayerRooms.map((room) => room.slug)),
      });
    } else {
      setDuplicateSlugWarning(null);
    }
  };

  const toggleDay = (day: string) => {
    setForm((prev) => {
      if (prev.recurrenceRule === 'WEEKLY') return { ...prev, selectedDays: [day] };
      const selected = prev.selectedDays.includes(day)
        ? prev.selectedDays.filter((item) => item !== day)
        : [...prev.selectedDays, day];
      return { ...prev, selectedDays: selected };
    });
  };

  const onLogoFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, logoUrl: 'Upload an image file.' }));
      return;
    }
    if (file.size > 900_000) {
      setErrors((prev) => ({ ...prev, logoUrl: 'Logo image must be under 900 KB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      patch({ logoUrl: result });
      setErrors((prev) => ({ ...prev, logoUrl: '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    const normalizedSlug = slugify(form.slug || form.name);
    const otherRooms = prayerRooms.filter((room) => (!existing ? true : room.id !== existing.id));
    if (otherRooms.some((room) => room.slug.toLowerCase().trim() === normalizedSlug)) {
      setDuplicateSlugWarning({
        inUse: true,
        suggestedAlternative: suggestAlternativeSlug(normalizedSlug, prayerRooms.map((room) => room.slug)),
      });
      addToast('This Permanent Altar Link is already in use.', 'error');
      return;
    }
    if (form.logoUrl.trim() && !form.logoUrl.startsWith('data:image/') && !isHttpUrl(form.logoUrl.trim())) {
      setErrors({ logoUrl: 'Logo must be an uploaded image or a public http or https URL.' });
      addToast('Please review the form errors', 'warning');
      return;
    }

    const formData = {
      organizationId: organization.id,
      name: form.name.trim(),
      slug: normalizedSlug,
      description: form.description.trim(),
      logoUrl: form.logoUrl.trim() || undefined,
      expectedAttendance: Number(form.expectedAttendance),
      roomType: form.roomType,
      isRecurring: form.isRecurring,
      recurrenceRule: form.isRecurring ? form.recurrenceRule : undefined,
      selectedDays: form.isRecurring && form.recurrenceRule !== 'DAILY' ? form.selectedDays : [],
      oneTimeDate: form.isRecurring ? null : form.oneTimeDate,
      durationMinutes: Number(form.durationMinutes) || 60,
      scheduledStart: form.scheduledStart,
      timezone: form.timezone,
      speakerPermission: form.speakerPermission,
      recordingEnabled: form.recordingEnabled,
      sermonLeaderUserId: form.sermonLeaderUserId || null,
      coHostUserIds: form.coHostUserIds.filter((id) => id !== form.sermonLeaderUserId),
      passcode: existing ? (form.clearPasscode ? null : form.passcode.trim() || undefined) : form.passcode.trim() || undefined,
      allowGuests: form.allowGuests,
      prayerRequestsEnabled: form.prayerRequestsEnabled,
      anonymousRequestsAllowed: form.anonymousRequestsAllowed,
      chatEnabled: form.chatEnabled,
      permanentUrl: `/join/${normalizedSlug}`,
      status: (existing?.status || 'SCHEDULED') as PrayerRoom['status'],
    };

    const validationResult = createPrayerRoomSchema.safeParse(formData);
    if (!validationResult.success) {
      const errMap: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        if (issue.path[0]) errMap[String(issue.path[0])] = issue.message;
      });
      setErrors(errMap);
      addToast('Please review the form errors', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        roomType: validationResult.data.roomType,
        isRecurring: validationResult.data.isRecurring,
        selectedDays: validationResult.data.selectedDays,
        speakerPermission: validationResult.data.speakerPermission,
        recordingEnabled: validationResult.data.recordingEnabled,
        durationMinutes: validationResult.data.durationMinutes,
        allowGuests: validationResult.data.allowGuests,
        prayerRequestsEnabled: validationResult.data.prayerRequestsEnabled,
        anonymousRequestsAllowed: validationResult.data.anonymousRequestsAllowed,
        chatEnabled: validationResult.data.chatEnabled,
        coHostUserIds: validationResult.data.coHostUserIds,
      };
      if (existing) {
        await updatePrayerRoom(existing.id, payload);
        setHasUnsavedChanges(false);
        onNavigate(`/dashboard/prayer-rooms/${existing.id}`, { ignoreUnsaved: true });
      } else {
        const created = await createPrayerRoom(payload);
        setHasUnsavedChanges(false);
        onNavigate(`/dashboard/prayer-rooms/${created.id}?share=1`, { ignoreUnsaved: true });
      }
    } catch (error) {
      const fieldErrors = (error as { fieldErrors?: Record<string, string> | null }).fieldErrors;
      if (fieldErrors) setErrors(fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  const breadcrumbs = existing
    ? [
        { label: 'Prayer Rooms', path: '/dashboard/prayer-rooms' },
        { label: existing.name, path: `/dashboard/prayer-rooms/${existing.id}` },
        { label: 'Edit', isCurrent: true },
      ]
    : [
        { label: 'Prayer Rooms', path: '/dashboard/prayer-rooms' },
        { label: 'Create Prayer Room', isCurrent: true },
      ];

  const showDayPicker = form.isRecurring && (form.recurrenceRule === 'WEEKLY' || form.recurrenceRule === 'SELECTED_DAYS');
  const logoPreview = form.logoUrl.trim();
  const showLogo = logoPreview.startsWith('data:image/') || isHttpUrl(logoPreview);

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <BackButton to={backTo} label={backLabel} mobileLabel="Back" onNavigate={onNavigate} isDirty={isDirty} />
          <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => startTour()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] text-xs font-semibold text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            aria-label="Show create room tutorial"
          >
            <CircleHelp className="w-3.5 h-3.5" />
            <span>Help</span>
          </button>
          <span className="text-xs font-bold text-[#C9A35A] uppercase tracking-wider hidden sm:block">
            {existing ? 'Edit Altar' : 'New Altar Setup'}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-10 border border-[#E5E6E1] dark:border-[#26362F] shadow-xs">
        <div className="mb-6 pb-6 border-b border-[#E5E6E1] dark:border-[#26362F]">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#16251F] dark:text-[#F8F7F3] tracking-tight">
            {existing ? `Edit: ${existing.name}` : 'Create Prayer Room'}
          </h1>
          <p className="text-xs sm:text-sm text-[#68736D] dark:text-[#96A39D] mt-1">
            Configure gathering settings, permanent altar link, and speaker permission rules.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#203C32] dark:text-[#C9A35A] flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              <span>Room Details</span>
            </h3>
            <div data-tour="create-room-name">
              <label htmlFor="room-name" className={labelClass}>Prayer Room Name *</label>
              <input
                id="room-name"
                type="text"
                required
                value={form.name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="e.g. Dawn Intercession, Morning Prayer, Midday Intercession"
                className={fieldClass}
              />
              {errors.name && <p className="text-xs text-[#B94A48] mt-1">{errors.name}</p>}
            </div>

            <div data-tour="create-room-logo" className="space-y-2">
              <label htmlFor="room-logo-file" className={labelClass}>Room logo</label>
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] overflow-hidden flex items-center justify-center shrink-0">
                  {showLogo ? <img src={logoPreview} alt="Room logo preview" className="w-full h-full object-cover" /> : <Upload className="w-5 h-5 text-[#68736D]" />}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    id="room-logo-file"
                    type="file"
                    accept="image/*"
                    onChange={(event) => onLogoFile(event.target.files?.[0])}
                    className="block w-full text-xs text-[#68736D] file:mr-3 file:rounded-lg file:border-0 file:bg-[#203C32] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#F8F7F3] dark:file:bg-[#C9A35A] dark:file:text-[#101814]"
                  />
                  <label htmlFor="room-logo-url" className="block text-[11px] font-semibold text-[#68736D] dark:text-[#96A39D]">
                    Or paste an image URL
                  </label>
                  <input
                    id="room-logo-url"
                    type="text"
                    inputMode="url"
                    value={form.logoUrl.startsWith('data:') ? '' : form.logoUrl}
                    onChange={(event) => patch({ logoUrl: event.target.value })}
                    placeholder="https://yourchurch.org/logo.png"
                    className={fieldClass}
                  />
                </div>
              </div>
              {errors.logoUrl && <p className="text-xs text-[#B94A48] mt-1">{errors.logoUrl}</p>}
            </div>

            <div data-tour="create-room-slug">
              <label htmlFor="room-slug" className={labelClass}>Permanent Altar Link Slug *</label>
              <div className="flex items-center px-4 py-3 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-xs font-mono text-[#68736D] dark:text-[#96A39D]">
                <span>{window.location.origin}/join/</span>
                <input
                  id="room-slug"
                  type="text"
                  required
                  value={form.slug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                  className="flex-1 bg-transparent text-[#16251F] dark:text-[#F8F7F3] font-bold focus:outline-none ml-1"
                />
              </div>
              {errors.slug && <p className="text-xs text-[#B94A48] mt-1">{errors.slug}</p>}
              {duplicateSlugWarning?.inUse && (
                <div className="mt-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block font-bold text-amber-950 dark:text-amber-100">This Permanent Altar Link is already in use.</strong>
                    <button
                      type="button"
                      onClick={() => {
                        patch({ slug: duplicateSlugWarning.suggestedAlternative });
                        setDuplicateSlugWarning(null);
                      }}
                      className="px-2 py-0.5 rounded-md font-mono font-bold bg-amber-200 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100 hover:underline cursor-pointer"
                    >
                      {duplicateSlugWarning.suggestedAlternative}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="room-description" className={labelClass}>Description / Prayer Focus</label>
              <textarea
                id="room-description"
                value={form.description}
                onChange={(event) => patch({ description: event.target.value })}
                rows={2}
                placeholder="e.g. A sacred gathering dedicated to morning intercession."
                className={`${fieldClass} text-xs leading-relaxed font-medium`}
              />
              {errors.description && <p className="text-xs text-[#B94A48] mt-1">{errors.description}</p>}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#203C32] dark:text-[#C9A35A] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Attendance & Format</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="expected-attendance" className={labelClass}>Expected Attendance</label>
                <input
                  id="expected-attendance"
                  type="number"
                  min={1}
                  max={50000}
                  value={form.expectedAttendance}
                  onChange={(event) => patch({ expectedAttendance: Number(event.target.value) })}
                  className={fieldClass}
                />
                {errors.expectedAttendance && <p className="text-xs text-[#B94A48] mt-1">{errors.expectedAttendance}</p>}
              </div>
              <div>
                <span id="room-format-label" className={labelClass}>Room Format</span>
                <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="room-format-label">
                  <button
                    type="button"
                    aria-pressed={form.roomType === 'AUDIO_PRAYER'}
                    onClick={() => patch({ roomType: 'AUDIO_PRAYER' })}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold cursor-pointer ${
                      form.roomType === 'AUDIO_PRAYER'
                        ? 'border-[#203C32] dark:border-[#C9A35A] bg-[#203C32]/5 dark:bg-[#C9A35A]/10 text-[#203C32] dark:text-[#E8D8B2]'
                        : 'border-[#E5E6E1] dark:border-[#26362F] text-[#68736D]'
                    }`}
                  >
                    Audio Prayer
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-pressed={form.roomType === 'PRAYER_LEADER_VIDEO'}
                    className="p-2.5 rounded-xl border text-left text-xs font-semibold border-[#E5E6E1] dark:border-[#26362F] text-[#68736D] opacity-70 cursor-not-allowed"
                  >
                    Leader Video
                    <span className="block text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-300 mt-1">Coming Soon</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#203C32] dark:text-[#C9A35A] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Schedule & Recurrence</span>
            </h3>
            <div className="flex items-center gap-3">
              <input
                id="isRecurring"
                type="checkbox"
                checked={form.isRecurring}
                onChange={(event) => patch({ isRecurring: event.target.checked })}
                className="w-4 h-4 accent-[#203C32] dark:accent-[#C9A35A] rounded cursor-pointer"
              />
              <label htmlFor="isRecurring" className="text-xs font-semibold text-[#16251F] dark:text-[#F8F7F3] cursor-pointer">
                Recurring Prayer Gathering (Runs automatically on set schedule)
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="start-time" className={labelClass}>Start Time</label>
                <input
                  id="start-time"
                  type="time"
                  value={(() => {
                    const clock = parseClockTime(form.scheduledStart);
                    return `${String(clock.hours).padStart(2, '0')}:${String(clock.minutes).padStart(2, '0')}`;
                  })()}
                  onChange={(event) => {
                    const [hours, minutes] = event.target.value.split(':').map(Number);
                    patch({ scheduledStart: formatClockTime(hours || 0, minutes || 0) });
                  }}
                  className={fieldClass}
                />
              </div>
              {form.isRecurring ? (
                <div>
                  <label htmlFor="frequency" className={labelClass}>Frequency</label>
                  <select
                    id="frequency"
                    value={form.recurrenceRule}
                    onChange={(event) => {
                      const recurrenceRule = event.target.value as RecurrenceRule;
                      const selectedDays =
                        recurrenceRule === 'WEEKLY' ? form.selectedDays.slice(0, 1) : form.selectedDays;
                      patch({ recurrenceRule, selectedDays });
                    }}
                    className={fieldClass}
                  >
                    <option value="DAILY">Daily (Every Day)</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="SELECTED_DAYS">Selected Days</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="one-time-date" className={labelClass}>Gathering Date</label>
                  <input
                    id="one-time-date"
                    type="date"
                    value={form.oneTimeDate}
                    onChange={(event) => patch({ oneTimeDate: event.target.value })}
                    className={fieldClass}
                  />
                  {errors.oneTimeDate && <p className="text-xs text-[#B94A48] mt-1">{errors.oneTimeDate}</p>}
                </div>
              )}
              <div>
                <label htmlFor="timezone" className={labelClass}>Timezone</label>
                <TimezoneSelect id="timezone" value={form.timezone} onChange={(timezone) => patch({ timezone })} />
                {errors.timezone && <p className="text-xs text-[#B94A48] mt-1">{errors.timezone}</p>}
              </div>
            </div>
            <div className="max-w-xs">
              <label htmlFor="duration-minutes" className={labelClass}>Duration (minutes)</label>
              <input
                id="duration-minutes"
                type="number"
                min={15}
                max={480}
                value={form.durationMinutes}
                onChange={(event) => patch({ durationMinutes: Number(event.target.value) })}
                className={fieldClass}
              />
              {errors.durationMinutes && <p className="text-xs text-[#B94A48] mt-1">{errors.durationMinutes}</p>}
            </div>
            {showDayPicker && (
              <div>
                <span id="weekday-label" className={labelClass}>
                  {form.recurrenceRule === 'WEEKLY' ? 'Weekly day' : 'Selected days'}
                </span>
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="weekday-label">
                  {WEEKDAYS.map((day) => {
                    const pressed = form.selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
                          pressed
                            ? 'border-[#203C32] bg-[#203C32] text-[#F8F7F3] dark:border-[#C9A35A] dark:bg-[#C9A35A] dark:text-[#101814]'
                            : 'border-[#E5E6E1] dark:border-[#26362F] text-[#68736D]'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
                {errors.selectedDays && <p className="text-xs text-[#B94A48] mt-1">{errors.selectedDays}</p>}
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3] mb-1.5">Next gatherings</p>
              {nextGatherings.length === 0 ? (
                <p className="text-xs text-[#68736D] dark:text-[#96A39D]">
                  {form.isRecurring ? 'Choose a day to preview the next gatherings.' : 'Choose a date to preview this gathering.'}
                </p>
              ) : (
                <ul className="space-y-1">
                  {nextGatherings.map((occurrence) => (
                    <li key={occurrence.toISOString()} className="text-xs text-[#16251F] dark:text-[#F8F7F3]">
                      {formatScheduledDisplay(occurrence, form.timezone)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#203C32] dark:text-[#C9A35A] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Leadership</span>
            </h3>
            <div>
              <label htmlFor="sermon-leader" className={labelClass}>Default sermon leader</label>
              <select
                id="sermon-leader"
                value={form.sermonLeaderUserId}
                onChange={(event) => {
                  const sermonLeaderUserId = event.target.value;
                  patch({
                    sermonLeaderUserId,
                    coHostUserIds: form.coHostUserIds.filter((id) => id !== sermonLeaderUserId),
                  });
                }}
                className={fieldClass}
              >
                <option value="">No default leader</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name} · {member.role.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
              {errors.sermonLeaderUserId && <p className="text-xs text-[#B94A48] mt-1">{errors.sermonLeaderUserId}</p>}
            </div>
            <fieldset className="space-y-2">
              <legend className={labelClass}>Co-hosts</legend>
              {members.filter((member) => member.userId !== form.sermonLeaderUserId).length === 0 ? (
                <p className="text-xs text-[#68736D] dark:text-[#96A39D]">No other church members are available yet.</p>
              ) : (
                members
                  .filter((member) => member.userId !== form.sermonLeaderUserId)
                  .map((member) => (
                    <label key={member.userId} htmlFor={`cohost-${member.userId}`} className="flex items-center gap-2 text-xs text-[#16251F] dark:text-[#F8F7F3]">
                      <input
                        id={`cohost-${member.userId}`}
                        type="checkbox"
                        checked={form.coHostUserIds.includes(member.userId)}
                        onChange={(event) => {
                          const coHostUserIds = event.target.checked
                            ? [...form.coHostUserIds, member.userId]
                            : form.coHostUserIds.filter((id) => id !== member.userId);
                          patch({ coHostUserIds });
                        }}
                        className="accent-[#203C32] dark:accent-[#C9A35A]"
                      />
                      <span>{member.name}</span>
                    </label>
                  ))
              )}
              {errors.coHostUserIds && <p className="text-xs text-[#B94A48] mt-1">{errors.coHostUserIds}</p>}
            </fieldset>
          </div>

          <div className="pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#203C32] dark:text-[#C9A35A] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Access</span>
            </h3>
            <div>
              <label htmlFor="room-passcode" className={labelClass}>
                Passcode <span className="font-medium normal-case text-[#68736D]">(optional)</span>
              </label>
              <input
                id="room-passcode"
                type="password"
                autoComplete="new-password"
                value={form.passcode}
                onChange={(event) => patch({ passcode: event.target.value, clearPasscode: false })}
                placeholder={existing?.hasPasscode ? 'Enter a new passcode to replace the current one' : 'Leave blank for an open link'}
                className={fieldClass}
              />
              {existing?.hasPasscode && (
                <label htmlFor="clear-passcode" className="mt-2 flex items-center gap-2 text-xs text-[#16251F] dark:text-[#F8F7F3]">
                  <input
                    id="clear-passcode"
                    type="checkbox"
                    checked={form.clearPasscode}
                    onChange={(event) => patch({ clearPasscode: event.target.checked, passcode: '' })}
                    className="accent-[#203C32] dark:accent-[#C9A35A]"
                  />
                  Remove the current passcode
                </label>
              )}
              {errors.passcode && <p className="text-xs text-[#B94A48] mt-1">{errors.passcode}</p>}
            </div>
            <div className="flex items-center gap-3">
              <input
                id="allow-guests"
                type="checkbox"
                checked={form.allowGuests}
                onChange={(event) => patch({ allowGuests: event.target.checked })}
                className="w-4 h-4 accent-[#203C32] dark:accent-[#C9A35A] rounded cursor-pointer"
              />
              <label htmlFor="allow-guests" className="text-xs font-semibold text-[#16251F] dark:text-[#F8F7F3] cursor-pointer">
                Allow guests to join without a church account
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#203C32] dark:text-[#C9A35A] flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Engagement</span>
            </h3>
            {(
              [
                ['prayer-requests', 'prayerRequestsEnabled', 'Allow prayer requests'],
                ['anonymous-requests', 'anonymousRequestsAllowed', 'Allow anonymous prayer requests'],
                ['chat-enabled', 'chatEnabled', 'Allow gathering chat'],
              ] as const
            ).map(([id, key, label]) => (
              <div key={id} className="flex items-center gap-3">
                <input
                  id={id}
                  type="checkbox"
                  checked={form[key]}
                  onChange={(event) => patch({ [key]: event.target.checked })}
                  className="w-4 h-4 accent-[#203C32] dark:accent-[#C9A35A] rounded cursor-pointer"
                />
                <label htmlFor={id} className="text-xs font-semibold text-[#16251F] dark:text-[#F8F7F3] cursor-pointer">
                  {label}
                </label>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#203C32] dark:text-[#C9A35A] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Moderation & Permissions</span>
            </h3>
            <fieldset className="space-y-2">
              <legend className={labelClass}>Speaker Permission Rule</legend>
              <label htmlFor="permission-approval" className="flex items-start gap-2.5 p-3 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] cursor-pointer">
                <input
                  id="permission-approval"
                  type="radio"
                  name="permissionMode"
                  value="ADMIN_APPROVAL_REQUIRED"
                  checked={form.speakerPermission === 'ADMIN_APPROVAL_REQUIRED'}
                  onChange={() => patch({ speakerPermission: 'ADMIN_APPROVAL_REQUIRED' })}
                  className="mt-0.5 accent-[#203C32] dark:accent-[#C9A35A]"
                />
                <span>
                  <strong className="block text-xs text-[#16251F] dark:text-[#F8F7F3]">Admin / Pastor Approval Required (Strict Sanctum Standard)</strong>
                  <span className="text-[11px] text-[#68736D] dark:text-[#96A39D]">Admins approve who may speak during the gathering.</span>
                </span>
              </label>
              <label htmlFor="permission-leaders" className="flex items-start gap-2.5 p-3 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] cursor-pointer">
                <input
                  id="permission-leaders"
                  type="radio"
                  name="permissionMode"
                  value="PRAYER_LEADERS"
                  checked={form.speakerPermission === 'PRAYER_LEADERS'}
                  onChange={() => patch({ speakerPermission: 'PRAYER_LEADERS' })}
                  className="mt-0.5 accent-[#203C32] dark:accent-[#C9A35A]"
                />
                <span>
                  <strong className="block text-xs text-[#16251F] dark:text-[#F8F7F3]">Designated Prayer Leaders Only</strong>
                  <span className="text-[11px] text-[#68736D] dark:text-[#96A39D]">Only prayer leaders, admins, and the owner can speak. Hand raising is disabled.</span>
                </span>
              </label>
            </fieldset>
            <div className="flex items-start gap-3 pt-2 opacity-70">
              <input id="recording" type="checkbox" checked={form.recordingEnabled} disabled className="mt-0.5 w-4 h-4 accent-[#203C32] dark:accent-[#C9A35A] rounded" />
              <div>
                <label htmlFor="recording" className="text-xs font-semibold text-[#16251F] dark:text-[#F8F7F3] block">
                  Archive session audio for ministry records
                </label>
                <span className="block text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-300 mt-1">Coming Soon</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onNavigate(backTo)}
              className="px-5 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] text-xs font-semibold text-[#68736D] dark:text-[#96A39D] hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(duplicateSlugWarning?.inUse)}
              data-tour="create-room-save"
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : existing ? 'Save Changes' : 'Create Prayer Room'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
