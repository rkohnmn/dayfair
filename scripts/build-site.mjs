/** Build a ready-to-upload static folder; stamp canonical and social URLs from the actual Pages URL. */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join, sep } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MARKER = '<!-- DAYFAIR_DEPLOY_METADATA -->';

export function canonicalBase(input) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('SITE_URL must be a public https:// URL (from configure-pages base_url).');
  let url;
  try { url = new URL(input.trim()); } catch { throw new Error('Invalid SITE_URL: expected an absolute https:// URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('SITE_URL must use HTTPS and cannot contain credentials, query strings, or fragments.');
  }
  if (url.port && url.port !== '443') throw new Error('SITE_URL cannot include a nonstandard port.');
  url.pathname = url.pathname.replace(/\/+$/, '') + '/';
  return url.href;
}

export function stampMetadata(html, pathname, base) {
  if (!html.includes(MARKER)) throw new Error(`Missing metadata insertion marker in ${pathname}`);
  const pageUrl = pathname === 'index.html' ? base : new URL(pathname, base).href;
  const tags = [`<link rel="canonical" href="${pageUrl}">`];
  if (pathname === 'index.html') {
    const image = new URL('assets/og-preview.png', base).href;
    html = html.replace('<meta property="og:image" content="assets/og-preview.png">', `<meta property="og:image" content="${image}">`)
      .replace('<meta name="twitter:image" content="assets/og-preview.png">', `<meta name="twitter:image" content="${image}">`);
    tags.push(`<meta property="og:url" content="${pageUrl}">`);
    const schema = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Dayfair', url: pageUrl, description: 'A free, local-first bill splitter for roommates with changing occupancy and billing periods.', applicationCategory: 'FinanceApplication', operatingSystem: 'Any', isAccessibleForFree: true };
    tags.push(`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`);
  }
  return html.replace(MARKER, tags.join('\n  '));
}

export async function buildSite(siteUrl, { root = ROOT, out = join(root, 'site') } = {}) {
  const base = canonicalBase(siteUrl);
  const resolvedRoot = resolve(root);
  const resolvedOut = resolve(out);
  const rootPrefix = resolvedRoot.endsWith(sep) ? resolvedRoot : resolvedRoot + sep;
  if (!resolvedOut.startsWith(rootPrefix)) {
    throw new Error('Refusing to write site output outside project directory.');
  }
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  for (const name of ['assets', 'css', 'js']) await cp(join(root, name), join(out, name), { recursive: true });
  for (const name of ['index.html', 'privacy.html']) {
    const html = await readFile(join(root, name), 'utf8');
    await writeFile(join(out, name), stampMetadata(html, name, base));
  }
  await writeFile(join(out, '.nojekyll'), '');
  return { base, out };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv.indexOf('--base-url');
  const siteUrl = arg >= 0 ? process.argv[arg + 1] : process.env.SITE_URL;
  try {
    const { base, out } = await buildSite(siteUrl);
    process.stdout.write(`Built ${out} for ${base}\n`);
  } catch (error) {
    process.stderr.write(`Build error: ${error.message}\n`);
    process.exitCode = 1;
  }
}
