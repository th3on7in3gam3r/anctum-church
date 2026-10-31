'use server';

import { eventRsvpSchema, visitorCardSchema } from '@shared/validations/cms.ts';
import { idleFormState, postPublic, ugandaPhoneError, type FormState } from './form';

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? '');
}

export async function submitVisitor(_prev: FormState = idleFormState, formData: FormData): Promise<FormState> {
  if (text(formData, 'company').trim()) return { status: 'success' };

  const phoneError = ugandaPhoneError(text(formData, 'phone'));
  const parsed = visitorCardSchema.safeParse({
    name: text(formData, 'name'),
    phone: text(formData, 'phone'),
    email: text(formData, 'email'),
    message: text(formData, 'message'),
    service: text(formData, 'service'),
    source: text(formData, 'source'),
    company: '',
  });

  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path.length ? String(issue.path[0]) : 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }
  if (phoneError) fieldErrors.phone = phoneError;
  if (Object.keys(fieldErrors).length) {
    return { status: 'error', message: 'Please review the form.', fieldErrors };
  }
  if (!parsed.success) return { status: 'error', message: 'Please review the form.' };

  const result = await postPublic('/visitor-cards', parsed.data);
  if (result.status === 'success') {
    return { status: 'success', message: 'Thank you. Someone from the church will be in touch.' };
  }
  return result;
}

export async function submitRsvp(_prev: FormState = idleFormState, formData: FormData): Promise<FormState> {
  if (text(formData, 'company').trim()) return { status: 'success', message: 'Thank you. You are on the list.' };

  const phoneError = ugandaPhoneError(text(formData, 'phone'));
  const count = Number(text(formData, 'count') || '1');
  const parsed = eventRsvpSchema.safeParse({
    name: text(formData, 'name'),
    phone: text(formData, 'phone'),
    count,
    company: '',
  });
  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path.length ? String(issue.path[0]) : 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }
  if (phoneError) fieldErrors.phone = phoneError;
  if (Object.keys(fieldErrors).length) {
    return { status: 'error', message: 'Please review the form.', fieldErrors };
  }
  if (!parsed.success) return { status: 'error', message: 'Please review the form.' };

  const eventId = text(formData, 'eventId');
  const result = await postPublic(`/events/${encodeURIComponent(eventId)}/rsvp`, parsed.data);
  if (result.status === 'success') {
    return { status: 'success', message: 'Thank you. You are on the list.' };
  }
  return result;
}
