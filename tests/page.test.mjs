// The server-rendered parts of the dashboard page (src/page.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { renderIndex } from '../src/page.js';

const HTML = fs.readFileSync('public/index.html', 'utf8');

test('renderIndex: title, description and favicon in the head, escaped', () => {
  const out = renderIndex(HTML, { title: 'Lab <&>', description: 'My "lab"', favicon: 'https://example.com/f.png' });
  assert.match(out, /<title>Lab &lt;&amp;&gt;<\/title>/);
  assert.match(out, /<meta name="description" content="My &quot;lab&quot;">\n<\/head>|<meta name="description" content="My &quot;lab&quot;">\n<link/);
  assert.match(out, /<link rel="icon" href="https:\/\/example\.com\/f\.png">\n<\/head>/);
  assert.equal((out.match(/<title>/g) ?? []).length, 1);
});

test('renderIndex: favicon as a dashboard-icons name or a config icon, dashboard.svg when unset', () => {
  assert.match(renderIndex(HTML, { title: 'x', favicon: 'proxmox.svg' }), /<link rel="icon" href="https:\/\/cdn\.jsdelivr\.net\/[^"]+\/svg\/proxmox\.svg">/);
  assert.match(renderIndex(HTML, { title: 'x', favicon: '/icons/lab.png' }), /<link rel="icon" href="icons\/lab\.png">/);
  assert.ok(renderIndex(HTML, { title: 'x', favicon: 'dashboard' }).includes('<link rel="icon" href="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/dashboard.png">'), 'dashboard is a dashboard-icons name like any other');
  const plain = renderIndex(HTML, { title: 'x' });
  assert.ok(plain.includes('<link rel="icon" href="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/dashboard.svg">'), 'Dashboard\'s icon by default');
  assert.ok(renderIndex(HTML, { title: 'x', favicon: '' }).includes('https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/dashboard.svg'), 'an empty favicon is the default');
  assert.ok(!plain.includes('name="description"'));
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
  assert.deepEqual(plain, { name: 'Lab', short_name: 'Lab', start_url: '/', display: 'standalone', theme_color: '#065f46', background_color: '#065f46', icons: [{ src: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/dashboard.svg', sizes: 'any' }] });
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

test('the form pages\' colours: text, field edges, the accent and the status colours readable in every palette and appearance', () => {
  const common = fs.readFileSync(path.resolve('public/common.js'), 'utf8');
  const { formColors, PALETTES, contrast, over, rgbOf, WHITE } = new Function(`${common}; return { formColors, PALETTES, contrast, over, rgbOf, WHITE };`)();
  const problems = [];
  for (const color of Object.keys(PALETTES)) {
    const t = Object.fromEntries(PALETTES[color].split(' ').map((hex, i) => [[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950][i], rgbOf(hex)]));
    const surfaces = {
      dark: [t[800], over(WHITE, t[800], 0.05), over(t[900], over(WHITE, t[800], 0.05), 0.3)],
      light: [t[50], WHITE, over(t[200], WHITE, 0.5)],
    };
    for (const [look, c] of Object.entries(formColors(color))) {
      const need = { heading: 4.5, text: 4.5, muted: 4.5, accent: 4.5, ok: 4.5, warn: 4.5, error: 4.5, field: 3 };
      for (const [key, ratio] of Object.entries(need)) {
        for (const surface of surfaces[look]) {
          const r = contrast(c[key], surface);
          if (r < ratio) problems.push(`${color} ${look} ${key}: ${r.toFixed(2)} < ${ratio}`);
        }
      }
      if (contrast(c.onAccent, c.accent) < 4.5) problems.push(`${color} ${look} on the accent: ${contrast(c.onAccent, c.accent).toFixed(2)}`);
    }
  }
  assert.deepEqual(problems, []);
});
