const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/i;

export function isJoinSlug(value: string | undefined | null): boolean {
  if (!value) return false;
  const slug = value.trim().toLowerCase();
  return slug !== 'join' && SLUG_PATTERN.test(slug);
}

/** Pull a room or church slug out of a pasted Sanctum join URL or short code. */
export function parseJoinInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const pathFromUrl = extractPath(trimmed);
  if (pathFromUrl) {
    const parts = pathFromUrl.split('/').filter(Boolean);
    const joinIndex = parts.findIndex((part) => part.toLowerCase() === 'join');
    if (joinIndex >= 0) {
      const slug = parts[joinIndex + 1];
      return isJoinSlug(slug) ? slug.toLowerCase() : null;
    }
    if (parts.length === 1 && isJoinSlug(parts[0])) {
      return parts[0].toLowerCase();
    }
  }

  const token = trimmed.split(/[/?#\s]/).filter(Boolean).pop();
  return isJoinSlug(token) ? token!.toLowerCase() : null;
}

function extractPath(value: string): string | null {
  if (value.startsWith('/')) {
    return value.split(/[?#]/)[0];
  }
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withProtocol).pathname;
  } catch {
    return null;
  }
}
