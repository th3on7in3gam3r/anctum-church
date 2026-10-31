import { SanctumError } from '../../shared/errors.ts';
import { classifyChannelInput } from '../../shared/youtube.ts';

export type FeedEntry = {
  videoId: string;
  title: string;
  publishedAt: string;
  url: string;
};

export type VideoFeed = {
  title: string;
  entries: FeedEntry[];
};

function decodeXml(value: string) {
  const inner = value.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1');
  return inner
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function parseVideoFeed(xml: string): VideoFeed {
  const feedTitle = xml.match(/<feed[\s\S]*?<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
  const entries: FeedEntry[] = [];
  for (const chunk of xml.split('<entry>').slice(1)) {
    const videoId = chunk.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim();
    const title = chunk.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
    const publishedAt = chunk.match(/<published>([^<]+)<\/published>/)?.[1]?.trim();
    if (!videoId || !publishedAt) continue;
    entries.push({
      videoId,
      title: decodeXml(title) || 'Untitled',
      publishedAt,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }
  return { title: decodeXml(feedTitle), entries };
}

async function readText(response: Response) {
  return response.text();
}

export async function channelIdFromHandle(handle: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  let response: Response;
  try {
    response = await fetchImpl(`https://www.youtube.com/@${encodeURIComponent(handle)}`, { signal: AbortSignal.timeout(5000) });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const html = await readText(response);
  const canonical = html.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/)?.[1];
  return canonical || html.match(/"(?:externalId|browseId|channelId)":"(UC[a-zA-Z0-9_-]{22})"/)?.[1] || null;
}

export async function fetchChannelFeed(channelId: string, fetchImpl: typeof fetch = fetch): Promise<VideoFeed> {
  let response: Response;
  try {
    response = await fetchImpl(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`, {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new SanctumError('VALIDATION_ERROR', 'YouTube did not respond. Check the channel and try again.', 400);
  }
  if (!response.ok) {
    throw new SanctumError('VALIDATION_ERROR', 'That YouTube channel could not be found.', 400);
  }
  const feed = parseVideoFeed(await readText(response));
  if (!feed.title) {
    throw new SanctumError('VALIDATION_ERROR', 'That YouTube channel could not be found.', 400);
  }
  return feed;
}

export async function resolveChannel(input: string, fetchImpl: typeof fetch = fetch) {
  const classified = classifyChannelInput(input);
  if (!classified) {
    throw new SanctumError('VALIDATION_ERROR', 'Enter a YouTube @handle, channel URL, or channel id.', 400);
  }
  const channelId = classified.kind === 'id' ? classified.channelId : await channelIdFromHandle(classified.handle, fetchImpl);
  if (!channelId) {
    throw new SanctumError('VALIDATION_ERROR', 'That YouTube channel could not be found.', 400);
  }
  const feed = await fetchChannelFeed(channelId, fetchImpl);
  return { channelId, channelTitle: feed.title, feed };
}
