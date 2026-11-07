// The server-rendered parts of the dashboard page (src/page.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { renderIndex } from '../src/page.js';
import { MARK } from '../src/icons.js';

const HTML = fs.readFileSync('public/index.html', 'utf8');

test('renderIndex: title, description and favicon in the head, escaped', () => {
  const out = renderIndex(HTML, { title: 'Lab <&>', description: 'My "lab"', favicon: 'https://example.com/f.png' });
  assert.match(out, /<title>Lab &lt;&amp;&gt;<\/title>/);
  assert.match(out, /<meta name="description" content="My &quot;lab&quot;">\n<\/head>|<meta name="description" content="My &quot;lab&quot;">\n<link/);
  assert.match(out, /<link rel="icon" href="https:\/\/example\.com\/f\.png">\n<\/head>/);
  assert.equal((out.match(/<title>/g) ?? []).length, 1);
});

test('renderIndex: favicon as a dashboard-icons name or a config icon, the mark when unset', () => {
  assert.match(renderIndex(HTML, { title: 'x', favicon: 'proxmox.svg' }), /<link rel="icon" href="https:\/\/cdn\.jsdelivr\.net\/[^"]+\/svg\/proxmox\.svg">/);
  assert.match(renderIndex(HTML, { title: 'x', favicon: '/icons/lab.png' }), /<link rel="icon" href="icons\/lab\.png">/);
  assert.ok(renderIndex(HTML, { title: 'x', favicon: 'dashboard' }).includes(`<link rel="icon" href="${MARK}">`), 'favicon: dashboard');
  const plain = renderIndex(HTML, { title: 'x' });
  assert.ok(plain.includes(`<link rel="icon" type="image/svg+xml" href="${MARK}">`), 'the mark');
  assert.ok(!plain.includes('name="description"'));
  assert.match(decodeURIComponent(MARK), /^data:image\/svg\+xml,<svg /, 'built in, no request');
});

test('renderIndex: a secret in the description never reaches the page', () => {
  const out = renderIndex(HTML, { title: 'x', description: 'key s3cret here' }, new Set(['s3cret']));
  assert.ok(!out.includes('s3cret'));
  assert.match(out, /content="key \*\*\* here"/);
});

test('the colours settings.yaml takes are the palettes the pages have, and the manifest uses their shade 800', async () => {
  const { COLORS } = await import('../src/config/schema.js');
  const { renderManifest } = await import('../src/page.js');
  const common = fs.readFileSync(path.resolve('public/common.js'), 'utf8');
  const palettes = new Function(`${/const PALETTES = \{[\s\S]*?\n\};/.exec(common)[0]} return PALETTES;`)();
  assert.deepEqual(Object.keys(palettes).sort(), [...COLORS].sort());
  const { LANGUAGES } = await import('../src/config/schema.js');
  const names = new Function(`${/const LANGUAGE_NAMES = \{[\s\S]*?\n\};/.exec(common)[0]} return LANGUAGE_NAMES;`)();
  assert.deepEqual(Object.keys(names), LANGUAGES, 'common.js names every language settings.yaml takes');
  for (const color of COLORS) assert.equal(renderManifest({ title: 'x', color, pwa: {} }).theme_color, palettes[color].split(' ')[8], color);
});

test('renderManifest: name, start_url, colours, icons from pwa or the favicon, shortcuts', async () => {
  const { renderManifest } = await import('../src/page.js');
  const plain = renderManifest({ title: 'Lab', color: 'emerald', pwa: {} });
  assert.deepEqual(plain, { name: 'Lab', short_name: 'Lab', start_url: '/', display: 'standalone', theme_color: '#065f46', background_color: '#065f46', icons: [{ src: MARK, sizes: 'any', type: 'image/svg+xml' }] });
  assert.deepEqual(renderManifest({ title: 'Lab', favicon: '/icons/lab.svg', pwa: {} }).icons, [{ src: 'icons/lab.svg', sizes: 'any' }]);

  const full = renderManifest({
    title: 'Lab', description: 'My lab', startUrl: '/#media', color: 'nope',
    pwa: { icons: [{ src: 'proxmox.png', sizes: '192x192', type: 'image/png' }], shortcuts: [{ name: 'Media', url: '/#media', description: 'tab' }] },
  }, new Set());
  assert.equal(full.start_url, '/#media');
  assert.equal(full.description, 'My lab');
  assert.equal(full.theme_color, '#1e293b', 'an unknown colour falls back to slate');
  assert.match(full.icons[0].src, /\/png\/proxmox\.png$/);
  assert.deepEqual(full.shortcuts, [{ name: 'Media', url: '/#media', description: 'tab' }]);
  assert.ok(renderIndex(HTML, { title: 'x' }).includes('<link rel="manifest" href="site.webmanifest">'));
});

test('renderIndex: settings.base as the first tag in the head', () => {
  const out = renderIndex(HTML, { title: 'x', base: 'https://lab.example.com/dashboard/' });
  const injected = out.slice(out.indexOf('<base'), out.indexOf('</head>'));
  assert.ok(injected.startsWith('<base href="https://lab.example.com/dashboard/">\n<link rel="manifest"'));
});

test('common.js: the texts the pages share, in every language', async () => {
  const { readI18n } = await import('../scripts/i18n.mjs');
  const { checkLanguages } = await import('./helpers.mjs');
  checkLanguages(assert, readI18n('public/common.js'));
});
