import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalBase, stampMetadata, buildSite } from '../scripts/build-site.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('site URL normalization supports subpath and custom domain', () => {
  assert.equal(canonicalBase('https://example.github.io/dayfair'), 'https://example.github.io/dayfair/');
  assert.equal(canonicalBase('https://example.org/'), 'https://example.org/');
  assert.throws(() => canonicalBase('http://example.org'), /HTTPS/);
  assert.throws(() => canonicalBase('https://example.org/?token=hello'), /HTTPS/);
  assert.throws(() => canonicalBase(''), /SITE_URL/);
});

test('index metadata uses absolute URLs and accurate public application schema', async () => {
  const source = await readFile(join(root, 'index.html'), 'utf8');
  const html = stampMetadata(source, 'index.html', canonicalBase('https://example.github.io/dayfair'));
  assert.match(html, /rel="canonical" href="https:\/\/example.github.io\/dayfair\/"/);
  assert.match(html, /property="og:url" content="https:\/\/example.github.io\/dayfair\/"/);
  assert.match(html, /property="og:image" content="https:\/\/example.github.io\/dayfair\/assets\/og-preview.png"/);
  assert.match(html, /name="twitter:image" content="https:\/\/example.github.io\/dayfair\/assets\/og-preview.png"/);
  assert.match(html, /"isAccessibleForFree":true/);
  assert.doesNotMatch(html, /DAYFAIR_DEPLOY_METADATA/);
});

test('privacy URL gets its own canonical', async () => {
  const source = await readFile(join(root, 'privacy.html'), 'utf8');
  const html = stampMetadata(source, 'privacy.html', 'https://example.org/');
  assert.match(html, /rel="canonical" href="https:\/\/example.org\/privacy.html"/);
  assert.doesNotMatch(html, /DAYFAIR_DEPLOY_METADATA/);
});

test('build produces deployable static files without mutating source', async () => {
  const dir = await mkdtemp(join(root, '.test-site-'));
  const dest = join(dir, 'site');
  try {
    const original = await readFile(join(root, 'index.html'), 'utf8');
    await buildSite('https://example.github.io/my-repo/', { root, out: dest });
    const output = await readFile(join(dest, 'index.html'), 'utf8');
    assert.match(output, /example.github.io\/my-repo\/assets\/og-preview.png/);
    assert.notEqual(original, output);
    assert.equal(original, await readFile(join(root, 'index.html'), 'utf8'));
    assert.equal((await readFile(join(dest, '.nojekyll'), 'utf8')), '');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
