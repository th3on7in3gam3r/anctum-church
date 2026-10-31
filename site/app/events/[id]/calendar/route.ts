import { getEvent } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

function stamp(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return new Response('Not found', { status: 404 });
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Promised Land Christian Center//Events//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@promised-land`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(event.endsAt)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(event.description || '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.id}.ics"`,
    },
  });
}
