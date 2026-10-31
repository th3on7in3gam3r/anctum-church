import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cmsApi, type CmsPage, type CmsPageBlock } from '../../services/api/cmsApi';
import { CmsDrawer, CmsListRow, CmsPageHeader, SampleBadge, fieldClass, labelClass, primaryButtonClass } from './CmsDrawer';

const BLOCKS: Array<{ type: CmsPageBlock['type']; label: string }> = [
  { type: 'heading', label: 'Heading' },
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'image', label: 'Image' },
  { type: 'button', label: 'Button' },
  { type: 'scripture', label: 'Scripture quote' },
];

function blankBlock(type: CmsPageBlock['type']): CmsPageBlock {
  if (type === 'heading') return { type, text: '', level: 2 };
  if (type === 'paragraph') return { type, text: '' };
  if (type === 'image') return { type, url: '', alt: '' };
  if (type === 'button') return { type, label: '', href: '' };
  return { type: 'scripture', reference: '', text: '' };
}

export const PagesPage: React.FC = () => {
  const { organization } = useAuth();
  const [rows, setRows] = useState<CmsPage[]>([]);
  const [editing, setEditing] = useState<Partial<CmsPage> | null>(null);
  const [blocks, setBlocks] = useState<CmsPageBlock[]>([]);
  const [error, setError] = useState('');

  const load = () => cmsApi.listPages(organization.id).then((result) => setRows(result.pages)).catch((err: Error) => setError(err.message));
  useEffect(load, [organization.id]);

  const open = (page: Partial<CmsPage> | null) => {
    setEditing(page);
    setBlocks(page?.body || []);
  };

  const updateBlock = (index: number, patch: Partial<CmsPageBlock>) => {
    setBlocks((current) => current.map((block, item) => (item === index ? { ...block, ...patch } : block)));
  };

  return (
    <div className="space-y-5">
      <CmsPageHeader title="Website Pages" description="Published pages are available on the public church API." action={<button type="button" className={primaryButtonClass} onClick={() => open({ isPublished: false, sortOrder: 0, body: [] })}>Add page</button>} />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="space-y-2">
        {rows.map((row) => (
          <CmsListRow key={row.id} onClick={() => open(row)}>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">{row.title}{row.isPlaceholder ? <SampleBadge /> : null}</p>
            <p className="mt-1 text-xs text-muted">/{row.slug} · {row.isPublished ? 'Published' : 'Draft'}</p>
          </CmsListRow>
        ))}
      </div>
      <CmsDrawer open={Boolean(editing)} title={editing?.id ? 'Edit page' : 'Add page'} onClose={() => open(null)}>
        {editing && (
          <form className="space-y-3" onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await cmsApi.savePage(organization.id, editing.id || null, {
              title: form.get('title'),
              slug: form.get('slug'),
              heroImageUrl: form.get('heroImageUrl'),
              sortOrder: Number(form.get('sortOrder') || 0),
              isPublished: form.get('isPublished') === 'on',
              body: blocks,
            });
            open(null);
            load();
          }}>
            {editing.isPlaceholder ? <SampleBadge /> : null}
            <label className={labelClass} htmlFor="title">Title</label>
            <input id="title" name="title" className={fieldClass} defaultValue={editing.title || ''} required />
            <label className={labelClass} htmlFor="slug">Slug</label>
            <input id="slug" name="slug" className={fieldClass} defaultValue={editing.slug || ''} required />
            <label className={labelClass} htmlFor="heroImageUrl">Hero image URL</label>
            <input id="heroImageUrl" name="heroImageUrl" className={fieldClass} defaultValue={editing.heroImageUrl || ''} />
            <label className={labelClass} htmlFor="sortOrder">Sort order</label>
            <input id="sortOrder" name="sortOrder" type="number" className={fieldClass} defaultValue={editing.sortOrder || 0} />
            <label className="flex items-center gap-2 text-xs font-semibold" htmlFor="isPublished">
              <input id="isPublished" name="isPublished" type="checkbox" defaultChecked={Boolean(editing.isPublished)} />
              Published
            </label>
            <div className="space-y-3 pt-2">
              <p className={labelClass}>Blocks</p>
              {blocks.map((block, index) => (
                <div key={`${block.type}-${index}`} className="p-3 rounded-xl border border-line space-y-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase text-muted">
                    <span>{block.type}</span>
                    <button type="button" className="text-danger cursor-pointer" onClick={() => setBlocks((current) => current.filter((_, item) => item !== index))}>Remove</button>
                  </div>
                  {block.type === 'heading' && (
                    <>
                      <input className={fieldClass} value={block.text || ''} onChange={(event) => updateBlock(index, { text: event.target.value })} placeholder="Heading" />
                      <select className={fieldClass} value={block.level || 2} onChange={(event) => updateBlock(index, { level: Number(event.target.value) as 1 | 2 | 3 })}>
                        <option value={1}>Heading 1</option>
                        <option value={2}>Heading 2</option>
                        <option value={3}>Heading 3</option>
                      </select>
                    </>
                  )}
                  {block.type === 'paragraph' && (
                    <textarea className={fieldClass} value={block.text || ''} rows={3} onChange={(event) => updateBlock(index, { text: event.target.value })} placeholder="Paragraph" />
                  )}
                  {block.type === 'image' && (
                    <>
                      <input className={fieldClass} value={block.url || ''} onChange={(event) => updateBlock(index, { url: event.target.value })} placeholder="Image URL" />
                      <input className={fieldClass} value={block.alt || ''} onChange={(event) => updateBlock(index, { alt: event.target.value })} placeholder="Alt text" />
                    </>
                  )}
                  {block.type === 'button' && (
                    <>
                      <input className={fieldClass} value={block.label || ''} onChange={(event) => updateBlock(index, { label: event.target.value })} placeholder="Button label" />
                      <input className={fieldClass} value={block.href || ''} onChange={(event) => updateBlock(index, { href: event.target.value })} placeholder="Link" />
                    </>
                  )}
                  {block.type === 'scripture' && (
                    <>
                      <input className={fieldClass} value={block.reference || ''} onChange={(event) => updateBlock(index, { reference: event.target.value })} placeholder="John 3:16" />
                      <textarea className={fieldClass} value={block.text || ''} rows={3} onChange={(event) => updateBlock(index, { text: event.target.value })} placeholder="Quote" />
                    </>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {BLOCKS.map((block) => (
                  <button key={block.type} type="button" className="px-2 py-1 rounded-lg text-[11px] font-bold border border-line cursor-pointer" onClick={() => setBlocks((current) => [...current, blankBlock(block.type)])}>
                    {block.label}
                  </button>
                ))}
              </div>
            </div>
            <button className={primaryButtonClass} type="submit">Save page</button>
          </form>
        )}
      </CmsDrawer>
    </div>
  );
};
