import { BRAND } from '../../packages/brand/brand.ts';

export async function notifyGalleryReview(input: { albumTitle: string; reviewUrl: string; emails: string[] }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.GALLERY_REVIEW_FROM?.trim();
  const emails = input.emails.map((email) => email.trim()).filter(Boolean);
  if (!apiKey || !from || !emails.length) return { emailed: false };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: emails,
      subject: `Gallery review: ${input.albumTitle}`,
      text: `${input.albumTitle} is ready for review.\n${input.reviewUrl}`,
      html: `<p><img src="${(process.env.PUBLIC_SITE_URL || process.env.APP_URL || '').replace(/\/$/, '')}/brand/${BRAND.mark}" width="40" height="40" alt="" /></p><p>${BRAND.fullName}</p><p>${input.albumTitle} is ready for review.</p><p><a href="${input.reviewUrl}">${input.reviewUrl}</a></p>`,
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  return { emailed: Boolean(response?.ok) };
}
