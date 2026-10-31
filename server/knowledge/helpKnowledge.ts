import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const HELP_DIR = path.resolve(process.cwd(), 'docs/help');

let cachedKnowledge: string | null = null;

export function loadHelpKnowledge(): string {
  if (cachedKnowledge) return cachedKnowledge;

  const files = readdirSync(HELP_DIR).filter((name) => name.endsWith('.md'));
  const sections = files.map((name) => {
    const content = readFileSync(path.join(HELP_DIR, name), 'utf8');
    return `## File: ${name}\n\n${content}`;
  });

  cachedKnowledge = sections.join('\n\n---\n\n');
  return cachedKnowledge;
}

export function selectRelevantKnowledge(query: string): string {
  const full = loadHelpKnowledge();
  const lower = query.toLowerCase();
  const keywords: Record<string, string[]> = {
    'control-room.md': ['control room', 'host mic', 'sermon', 'ptt', 'discussion', 'roster', 'raised hand', 'private prayer', 'end session', 'open sanctuary', 'pre-prayer'],
    'settings-team-branding.md': ['settings', 'team', 'admin', 'branding', 'invite', 'logo', 'owner'],
    'troubleshooting.md': ['error', 'cannot hear', 'livekit', 'unavailable', 'broken', 'not working', 'fix', 'problem', 'issue'],
    'getting-started.md': ['create', 'start', 'first', 'how to', 'join link', 'walkthrough', 'setup', 'onboarding'],
  };

  const matched = new Set<string>(['getting-started.md']);
  for (const [file, terms] of Object.entries(keywords)) {
    if (terms.some((term) => lower.includes(term))) {
      matched.add(file);
    }
  }

  return [...matched]
    .map((name) => {
      const content = readFileSync(path.join(HELP_DIR, name), 'utf8');
      return `### ${name}\n${content}`;
    })
    .join('\n\n');
}
