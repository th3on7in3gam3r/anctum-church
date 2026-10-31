import { SanctumError } from '../../shared/errors.ts';
import { hqThumbnail, isAllowedYoutubeHost, youtubeId } from '../../shared/youtube.ts';

export type YoutubeLookup = {
  videoId: string;
  title: string;
  authorName: string;
  thumbnailUrl: string;
};

const PRIVATE_VIDEO = 'This video is private, deleted, or not available.';

export async function lookupYoutube(url: string, fetchImpl: typeof fetch = fetch): Promise<YoutubeLookup> {
  const trimmed = url.trim();
  if (!isAllowedYoutubeHost(trimmed)) {
    throw new SanctumError('VALIDATION_ERROR', 'Paste a youtube.com, m.youtube.com, or youtu.be link.', 400);
  }
  const videoId = youtubeId(trimmed);
  if (!videoId) {
    throw new SanctumError('VALIDATION_ERROR', 'That link is not a YouTube video.', 400);
  }

  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`;
  let response: Response;
  try {
    response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(5000) });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new SanctumError('VALIDATION_ERROR', 'YouTube did not respond. Try the link again.', 400);
    }
    throw new SanctumError('VALIDATION_ERROR', 'YouTube could not be reached.', 400);
  }

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    throw new SanctumError('VALIDATION_ERROR', PRIVATE_VIDEO, 400);
  }
  if (!response.ok) {
    throw new SanctumError('VALIDATION_ERROR', 'YouTube could not be reached.', 400);
  }

  const body = await response.json() as { title?: string; author_name?: string };
  const title = body.title?.trim();
  if (!title) throw new SanctumError('VALIDATION_ERROR', PRIVATE_VIDEO, 400);
  return {
    videoId,
    title,
    authorName: body.author_name?.trim() || '',
    thumbnailUrl: hqThumbnail(videoId),
  };
}
