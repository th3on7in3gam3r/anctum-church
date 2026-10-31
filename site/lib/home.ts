import type { PageBlock } from '@shared/validations/cms.ts';
import type { PublicPage } from './api';

type Paragraph = Extract<PageBlock, { type: 'paragraph' }>;

export type ServiceTime = { day: string; time: string; name: string; line: string };
export type Scripture = { reference: string; text: string };

function between(page: PublicPage, start: string, stops: string[]) {
  const from = page.body.findIndex((block) => block.type === 'heading' && block.text === start);
  if (from < 0) return [];
  const rest = page.body.slice(from + 1);
  const end = rest.findIndex((block) => block.type === 'heading' && stops.includes(block.text));
  return (end < 0 ? rest : rest.slice(0, end)).filter((block): block is Paragraph => block.type === 'paragraph');
}

export function parseHome(page: PublicPage) {
  const lead = page.body.find((block) => block.type === 'paragraph');
  const scripture = page.body.find((block) => block.type === 'scripture');
  const welcome = between(page, 'A word from our pastor', ['Service times', 'Plan a visit'])[0];
  const times: ServiceTime[] = between(page, 'Service times', ['Plan a visit', 'A word from our pastor']).map((block) => {
    const [day = '', time = '', name = '', line = ''] = block.text.split('\n').map((part) => part.trim());
    return {
      day,
      time,
      name: name || day,
      line: line || time,
    };
  });
  const visit = between(page, 'Plan a visit', []).map((block) => block.text);
  return {
    lead: lead && lead.type === 'paragraph' ? lead.text : '',
    welcome: welcome && welcome.type === 'paragraph' ? welcome.text : '',
    scripture: scripture && scripture.type === 'scripture' ? { reference: scripture.reference, text: scripture.text } : null,
    times,
    visit,
    hero: page.heroImageUrl || '/hero-fallback.webp',
  };
}
