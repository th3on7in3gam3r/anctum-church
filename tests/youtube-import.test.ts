import { describe, expect, it } from 'vitest';
import { SanctumError } from '../shared/errors.ts';
import { publishedSermonRows } from '../shared/sermons.ts';
import { classifyChannelInput, normalizeSpeaker, parseSermonTitle, tidyTitle, youtubeId } from '../shared/youtube.ts';
import { parseVideoFeed } from '../server/youtube/channel.ts';
import { selectNewUploads } from '../server/youtube/import.ts';
import { lookupYoutube } from '../server/youtube/lookup.ts';

describe('youtube video ids', () => {
  it('reads watch, youtu.be, live, and shorts links', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=_sYcvbeK6f8')).toBe('_sYcvbeK6f8');
    expect(youtubeId('https://youtu.be/ZRZ7k2R679E')).toBe('ZRZ7k2R679E');
    expect(youtubeId('https://www.youtube.com/live/jfL3aFovzzQ')).toBe('jfL3aFovzzQ');
    expect(youtubeId('https://www.youtube.com/shorts/Y7xXUUMZJHg')).toBe('Y7xXUUMZJHg');
    expect(youtubeId('https://m.youtube.com/watch?v=abcdefghijk')).toBe('abcdefghijk');
  });

  it('accepts a handle, a channel URL, or a raw channel id', () => {
    expect(classifyChannelInput('@gracelovehiire')).toEqual({ kind: 'handle', handle: 'gracelovehiire' });
    expect(classifyChannelInput('https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv')).toEqual({
      kind: 'id',
      channelId: 'UCabcdefghijklmnopqrstuv',
    });
    expect(classifyChannelInput('UCabcdefghijklmnopqrstuv')).toEqual({ kind: 'id', channelId: 'UCabcdefghijklmnopqrstuv' });
    expect(classifyChannelInput('not a channel')).toBeNull();
  });
});

describe('youtube lookup', () => {
  it('rejects hosts other than youtube.com, m.youtube.com, and youtu.be', async () => {
    await expect(lookupYoutube('https://vimeo.com/123')).rejects.toMatchObject({
      message: 'Paste a youtube.com, m.youtube.com, or youtu.be link.',
    });
  });

  it('explains when a video is private or deleted', async () => {
    const fetchImpl = (async () => new Response('nope', { status: 404 })) as typeof fetch;
    await expect(lookupYoutube('https://youtu.be/abcdefghijk', fetchImpl)).rejects.toBeInstanceOf(SanctumError);
    await expect(lookupYoutube('https://www.youtube.com/watch?v=abcdefghijk', fetchImpl)).rejects.toMatchObject({
      message: 'This video is private, deleted, or not available.',
    });
  });
});

describe('sermon titles', () => {
  const known = { defaultSpeaker: 'Pastor GraceLove Hiire', aliases: ['Ps Grace Love Hiire'] };

  it('splits a Sunday title into title, scripture, speaker, and series', () => {
    expect(parseSermonTitle(
      'Restoring Our Star | Jeremiah 30:17 | Ps Grace Love Hiire | Upper Room',
      known,
    )).toEqual({
      title: 'Restoring Our Star',
      scripture: 'Jeremiah 30:17',
      speaker: 'Pastor GraceLove Hiire',
      seriesName: 'Upper Room',
    });
  });

  it('reads a speaker prefix with a period', () => {
    expect(parseSermonTitle(
      'Overcoming the Spirit of Delay | Daniel 10:12-13 | Ps. Grace Love Hiire',
      known,
    )).toEqual({
      title: 'Overcoming the Spirit of Delay',
      scripture: 'Daniel 10:12-13',
      speaker: 'Pastor GraceLove Hiire',
      seriesName: null,
    });
  });

  it('leaves an unseparated title alone', () => {
    expect(parseSermonTitle('UPPER ROOM LIVESTREAM', known)).toEqual({
      title: 'Upper Room Livestream',
      scripture: null,
      speaker: null,
      seriesName: null,
    });
  });

  it('title-cases a capitalized upload and keeps the full speaker name', () => {
    expect(parseSermonTitle(
      'Overcoming The Spirit Of Delay | Daniel 10:12-13 | Ps. Grace Love Hiire',
      known,
    )).toMatchObject({
      title: 'Overcoming the Spirit of Delay',
      speaker: 'Pastor GraceLove Hiire',
    });
  });

  it('spaces an ampersand and a comma without recasing a mixed title', () => {
    expect(tidyTitle('After Mockery&Shame Due to Infertility,God Turned the Story Around')).toBe(
      'After Mockery & Shame Due to Infertility, God Turned the Story Around',
    );
    expect(parseSermonTitle('After Mockery&Shame Due to Infertility,God Turned the Story Around', known).title).toBe(
      'After Mockery & Shame Due to Infertility, God Turned the Story Around',
    );
  });

  it('reads a glued pastor prefix and keeps Upper Room in the title', () => {
    expect(parseSermonTitle(
      "After Mockery&Shame Due to Infertility,God Turned the Story Around| Ps.Grace Love's Testimony at MCF",
      known,
    )).toMatchObject({
      title: 'After Mockery & Shame Due to Infertility, God Turned the Story Around',
      speaker: 'Pastor GraceLove Hiire',
    });
  });

  it('maps shortened Grace Love names onto the default speaker', () => {
    expect(normalizeSpeaker('gracelove', known)).toBe('Pastor GraceLove Hiire');
    expect(normalizeSpeaker('grace love', known)).toBe('Pastor GraceLove Hiire');
    expect(normalizeSpeaker('Ps Grace Love', known)).toBe('Pastor GraceLove Hiire');
    expect(normalizeSpeaker('Ps. Grace Love Hiire', known)).toBe('Pastor GraceLove Hiire');
    expect(normalizeSpeaker('grace', known)).toBe('grace');
  });
});

describe('public sermons', () => {
  it('hides an imported draft from the public list and the sermons page', () => {
    const rows = [
      { id: 'draft', status: 'DRAFT', title: 'Imported from YouTube' },
      { id: 'live', status: 'PUBLISHED', title: 'Restoring Our Star' },
    ];
    expect(publishedSermonRows(rows).map((row) => row.id)).toEqual(['live']);
  });
});

describe('youtube import', () => {
  const now = new Date('2026-10-14T12:00:00.000Z');
  const entries = [
    { videoId: 'old-video', title: 'Sunday message', publishedAt: '2026-10-01T08:00:00.000Z', url: 'https://www.youtube.com/watch?v=old-video' },
    { videoId: 'live-soon', title: 'Upcoming live', publishedAt: '2026-10-20T08:00:00.000Z', url: 'https://www.youtube.com/watch?v=live-soon' },
    { videoId: 'birthday', title: 'Birthday', publishedAt: '2026-09-01T08:00:00.000Z', url: 'https://www.youtube.com/watch?v=birthday' },
  ];

  it('imports each video once and skips upcoming livestreams', () => {
    const first = selectNewUploads({ entries, existingVideoIds: [], ignoredVideoIds: [], now });
    expect(first.map((entry) => entry.videoId)).toEqual(['old-video', 'birthday']);
    const second = selectNewUploads({
      entries,
      existingVideoIds: first.map((entry) => entry.videoId),
      ignoredVideoIds: [],
      now,
    });
    expect(second).toEqual([]);
  });

  it('does not import a video that was ignored', () => {
    const selected = selectNewUploads({
      entries,
      existingVideoIds: [],
      ignoredVideoIds: ['birthday'],
      now,
    });
    expect(selected.map((entry) => entry.videoId)).toEqual(['old-video']);
  });

  it('reads the channel title and video ids from the feed', () => {
    const feed = parseVideoFeed(`<?xml version="1.0"?>
      <feed>
        <title>PLCC GRACELOVE</title>
        <entry>
          <yt:videoId>abc123</yt:videoId>
          <title><![CDATA[Hope &amp; faith]]></title>
          <published>2026-10-01T08:00:00+00:00</published>
        </entry>
      </feed>`);
    expect(feed.title).toBe('PLCC GRACELOVE');
    expect(feed.entries[0]).toMatchObject({ videoId: 'abc123', title: 'Hope & faith' });
  });
});
