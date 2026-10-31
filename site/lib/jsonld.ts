import { formatKampala } from './format';
import type { PublicEvent, PublicSermon } from './api';

export function churchJsonLd(
  siteUrl: string,
  times: { weekday: string | null; cadence: string; opens: string; closes: string; isConfirmed?: boolean }[] = [],
) {
  const hours = times
    .filter((time) => time.cadence !== 'MONTHLY')
    .flatMap((time) => {
      const days = time.cadence === 'DAILY'
        ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        : time.weekday ? [time.weekday] : [];
      return days.map((day) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: day,
        opens: time.opens,
        closes: time.closes,
      }));
    });
  return {
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: 'Promised Land Christian Center',
    url: siteUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Kira-Kitukutwe Trading Center',
      addressLocality: 'Wakiso District',
      addressCountry: 'UG',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 0.438,
      longitude: 32.653,
    },
    openingHoursSpecification: hours,
  };
}

export function eventJsonLd(event: PublicEvent, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: event.location,
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Kira-Kitukutwe Trading Center',
        addressLocality: 'Wakiso District',
        addressCountry: 'UG',
      },
    },
    description: event.description || undefined,
    image: event.imageUrl || undefined,
    url,
  };
}

export function sermonJsonLd(sermon: PublicSermon, url: string) {
  if (!sermon.youtubeUrl) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: sermon.title,
    description: sermon.notes || `${sermon.title} — ${sermon.speaker}`,
    uploadDate: sermon.preachedOn,
    contentUrl: sermon.youtubeUrl,
    embedUrl: sermon.youtubeUrl,
    url,
    publisher: {
      '@type': 'Church',
      name: 'Promised Land Christian Center',
    },
  };
}

export function eventWhen(event: PublicEvent) {
  return formatKampala(event.startsAt, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
