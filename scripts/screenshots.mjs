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
//   node scripts/screenshots.mjs --only settings       (or: --only dashboard, --only setup)
// The settings page's pictures (docs/configuration/README.md) are of its General, Services and
// Groups sections, in the dark appearance; the showcase gets an admin password for them.
// The setup pictures (docs/configuration/first-start.md) walk the setup wizard of an empty config
// folder, step by step, the settings page of a dashboard without an admin password, and the login
// page's "forgot the password". Docker is
// made up there (a socket with a few containers of the fake homelab), and so are the tests' answers.
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

/** A dashboard of its own on an empty config folder (`files`), for the setup pictures; { app, url, close }. */
async function emptyDashboard(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hd-setup-'));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
  const own = await createApp({ configDir: dir, log: quiet, defaultPlugins: [{ path: collection, label: 'widgets' }], dockerSocket: null, releasesUrl: null });
  own.onboarding.announce('http://dash.lan:3000', { noPassword: !own.hasPassword });
  const srv = http.createServer(own.handler).listen(0, '127.0.0.1');
  await new Promise((r) => srv.once('listening', r));
  return { app: own, url: `http://127.0.0.1:${srv.address().port}/`, close: () => { own.close(); srv.close(); fs.rmSync(dir, { recursive: true, force: true }); } };
}

// the made-up Docker of the setup pictures: one socket, the containers the wizard would find
const SETUP_DOCKER = { socketMounted: true, servers: [{ name: 'local', target: '/var/run/docker.sock', ok: true, version: '27.3.1', containers: 9 }], errors: [] };
const SETUP_CONTAINERS = [
  { name: 'radarr', image: 'lscr.io/linuxserver/radarr', widget: 'radarr', url: 'http://radarr:7878', href: 'http://nas.lan:7878', group: 'Media', server: 'local' },
  { name: 'sonarr', image: 'lscr.io/linuxserver/sonarr', widget: 'sonarr', url: 'http://sonarr:8989', href: 'http://nas.lan:8989', group: 'Media', server: 'local' },
  { name: 'plex', image: 'plexinc/pms-docker', widget: 'plex', url: 'http://plex:32400', href: 'http://nas.lan:32400', group: 'Media', server: 'local' },
  { name: 'pihole', image: 'pihole/pihole', widget: 'pihole', url: 'http://pihole', href: 'http://nas.lan:8053', group: 'Network', server: 'local' },
  { name: 'mariadb', image: 'mariadb', widget: null, url: null, href: null, group: 'Other', server: 'local' },
];
const SETUP_TESTS = {
  radarr: [{ label: 'Wanted', value: 8 }, { label: 'Queued', value: 2 }, { label: 'Movies', value: 412 }],
  sonarr: [{ label: 'Wanted', value: 14 }, { label: 'Queued', value: 1 }, { label: 'Series', value: 96 }],
  plex: [{ label: 'Streams', value: 1 }, { label: 'Movies', value: 412 }, { label: 'Shows', value: 96 }],
  pihole: [{ label: 'Queries', value: 18342 }, { label: 'Blocked', value: 2471 }],
};

/**
 * The page from its top (or from its content, `fromContent`), cut to its content (`content`, with a
 * margin) and to at most `maxHeight`.
 */
async function shot(page, name, maxHeight = 1000, content = 'main', fromContent = false) {
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); return document.fonts.ready; });
  await page.waitForTimeout(600);
  const box = await page.locator(content).boundingBox();
  const x = Math.max(0, Math.floor(box.x - 40));
  const width = Math.min(page.viewportSize().width - x, Math.ceil(box.width + 80));
  const y = fromContent ? Math.max(0, Math.floor(box.y - 40)) : 0;
  const height = Math.min(maxHeight, Math.ceil(box.y + box.height + 40) - y);
  await page.screenshot({ path: `${out}${name}.png`, fullPage: true, clip: { x, y, width, height } });
}

async function setupShots() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark', locale: 'en-US', timezoneId: 'Europe/Amsterdam' });
  const page = await ctx.newPage();
  await page.route('**/api/onboarding/docker', (route) => route.fulfill({ json: SETUP_DOCKER }));
  await page.route('**/api/onboarding/containers', (route) => route.fulfill({ json: { containers: SETUP_CONTAINERS, problems: [] } }));
  await page.route('**/api/onboarding/test', async (route) => {
    const { type } = route.request().postDataJSON();
    route.fulfill({ json: { ok: true, blocks: SETUP_TESTS[type] ?? [] } });
  });

  // the setup wizard of an empty config folder
  const wizard = await emptyDashboard({ '.onboarding': '' });
  await page.goto(`${wizard.url.replace('127.0.0.1', 'dash.lan')}setup`);
  await page.waitForSelector('#setup-code');
  await shot(page, 'setup-code');
  await page.fill('#setup-code', wizard.app.onboarding.code);
  await page.click('button[type=submit]');
  await page.waitForSelector('#title');
  await page.fill('#title', 'Homelab');
  await shot(page, 'setup-basics');
  const next = () => page.click('.actions .right button.primary');
  await next();
  await page.waitForSelector('#docker-address');
  await page.waitForSelector('li.ok');
  await shot(page, 'setup-docker');
  await next();
  await page.waitForSelector('#card-0');
  // the keys the widgets need, then a test of the first one
  for (const input of await page.$$('.card.on input[type=password]')) if (await input.isVisible()) await input.fill('{{DASHBOARD_VAR_KEY}}');
  await page.click('#card-0 .row button');
  await page.waitForSelector('#card-0 .result.ok');
  await shot(page, 'setup-services', 1100);
  await next();
  await page.waitForSelector('#admin-password');
  // the step draws itself again while typing: one field, then the other once it has
  await page.fill('#admin-password', 'showcase-only-1');
  await page.waitForTimeout(300);
  await page.fill('#admin-repeat', 'showcase-only-1');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.getElementById('admin-repeat')?.value === 'showcase-only-1' && !document.getElementById('admin-problem'));
  await shot(page, 'setup-security', 1400);
  await next();
  await page.waitForSelector('ul.files');
  await shot(page, 'setup-done');
  wizard.close();

  // forgot the admin password: the login page asks the dashboard for a code in its log
  const locked = await emptyDashboard({ 'settings.yaml': `title: Homelab\nlogin: true\nadminPassword: "${hashPassword('showcase-only-1', { N: 1024 })}"\n` });
  await page.goto(`${locked.url}login`);
  await page.click('#forgot');
  await page.click('#reset-ask');
  await page.waitForSelector('#reset [role=status]:not(:empty)');
  await shot(page, 'login-reset', 1000, 'form#reset', true);
  locked.close();

  // a dashboard without an admin password: the settings page asks for the setup code first
  const bare = await emptyDashboard({ 'settings.yaml': 'title: Homelab\n' });
  await page.goto(`${bare.url}settings`);
  await page.waitForSelector('#setup-code');
  await shot(page, 'settings-setup-code', 1000, '#panel form');
  bare.close();
  await ctx.close();
}

// dash.lan is this machine: the setup wizard is opened by a name, which it fills in as an allowed host
const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP dash.lan 127.0.0.1'] });
for (const scheme of !only || only === 'dashboard' ? ['dark', 'light'] : []) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: scheme, locale: 'en-US', timezoneId: 'Europe/Amsterdam' });
  await ctx.addInitScript(() => {
    const fixed = new Date('2026-10-23T09:41:00+02:00').getTime();
    const RealDate = Date;
    globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
  });
  const page = await ctx.newPage();
  // the live-reload stream stays open and the page would never be idle; a screenshot needs no reload
  await page.route('**/api/events', (route) => route.abort());
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
if (!only || only === 'settings') {
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
    if (open) await page.evaluate((sel) => { const d = document.querySelector(sel); if (d) { d.open = true; d.dispatchEvent(new Event('toggle')); } }, open);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // icon previews
    await page.screenshot({ path: `${out}settings-${section === 'layout' ? 'groups' : section}.png` });
  }
  await ctx.close();
}
if (!only || only === 'setup') await setupShots();
await browser.close();
app.close();
server.close();
await mock.close();
fs.rmSync(configDir, { recursive: true, force: true });
console.log('written to', out);

