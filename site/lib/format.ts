const kampala: Intl.DateTimeFormatOptions = { timeZone: 'Africa/Kampala' };

export function formatKampala(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-UG', { ...kampala, ...options }).format(new Date(value));
}

export function formatDay(value: string) {
  return formatKampala(`${value}T12:00:00.000Z`, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function excerptFromBlocks(blocks: { type: string; text?: string }[], fallback: string) {
  const paragraph = blocks.find((block) => block.type === 'paragraph' && block.text);
  const text = paragraph?.text?.replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}
