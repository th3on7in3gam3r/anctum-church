export function ugandaPhoneError(value: string): string | null {
  const compact = value.trim().replace(/[\s-]/g, '');
  if (/^0\d{9}$/.test(compact) || /^\+256\d{9}$/.test(compact)) return null;
  return 'Use a number like 0772000000 or +256772000000.';
}

export type FormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const idleFormState: FormState = { status: 'idle' };

type ApiErrorBody = {
  message?: string;
  details?: { fieldErrors?: Record<string, string> } | null;
};

export async function postPublic(path: string, body: Record<string, unknown>): Promise<FormState> {
  const { siteEnv } = await import('./env');
  const env = siteEnv();
  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}/api/public/${env.orgSlug}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return { status: 'error', message: 'We could not reach the church office. Try again in a moment.' };
  }

  if (response.status === 201) return { status: 'success' };
  const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
  if (response.status === 429) {
    return { status: 'error', message: 'Please wait a few minutes and try again.' };
  }
  if (response.status === 400 && payload?.details?.fieldErrors) {
    return {
      status: 'error',
      message: payload.message || 'Please review the form.',
      fieldErrors: payload.details.fieldErrors,
    };
  }
  return { status: 'error', message: payload?.message || 'Something went wrong. Please try again.' };
}
