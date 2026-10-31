function icsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildRoomIcs(input: {
  name: string;
  description?: string;
  url: string;
  durationMinutes: number;
  occurrences: Date[];
}): string {
  const duration = Math.max(15, input.durationMinutes || 60);
  const events = input.occurrences.map((start) => {
    const end = new Date(start.getTime() + duration * 60 * 1000);
    return [
      'BEGIN:VEVENT',
      `UID:${start.getTime()}@sanctum.live`,
      `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(start)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:${escapeIcs(input.name)}`,
      `DESCRIPTION:${escapeIcs(input.description || input.url)}`,
      `URL:${escapeIcs(input.url)}`,
      'END:VEVENT',
    ].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sanctum Live//Prayer Room//EN', ...events, 'END:VCALENDAR'].join(
    '\r\n'
  );
}

export function downloadIcs(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
