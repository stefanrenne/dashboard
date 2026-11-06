// Recreates the README and home page screenshots from scripts/showcase (see
// docs/extend/contributing/development.md): its widgets ask the fake homelab of a widgets
// collection checkout (DASHBOARD_COLLECTION_DIR, else ../dashboard-widgets), which answers from
// the collection's fixtures. Status checks and system resources are stubbed, so the screenshots
// do not depend on the network or this machine.
// Playwright is deliberately not in package.json: only needed when the screenshots are refreshed.
//   npm install --no-save playwright && npx playwright install chromium
// On a host without the browser's libraries (Unraid, Alpine), in Playwright's image instead, with
// the same Playwright version installed (--no-save) and the collection next to this repository:
//   docker run --rm --ipc=host -v "$PWD:/work" -v "$PWD/../dashboard-widgets:/dashboard-widgets:ro" -w /work \
//     mcr.microsoft.com/playwright:v1.52.0-noble node scripts/screenshots.mjs
//   node scripts/screenshots.mjs                       (all)
//   node scripts/screenshots.mjs --only settings       (or: --only dashboard)
// The settings page's pictures (docs/configuration/README.md) are of its General, Services and
// Groups sections, in the dark appearance; the showcase gets an admin password for them.
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/actionauth.js';

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

const root = fileURLToPath(new URL('..', import.meta.url));
const out = root + 'docs/images/';
const quiet = { info() {}, warn() {}, error() {} };

const collection = path.resolve(process.env.DASHBOARD_COLLECTION_DIR ?? path.join(root, '../dashboard-widgets'));
const { startMock } = await import(path.join(collection, 'scripts/mock-homelab.mjs'));
const mock = await startMock();

// the showcase with its widgets pointed at the mock
const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hd-showcase-'));
for (const file of fs.readdirSync(root + 'scripts/showcase')) {
  const text = fs.readFileSync(path.join(root, 'scripts/showcase', file), 'utf8');
  fs.writeFileSync(path.join(configDir, file), text.replaceAll('http://mock.lan', mock.url));
}

// the settings page opens only with an admin password; the page asks from 127.0.0.1, which needs none
fs.appendFileSync(path.join(configDir, 'settings.yaml'), `\nadminPassword: "${hashPassword('showcase-only-1', { N: 1024 })}"\n`);

const app = await createApp({ configDir, log: quiet, defaultPlugins: [{ path: collection, label: 'widgets' }], dockerSocket: null, releasesUrl: null });
const server = http.createServer(app.handler).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const url = `http://127.0.0.1:${server.address().port}/`;

// Stable data for what would otherwise ask the network or this machine.
const byType = {};
for (const g of app.layout.groups) for (const s of g.services) for (const w of [...s.statuses, ...s.widgets]) byType[w.instanceId] = w.type;
for (const w of app.layout.header) byType[w.instanceId] = w.type;
let latency = 11;
const fake = {
  'http-status': () => ({ status: 'up', latency: (latency += 7) % 60, blocks: [{ label: 'status', value: 200, status: 'ok' }] }),
  ping: () => ({ status: 'up', latency: 2.4, blocks: [] }),
  resources: () => ({
    blocks: [],
    meters: [
      { kind: 'cpu', text: '8%', caption: 'cpu', percent: 8 },
      { kind: 'memory', text: '9.4 GB', caption: 'free', percent: 41 },
      { kind: 'disk', text: '1.2 TB', caption: 'free', percent: 63 },
    ],
  }),
};

const browser = await chromium.launch();
for (const scheme of only === 'settings' ? [] : ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme, locale: 'en-US', timezoneId: 'Europe/Amsterdam' });
  await ctx.addInitScript(() => {
    const fixed = new Date('2026-10-23T09:41:00+02:00').getTime();
    const RealDate = Date;
    globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
  });
  const page = await ctx.newPage();
  await page.route('**/api/widgets/*', (route) => {
    const id = route.request().url().split('?')[0].split('/').pop();
    const stub = fake[byType[id]];
    if (stub) return route.fulfill({ json: { ok: true, data: stub(), fetchedAt: 0 } });
    return route.continue();
  });
  await page.goto(url);
  await page.waitForSelector('.card');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // icons and widget data
  await page.screenshot({ path: `${out}screenshot-${scheme}.png`, fullPage: true });
  await ctx.close();
}
// the settings page: three sections, the first screen of each
if (only !== 'dashboard') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark', locale: 'en-US', timezoneId: 'Europe/Amsterdam' });
  const page = await ctx.newPage();
  // the forms show the config as written: the showcase's example address, not the mock's
  await page.route('**/api/settings/**', async (route) => {
    const res = await route.fetch();
    route.fulfill({ response: res, body: (await res.text()).replaceAll(mock.url, 'http://mock.lan') });
  });
  for (const [section, ready, open] of [['general', '#title', null], ['services', '.card', '.card details'], ['layout', '.card', '.card details']]) {
    await page.goto(`${url}settings#${section}`);
    await page.waitForSelector(ready);
    // the first card's settings open, to show the form
    if (open) await page.evaluate((sel) => { const d = document.querySelector(sel); if (d) { d.open = true; d.dispatchEvent(new Event('toggle')); } }, open);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // icon previews
    await page.screenshot({ path: `${out}settings-${section === 'layout' ? 'groups' : section}.png` });
  }
  await ctx.close();
}
await browser.close();
app.close();
server.close();
await mock.close();
fs.rmSync(configDir, { recursive: true, force: true });
console.log('written to', out);
