const ALLOWED_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be']);

export function youtubeId(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be' || parsed.hostname === 'www.youtu.be') {
      return parsed.pathname.split('/').filter(Boolean)[0] || null;
    }
    if (parsed.hostname.endsWith('youtube.com') || parsed.hostname.endsWith('youtube-nocookie.com')) {
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] || null;
      if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2] || null;
      if (parsed.pathname.startsWith('/live/')) return parsed.pathname.split('/')[2] || null;
      return parsed.searchParams.get('v');
    }
  } catch {
    return null;
  }
  return null;
}

export function isAllowedYoutubeHost(url: string) {
  try {
    return ALLOWED_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function hqThumbnail(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function kampalaDay(iso: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

const CHANNEL_ID = /^UC[a-zA-Z0-9_-]{22}$/;

export type ChannelInput =
  | { kind: 'id'; channelId: string }
  | { kind: 'handle'; handle: string };

export function classifyChannelInput(value: string): ChannelInput | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (CHANNEL_ID.test(trimmed)) return { kind: 'id', channelId: trimmed };

  const handle = trimmed.startsWith('@') ? trimmed.slice(1) : '';
  if (handle && !handle.includes('/') && !handle.includes(' ')) return { kind: 'handle', handle };

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '');
  if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts[0] === 'channel' && parts[1] && CHANNEL_ID.test(parts[1])) return { kind: 'id', channelId: parts[1] };
  if (parts[0]?.startsWith('@')) return { kind: 'handle', handle: parts[0].slice(1) };
  return null;
}

const BIBLE_BOOKS = [
  'Song of Solomon', 'Song of Songs', '1 Thessalonians', '2 Thessalonians', '1 Corinthians', '2 Corinthians',
  '1 Chronicles', '2 Chronicles', '1 Timothy', '2 Timothy', 'Lamentations', 'Ecclesiastes', 'Deuteronomy',
  'Philippians', 'Colossians', '1 Chronicles', 'Zephaniah', 'Zechariah', 'Habakkuk', 'Nehemiah', 'Leviticus',
  'Revelation', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Ephesians', 'Galatians', 'Philemon', 'Proverbs', 'Obadiah', 'Malachi', 'Matthew', 'Genesis', 'Exodus',
  'Numbers', 'Joshua', 'Judges', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Daniel', 'Hebrews', 'Psalms', 'Esther',
  'Haggai', 'Hosea', 'Micah', 'Nahum', 'Romans', 'Psalm', 'James', 'Exodus', 'Titus', 'Jude', 'Ezra', 'Ruth',
  'Joel', 'Amos', 'Jonah', 'Mark', 'Luke', 'John', 'Acts', 'Job',
].sort((left, right) => right.length - left.length);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SCRIPTURE_PATTERN = new RegExp(
  `^(?:(?:${BIBLE_BOOKS.map(escapeRegExp).join('|')})|(?:Ps|Psa)\\.?)\\s+\\d{1,3}(?::\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})?)?$`,
  'i',
);

const SPEAKER_TITLE = /^(pastor|pst|ps|rev|bishop|apostle|evangelist|prophetess|prophet)\.?\s*/i;
const TITLE_SEPARATOR = /\s*\|\s*|\s+[–—]\s+|\s+-\s+/;
const RECURRING_SERIES = ['Upper Room'];
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

export type KnownSpeakers = {
  defaultSpeaker?: string | null;
  aliases?: string[];
};

export type ParsedSermonTitle = {
  title: string;
  scripture: string | null;
  speaker: string | null;
  seriesName: string | null;
};

function cleanTitle(value: string) {
  return value
    .replace(/^[\s"'“”‘’|.,;:–—-]+/, '')
    .replace(/[\s"'“”‘’|.,;:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameParts(value: string) {
  const withoutTitle = value.trim().replace(SPEAKER_TITLE, '');
  const expanded = withoutTitle
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/['’]s\b/gi, '')
    .replace(/['’]/g, '');
  return expanded
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function partsCovered(shorter: string, longerParts: string[]) {
  let built = '';
  let count = 0;
  for (const part of longerParts) {
    const next = built + part;
    if (!shorter.startsWith(next)) break;
    built = next;
    count += 1;
    if (built.length >= shorter.length) break;
  }
  return built === shorter ? count : 0;
}

function sharedLeadingParts(leftParts: string[], rightParts: string[]) {
  let count = 0;
  const limit = Math.min(leftParts.length, rightParts.length);
  for (let index = 0; index < limit; index += 1) {
    if (leftParts[index] !== rightParts[index]) break;
    count += 1;
  }
  return count;
}

function speakerNamesMatch(left: string, right: string) {
  const leftParts = nameParts(left);
  const rightParts = nameParts(right);
  const leftKey = leftParts.join('');
  const rightKey = rightParts.join('');
  if (!leftKey || !rightKey) return false;
  if (leftKey === rightKey) return true;
  if (sharedLeadingParts(leftParts, rightParts) >= 2) return true;
  if (rightKey.startsWith(leftKey)) return partsCovered(leftKey, rightParts) >= 2;
  if (leftKey.startsWith(rightKey)) return partsCovered(rightKey, leftParts) >= 2;
  return false;
}

export function normalizeSpeaker(value: string, known: KnownSpeakers = {}) {
  const trimmed = value.trim();
  const names = [known.defaultSpeaker, ...(known.aliases ?? [])].filter((name): name is string => Boolean(name?.trim()));
  const matched = names.some((name) => speakerNamesMatch(trimmed, name));
  if (matched && known.defaultSpeaker?.trim()) return known.defaultSpeaker.trim();
  return trimmed;
}

function speakerName(segment: string) {
  const match = segment.trim().match(/^(pastor|pst|ps|rev|bishop|apostle|evangelist|prophetess|prophet)\.?\s*(.+)$/i);
  const rest = match?.[2]?.trim() ?? '';
  if (!rest || /^\d/.test(rest)) return null;
  return segment.trim();
}

function isAllCaps(value: string) {
  const letters = value.replace(/[^A-Za-z]/g, '');
  return letters.length > 0 && letters === letters.toUpperCase();
}

function isEveryWordCapitalized(value: string) {
  const words = value.match(/[A-Za-z][A-Za-z']*/g) ?? [];
  return words.length > 0 && words.every((word) => /^[A-Z]/.test(word));
}

function bookSpelling(word: string) {
  const key = word.toLowerCase();
  return BIBLE_BOOKS.find((book) => !book.includes(' ') && book.toLowerCase() === key) ?? null;
}

function restoreBibleBooks(value: string) {
  return [...BIBLE_BOOKS].sort((left, right) => right.length - left.length).reduce((title, book) => {
    const pattern = new RegExp(`\\b${book.split(/\s+/).map(escapeRegExp).join('\\s+')}\\b`, 'i');
    return title.replace(pattern, book);
  }, value);
}

function titleCaseWord(token: string, isEdge: boolean) {
  const match = token.match(/^([^A-Za-z0-9]*)([A-Za-z][A-Za-z']*)([^A-Za-z0-9]*)$/);
  if (!match) return token;
  const [, lead, word, trail] = match;
  const letters = word.replace(/'/g, '');
  if (letters.length >= 2 && letters === letters.toUpperCase() && !/[aeiou]/i.test(letters)) return token;
  const book = bookSpelling(word);
  if (book) return `${lead}${book}${trail}`;
  const lower = word.toLowerCase();
  if (!isEdge && SMALL_WORDS.has(lower)) return `${lead}${lower}${trail}`;
  return `${lead}${lower.charAt(0).toUpperCase()}${lower.slice(1)}${trail}`;
}

export function tidyTitle(value: string) {
  const spaced = value
    .replace(/\s*&\s*/g, ' & ')
    .replace(/([,.:])(?=[A-Za-z])/g, '$1 ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  if (!isAllCaps(spaced) && !isEveryWordCapitalized(spaced)) return spaced;
  const words = spaced.split(/(\s+)/);
  const indexes = words.flatMap((word, index) => (/[A-Za-z]/.test(word) ? [index] : []));
  const cased = words.map((word, index) => {
    const place = indexes.indexOf(index);
    if (place === -1) return word;
    return titleCaseWord(word, place === 0 || place === indexes.length - 1);
  }).join('');
  return restoreBibleBooks(cased);
}

function matchSeries(segment: string, seriesNames: string[]): string | null {
  const candidates = [...seriesNames.map((name) => name.trim()).filter(Boolean), ...RECURRING_SERIES];
  const unique = [...new Map(candidates.map((name) => [name.toLowerCase(), name])).values()];
  unique.sort((left, right) => right.length - left.length);
  const found = unique.find((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(segment.trim()));
  return found ?? null;
}

export function parseSermonTitle(raw: string, knownSpeakers: KnownSpeakers = {}, seriesNames: string[] = []): ParsedSermonTitle {
  const segments = raw.split(TITLE_SEPARATOR).map((part) => part.trim()).filter(Boolean);
  const split = segments.length > 1;
  const pool = split ? segments : [raw.trim()].filter(Boolean);
  let scripture: string | null = null;
  let speaker: string | null = null;
  let seriesName: string | null = null;
  const rest: string[] = [];

  for (const segment of pool) {
    const probe = segment.replace(/[.,;]+$/, '').trim();
    if (!scripture && SCRIPTURE_PATTERN.test(probe)) {
      scripture = probe;
      continue;
    }
    if (!speaker) {
      const namedSpeaker = speakerName(segment);
      if (namedSpeaker) {
        const normalized = normalizeSpeaker(namedSpeaker, knownSpeakers);
        const words = namedSpeaker.replace(SPEAKER_TITLE, '').trim().split(/\s+/).filter(Boolean);
        if (normalized !== namedSpeaker || words.length <= 4) speaker = normalized;
        continue;
      }
    }
    if (split && !seriesName) {
      const matchedSeries = matchSeries(segment, seriesNames);
      if (matchedSeries) {
        seriesName = matchedSeries;
        continue;
      }
    }
    rest.push(segment);
  }

  return {
    title: tidyTitle(cleanTitle(rest[0] || raw) || raw.trim()),
    scripture,
    speaker,
    seriesName,
  };
}
