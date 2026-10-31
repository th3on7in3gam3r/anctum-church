import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cmsApi, type CmsFaq } from '../../services/api/cmsApi';
import { CmsDrawer, CmsListRow, CmsPageHeader, SampleBadge, fieldClass, labelClass, primaryButtonClass } from './CmsDrawer';

export const FaqsPage: React.FC = () => {
  const { organization } = useAuth();
  const [rows, setRows] = useState<CmsFaq[]>([]);
  const [editing, setEditing] = useState<Partial<CmsFaq> | null>(null);
  const [error, setError] = useState('');
  const load = () => cmsApi.listFaqs(organization.id).then((result) => setRows(result.faqs)).catch((err: Error) => setError(err.message));
  useEffect(load, [organization.id]);

  return (
    <div className="space-y-5">
      <CmsPageHeader title="Visit questions" description="Answers shown on the plan-a-visit page." action={<button type="button" className={primaryButtonClass} onClick={() => setEditing({ sortOrder: rows.length })}>Add question</button>} />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="space-y-2">
        {rows.map((row) => (
          <CmsListRow key={row.id} onClick={() => setEditing(row)}>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">{row.question}{row.isPlaceholder ? <SampleBadge /> : null}</p>
          </CmsListRow>
        ))}
      </div>
      <CmsDrawer open={Boolean(editing)} title={editing?.id ? 'Edit question' : 'Add question'} onClose={() => setEditing(null)}>
        {editing && (
          <form className="space-y-3" onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await cmsApi.saveFaq(organization.id, editing.id || null, {
              question: form.get('question'),
              answer: form.get('answer'),
              sortOrder: Number(form.get('sortOrder') || 0),
            });
            setEditing(null);
            load();
          }}>
            <label className={labelClass} htmlFor="question">Question</label>
            <input id="question" name="question" className={fieldClass} defaultValue={editing.question || ''} required />
            <label className={labelClass} htmlFor="answer">Answer</label>
            <textarea id="answer" name="answer" className={fieldClass} defaultValue={editing.answer || ''} rows={4} required />
            <label className={labelClass} htmlFor="sortOrder">Order</label>
            <input id="sortOrder" name="sortOrder" type="number" min={0} className={fieldClass} defaultValue={editing.sortOrder ?? 0} />
            <button className={primaryButtonClass} type="submit">Save question</button>
          </form>
        )}
      </CmsDrawer>
    </div>
  );
};
