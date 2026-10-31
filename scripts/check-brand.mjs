import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const skip = new Set(['node_modules', '.next', 'dist', 'archive', 'import']);
const banned = ['newlogo', '/brand/logo.png', '/brand/logo-light.png', 'ChurchMark'];
const hits = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!/\.(tsx|ts|jsx|js|mjs|css|html|svg|md)$/.test(entry.name)) continue;
    const text = await readFile(full, 'utf8');
    for (const phrase of banned) {
      if (text.includes(phrase)) hits.push(`${path.relative(root, full)} contains ${phrase}`);
    }
  }
}

await walk(path.join(root, 'site'));
await walk(path.join(root, 'src'));

const chrome = await readFile(path.join(root, 'site/components/SiteChrome.tsx'), 'utf8');
if (!chrome.includes('BrandLockup')) hits.push('site/components/SiteChrome.tsx does not import BrandLockup');

if (hits.length) {
  console.error(hits.join('\n'));
  process.exit(1);
}
console.log('Brand lockup is the only logo.');
