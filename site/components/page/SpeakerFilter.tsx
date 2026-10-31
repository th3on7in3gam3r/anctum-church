'use client';

import { useRouter } from 'next/navigation';

export function SpeakerFilter({
  speakers,
  speaker,
  series,
}: {
  speakers: string[];
  speaker: string;
  series: string;
}) {
  const router = useRouter();

  function onChange(value: string) {
    const params = new URLSearchParams();
    if (series) params.set('series', series);
    if (value) params.set('speaker', value);
    const query = params.toString();
    router.replace(query ? `/sermons?${query}` : '/sermons', { scroll: false });
  }

  return (
    <div className="flex items-end gap-3">
      <label className="text-sm font-semibold text-sand" htmlFor="speaker">Speaker</label>
      <select
        id="speaker"
        value={speaker}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-full border border-sand/40 bg-transparent px-4 py-2 text-on-dark"
      >
        <option value="">All speakers</option>
        {speakers.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
    </div>
  );
}
