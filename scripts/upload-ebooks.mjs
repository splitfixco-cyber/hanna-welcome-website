// Upload e-book files to the site's private Vercel Blob store.
//   node scripts/upload-ebooks.mjs <folder>
// The folder must sit OUTSIDE this repo (the repo is public). Each file must be named <slug>.pdf or <slug>.epub,
// e.g. the-essence-of-raising-children.pdf. Requires BLOB_READ_WRITE_TOKEN in the environment or in .env.local.
import { put } from '@vercel/blob';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EBOOKS } from '../lib/ebooks.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadDotEnv() {
  try {
    const text = await readFile(path.join(repoRoot, '.env.local'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
}

const folder = process.argv[2];
if (!folder) {
  console.error('usage: node scripts/upload-ebooks.mjs <folder-with-pdfs>');
  process.exit(1);
}
await loadDotEnv();
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set (put it in .env.local)');
  process.exit(1);
}
if (path.resolve(folder).toLowerCase().startsWith(repoRoot.toLowerCase())) {
  console.error('Refusing: that folder is inside the public repo. Keep e-book files outside it.');
  process.exit(1);
}

const seen = new Set();
for (const name of await readdir(folder)) {
  const m = name.match(/^(.+)\.(pdf|epub)$/i);
  if (!m) continue;
  const slug = m[1];
  const ext = m[2].toLowerCase();
  if (!EBOOKS[slug]) {
    console.warn(`skip ${name}: "${slug}" is not a known e-book slug`);
    continue;
  }
  const full = path.join(folder, name);
  const size = (await stat(full)).size;
  const blob = await put(`ebooks/${slug}.${ext}`, await readFile(full), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: ext === 'pdf' ? 'application/pdf' : 'application/epub+zip',
  });
  console.log(`uploaded ${blob.pathname}  (${(size / 1024 / 1024).toFixed(1)} MB)`);
  seen.add(slug);
}
const missing = Object.keys(EBOOKS).filter((s) => !seen.has(s));
console.log(`${seen.size} file(s) uploaded.` + (missing.length ? ` Still missing: ${missing.join(', ')}` : ' All e-books present.'));
