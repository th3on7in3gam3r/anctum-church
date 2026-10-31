'use client';

import { useActionState } from 'react';
import { idleFormState, type FormState } from '@/lib/form';

export type PublicField = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
  defaultValue?: string;
};

export function PublicForm({
  action,
  fields,
  submitLabel,
  hidden,
  formId = 'form',
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: PublicField[];
  submitLabel: string;
  hidden?: Record<string, string>;
  formId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleFormState);

  if (state.status === 'success') {
    return (
      <p className="rounded-3xl bg-forest-900 px-5 py-4 text-on-dark" role="status">
        {state.message || 'Thank you. We received that.'}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-[26px] bg-white p-6" noValidate>
      {hidden
        ? Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)
        : null}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      {state.message ? (
        <p className="text-sm font-semibold text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}
      {fields.map((field) => {
        const error = state.fieldErrors?.[field.name];
        const id = `${formId}-${field.name}`;
        const shared = {
          id,
          name: field.name,
          required: field.required,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': error ? `${id}-error` : undefined,
          className: 'mt-1 w-full rounded-2xl border border-ink/15 bg-sand px-4 py-3 text-base',
        };
        return (
          <label key={field.name} className="block text-sm font-semibold" htmlFor={id}>
            {field.label}
            {field.type === 'textarea' ? <textarea {...shared} rows={4} /> : field.type === 'select' ? (
              <select {...shared} defaultValue={field.defaultValue || ''}>
                <option value="">Choose a service</option>
                {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ) : (
              <input
                {...shared}
                type={field.type || 'text'}
                inputMode={field.type === 'tel' ? 'tel' : undefined}
                min={field.min}
                max={field.max}
                defaultValue={field.defaultValue}
              />
            )}
            {error ? (
              <span id={`${id}-error`} className="mt-1 block font-normal text-red-800">
                {error}
              </span>
            ) : null}
          </label>
        );
      })}
      <button
        type="submit"
        disabled={pending}
        className="site-button bg-gold text-ink disabled:opacity-60"
      >
        {pending ? 'Sending…' : submitLabel}
      </button>
    </form>
  );
}
