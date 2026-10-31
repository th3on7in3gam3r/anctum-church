import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const roots = process.argv.slice(2);
const banned = ['Miracle Center', 'Pastor Kenneth', '[PLACEHOLDER]'];
const skip = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.map', '.pack', '.ttf']);
const hits = [];

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'cache') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (skip.has(path.extname(entry.name))) continue;
    const text = await readFile(full, 'utf8').catch(() => '');
    for (const phrase of banned) {
      if (text.includes(phrase)) hits.push(`${full} contains ${phrase}`);
    }
  }
}

for (const root of roots) await walk(root);
if (hits.length) {
  console.error(hits.join('\n'));
  process.exit(1);
}
if (roots.length) console.log(`Built output is clear of sample copy (${roots.join(', ')}).`);
