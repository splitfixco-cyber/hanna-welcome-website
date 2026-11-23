// Regenerates sitemap.xml from the HTML pages. Run `npm run sitemap` after adding, renaming or removing a page.
// A page is listed unless it is noindex, a redirect, or its canonical points to another page
// (for example the English and Portuguese versions of a Spanish book's page). See docs/SEO.md.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const SITE = 'https://www.hannasuniverse.com';
const today = new Date().toISOString().slice(0, 10);

const files = [
  ...readdirSync('.').filter((f) => f.endsWith('.html')),
  'hey/index.html',
  ...readdirSync('hey').filter((d) => /^\d+$/.test(d)).map((d) => `hey/${d}/index.html`),
].filter((f) => existsSync(f));

const urlOf = (file) => `${SITE}/${file.replace(/(^|\/)index\.html$/, '$1')}`;

function lastmod(file) {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  if (git('status', '--porcelain', '--', file)) return today;
  return git('log', '-1', '--format=%cs', '--', file) || today;
}

const entries = files.flatMap((file) => {
  const html = readFileSync(file, 'utf8');
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) return [];
  if (/http-equiv=["']refresh["']/i.test(html)) return [];
  const url = urlOf(file);
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
  if (canonical && canonical !== url) return [];
  return [{ url, lastmod: lastmod(file) }];
});
entries.sort((a, b) => (a.url === `${SITE}/` ? -1 : b.url === `${SITE}/` ? 1 : a.url.localeCompare(b.url)));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;
writeFileSync('sitemap.xml', xml);
console.log(`sitemap.xml: ${entries.length} pages`);
