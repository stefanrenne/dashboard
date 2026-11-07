// The settings page (public/settings.html + settings.js) in jsdom, with fetch stubbed.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { checkLanguages, withCommon } from './helpers.mjs';

const HTML = withCommon(fs.readFileSync(path.resolve('public/settings.html'), 'utf8')).replace('<script src="settings.js"></script>', '');
const SCRIPT = fs.readFileSync(path.resolve('public/settings.js'), 'utf8');
const VALUES = {
  title: 'Lab', language: 'nl', theme: 'dark', color: 'slate', showTitle: true, headerStyle: 'boxed', target: '_blank', statusStyle: '',
  allowedHosts: ['dash.lan'], login: false, loginRemember: '7d', actionsRemember: '15m', hideVersion: false, disableUpdateCheck: false, disableIndexing: false,
  description: '', favicon: '', startUrl: '', base: '', instanceName: '', cardStyle: '', blockStyle: '', font: '', iconStyle: 'gradient', bookmarksStyle: '', cardBlur: '',
  backgroundImage: '', backgroundBlur: '', backgroundSaturate: '', backgroundBrightness: '', backgroundOpacity: '',
  fullWidth: false, maxGroupColumns: '', maxBookmarkGroupColumns: '', useEqualHeights: false, disableCollapse: false, groupsInitiallyCollapsed: false, showStats: false,
  qlSearchDescriptions: false, qlProvider: '', qlUrl: '', qlSuggestionUrl: '', qlTarget: '', qlShowSearchSuggestions: '', qlHideInternetSearch: false, qlHideVisitURL: false, qlMobileButtonPosition: '',
  pwaIcons: [], pwaShortcuts: [], pluginUpdateInterval: '1h', discoveryInterval: '30s', logpath: '',
};

const opened = new Set();
afterEach(() => {
  for (const w of opened) w.close();
  opened.clear();
});

async function page(answers, setup = () => {}, url = 'http://dash.lan/settings') {
  const calls = [];
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    url,
    beforeParse(window) {
      window.scrollTo = () => {};
      setup(window);
      window.fetch = async (url, init = {}) => {
        const p = new URL(url, 'http://dash.lan/').pathname;
        calls.push({ p, init, body: init.body ? JSON.parse(init.body) : undefined });
        const a = answers[`${init.method ?? 'GET'} ${p}`];
        return { json: async () => structuredClone(typeof a === 'function' ? a(init, new URL(url, 'http://dash.lan/')) : a) };
      };
    },
  });
  opened.add(dom.window);
  dom.window.eval(SCRIPT);
  await new Promise((r) => setTimeout(r, 20));
  return { w: dom.window, doc: dom.window.document, calls };
}
const tick = () => new Promise((r) => setTimeout(r, 20));
const data = (extra = {}) => ({ ok: true, schema: { minPassword: 8 }, values: VALUES, other: ['layout', 'plugins'], hasPassword: true, noPassword: false, ...extra });

test('settings page: every language complete, the palettes the page\'s own', async () => {
  const { w } = await page({ 'GET /api/settings': data() });
  const { I18N } = w.HD_SETTINGS;
  checkLanguages(assert, I18N);
});

test('settings page: asks for the admin password, then shows settings.yaml and saves what changed', async () => {
  let unlocked = false;
  const { doc, w, calls } = await page({
    'GET /api/settings': () => (unlocked ? data() : { ok: false, needsPassword: true }),
    'POST /api/settings/unlock': (init) => { unlocked = init.headers['x-dashboard-password'] === 'Geheim-Admin-1'; return unlocked ? { ok: true } : { ok: false, wrongPassword: true }; },
    'POST /api/settings': (init) => data({ values: { ...VALUES, ...JSON.parse(init.body).values } }),
    'POST /api/settings/password': (init) => (JSON.parse(init.body).current === 'Geheim-Admin-1' ? data() : { ok: false, wrongPassword: true }),
  });
  assert.equal(doc.getElementById('admin-password').getAttribute('autocomplete'), 'current-password');
  doc.getElementById('admin-password').value = 'nope';
  doc.querySelector('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await tick();
  assert.equal(doc.querySelector('[role=alert]').textContent, 'Wrong password', 'in English until the settings are known');
  doc.getElementById('admin-password').value = 'Geheim-Admin-1';
  doc.querySelector('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await tick();
  // the form, in settings.yaml's language
  assert.equal(doc.getElementById('heading').textContent, 'Instellingen');
  assert.equal(doc.getElementById('title').value, 'Lab');
  assert.doesNotMatch(doc.body.textContent, /environment/);
  assert.match(doc.body.textContent, /Ook in settings\.yaml, blijven zoals ze zijn \(pas ze aan onder Geavanceerd\): layout, plugins/);
  doc.getElementById('title').value = 'Thuis';
  doc.getElementById('title').dispatchEvent(new w.Event('input'));
  // security: its own section, the same save
  w.location.hash = '#security';
  await tick();
  assert.equal(doc.getElementById('title'), null);
  assert.deepEqual([...doc.querySelectorAll('.hosts code')].map((c) => c.textContent), ['dash.lan']);
  // a host name added with the button (what people paste, cleaned up) and with Enter; one removed
  doc.getElementById('new-host').value = 'https://Dash.Example.com/home';
  doc.getElementById('new-host').dispatchEvent(new w.Event('input'));
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Toevoegen').click();
  doc.getElementById('new-host').value = 'dash.lan';
  doc.getElementById('new-host').dispatchEvent(new w.Event('input'));
  doc.getElementById('new-host').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
  doc.getElementById('new-host').value = 'other.lan';
  doc.getElementById('new-host').dispatchEvent(new w.Event('input'));
  doc.getElementById('new-host').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
  assert.deepEqual([...doc.querySelectorAll('.hosts code')].map((c) => c.textContent), ['dash.lan', 'dash.example.com', 'other.lan'], 'no duplicates');
  doc.querySelector('[aria-label="other.lan verwijderen"]').click();
  assert.equal(doc.getElementById('login-actions').checked, true);
  doc.getElementById('login-page').click();
  await tick();
  assert.ok(doc.getElementById('loginRemember'), 'the login\'s duration shows once it is on');
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Opslaan').click();
  await tick();
  const sent = calls.filter((c) => c.p === '/api/settings' && c.init.method === 'POST').at(-1).body.values;
  assert.deepEqual([sent.title, sent.login, sent.allowedHosts], ['Thuis', true, ['dash.lan', 'dash.example.com']]);
  assert.equal(doc.querySelector('.saved [role=status]').textContent, 'Opgeslagen.');
  // the admin password: the current one first
  doc.getElementById('pw-current').value = 'nope';
  doc.getElementById('pw-current').dispatchEvent(new w.Event('input'));
  for (const id of ['pw-next', 'pw-repeat']) { doc.getElementById(id).value = 'Ander-Wachtwoord-2'; doc.getElementById(id).dispatchEvent(new w.Event('input')); }
  doc.getElementById('pw-next').closest('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await tick();
  assert.equal(doc.querySelector('[role=alert]').textContent, 'Het huidige wachtwoord klopt niet.');
});

test('settings page: no admin password yet, setting one comes first', async () => {
  const { doc } = await page({ 'GET /api/settings': data({ noPassword: true, hasPassword: false }) });
  assert.equal(doc.getElementById('pw-current'), null, 'no current password to ask');
  assert.ok(doc.getElementById('pw-next'));
  assert.equal(doc.getElementById('title'), null, 'nothing else before it');
});

test('settings page: passkeys over https (add, list, remove), a notice over http, and a passkey opens the settings', async () => {
  const http = await page({ 'GET /api/settings': data({ passkeys: { secure: false, host: null, list: [] } }) }, () => {}, 'http://dash.lan/settings#security');
  assert.match(http.doc.getElementById('panel').textContent, /Passkeys werken als het dashboard via https wordt geopend/);
  assert.equal(http.doc.querySelector('.item.passkey'), null);

  const buf = (bytes) => new Uint8Array(bytes).buffer;
  const created = [];
  const webauthn = (w) => {
    Object.defineProperty(w, 'isSecureContext', { value: true, configurable: true });
    w.PublicKeyCredential = function PublicKeyCredential() {};
    Object.defineProperty(w.navigator, 'credentials', { configurable: true, value: {
      create: async (o) => { created.push(o); return { id: 'cred-1', response: { clientDataJSON: buf([1]), getAuthenticatorData: () => buf([2]), getPublicKey: () => buf([3]), getPublicKeyAlgorithm: () => -7 } }; },
      get: async () => ({ id: 'cred-1', response: { clientDataJSON: buf([1]), authenticatorData: buf([2]), signature: buf([3]) } }),
    } });
  };
  const list = [];
  const pk = () => ({ secure: true, host: 'dash.lan', list: structuredClone(list) });
  const { doc, calls } = await page({
    'GET /api/settings': () => data({ passkeys: pk() }),
    'POST /api/settings/passkeys/options': { ok: true, publicKey: { challenge: 'AAEC', rp: { id: 'dash.lan', name: 'Lab' }, user: { id: 'BAUG', name: 'admin', displayName: 'Lab (admin)' }, pubKeyCredParams: [], excludeCredentials: [{ type: 'public-key', id: 'BwgJ' }] } },
    'POST /api/settings/passkeys': (init) => { list.push({ id: 'cred-1', name: JSON.parse(init.body).name, created: '2026-11-06T10:00:00Z', lastUsed: null }); return data({ passkeys: pk() }); },
    'POST /api/settings/passkeys/remove': () => { list.length = 0; return data({ passkeys: pk() }); },
  }, webauthn, 'http://dash.lan/settings#security');
  assert.match(doc.getElementById('panel').textContent, /Nog geen passkeys voor dash\.lan/);
  doc.getElementById('passkey-name').value = 'MacBook';
  doc.getElementById('passkey-name').dispatchEvent(new doc.defaultView.Event('input'));
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Passkey toevoegen').click();
  await tick();
  assert.deepEqual([...new Uint8Array(created[0].publicKey.user.id)], [4, 5, 6], 'the user id as bytes');
  assert.deepEqual(calls.find((c) => c.p === '/api/settings/passkeys').body, { id: 'cred-1', clientDataJSON: 'AQ', authenticatorData: 'Ag', publicKey: 'Aw', alg: -7, name: 'MacBook' });
  assert.match(doc.querySelector('.item.passkey').textContent, /MacBook/);
  assert.match(doc.getElementById('panel').textContent, /De passkey is toegevoegd\./);
  [...doc.querySelectorAll('.item.passkey button')][0].click();
  await tick();
  assert.equal(doc.querySelector('.item.passkey'), null);

  // locked: the passkey is asked at once and opens the settings with its one-time token
  let unlocked = false;
  const door = await page({
    'GET /api/settings': () => (unlocked ? data() : { ok: false, needsPassword: true }),
    'GET /api/passkey': { available: true },
    'POST /api/passkey/options': { available: true, publicKey: { challenge: 'AAEC', rpId: 'dash.lan', allowCredentials: [] } },
    'POST /api/passkey/verify': { ok: true, token: 'one-time' },
    'POST /api/settings/unlock': (init) => { unlocked = init.headers['x-dashboard-passkey'] === 'one-time'; return { ok: unlocked }; },
  }, webauthn);
  // asked at once, without a press
  await tick();
  await tick();
  assert.equal(unlocked, true);
  assert.ok(door.doc.querySelector('.panel h2'), 'the settings show');
});

test('settings page: sections by the URL, and a config file as text: save, problems, conflict, an earlier version', async () => {
  const FILES = [
    { file: 'settings.yaml', root: 'settings.yaml', from: null, at: '', exists: true },
    { file: 'services.yaml', root: 'services.yaml', from: null, at: '', exists: true },
    { file: 'media.yaml', root: 'services.yaml', from: 'services.yaml', at: '[0].Media', exists: true },
  ];
  let text = '- Media: !include media.yaml\n- Apps:\n    - App:\n        widget: { type: x, key: __SECRET_0123456789__ }\n';
  let hash = 'h1';
  let next = 'ok';
  const { doc, w, calls } = await page({
    'GET /api/settings': data(),
    'GET /api/settings/files': { ok: true, files: FILES },
    'GET /api/settings/services': { ok: true, hash: 'h1', items: [], discovered: [] },
    'GET /api/settings/files/services.yaml': () => ({ ok: true, file: 'services.yaml', exists: true, hash, text, history: [{ id: 'services.yaml.2026-11-06T10-00-00-000Z', time: '2026-11-06T10:00:00.000Z', size: 10 }] }),
    'GET /api/settings/files/settings.yaml': { ok: true, file: 'settings.yaml', exists: true, hash: 's1', text: 'title: Lab\n', history: [] },
    'GET /api/settings/files/media.yaml': { ok: true, file: 'media.yaml', exists: true, hash: 'm1', text: '- Plex: {}\n', history: [] },
    'GET /api/settings/files/services.yaml/history/services.yaml.2026-11-06T10-00-00-000Z': { ok: true, text: '# the old one\n' },
    'POST /api/settings/files/services.yaml': (init) => {
      const body = JSON.parse(init.body);
      if (next === 'problem') return { ok: false, error: 'services.yaml › [1]: expected a map', errors: [{ file: 'services.yaml', path: '[1]', message: 'expected a map' }] };
      text = body.text;
      hash = 'h2';
      return { ok: true, changed: true, hash, warnings: [{ file: 'services.yaml', path: '[1].Apps[0].App.widget.key', message: 'a secret written into the file itself' }] };
    },
  });
  const links = [...doc.querySelectorAll('nav.sections a')];
  assert.deepEqual(links.map((a) => a.textContent), ['Algemeen', 'Beveiliging', 'Groepen', 'Widgets', 'Services', 'Kopwidgets', 'Bladwijzers', 'Docker', 'Kubernetes', 'Proxmox', 'Geavanceerd']);
  assert.equal(links[0].getAttribute('aria-current'), 'page');
  w.location.hash = '#services';
  await tick();
  assert.equal(doc.querySelector('nav.sections [aria-current=page]').textContent, 'Services');
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Als tekst bewerken').click();
  await tick();
  await tick();
  assert.equal(doc.getElementById('title'), null, 'the general form is in its own section');
  const area = doc.getElementById('file-text');
  assert.equal(area.value, text);
  assert.match(doc.getElementById('panel').textContent, /Waarden als __SECRET_…__ zijn verborgen/);
  assert.deepEqual([...doc.querySelectorAll('#file-choose option')].map((o) => o.textContent), ['services.yaml', 'media.yaml (ingevoegd vanuit services.yaml)']);
  // a save sends the text with the hash it was read with; remarks are shown
  area.value = `${text}- Infra: []\n`;
  area.dispatchEvent(new w.Event('input'));
  const save = () => [...doc.querySelectorAll('.saved button')].find((b) => b.textContent === 'Opslaan').click();
  save();
  await tick();
  const sent = calls.filter((c) => c.p === '/api/settings/files/services.yaml' && c.init.method === 'POST').at(-1).body;
  assert.deepEqual(sent, { text: `${text.replace('- Infra: []\n', '')}- Infra: []\n`, hash: 'h1' });
  assert.equal(doc.querySelector('.saved [role=status]').textContent, 'Opgeslagen.');
  assert.match(doc.querySelector('.warn').textContent, /\[1\]\.Apps\[0\]\.App\.widget\.key: a secret written/);
  // a problem: shown with its path, the text stays in the editor
  next = 'problem';
  doc.getElementById('file-text').value = 'broken';
  doc.getElementById('file-text').dispatchEvent(new w.Event('input'));
  save();
  await tick();
  assert.match(doc.querySelector('[role=alert]').textContent, /Niet opgeslagen: los dit eerst op\.services\.yaml › \[1\]: expected a map/);
  assert.equal(doc.getElementById('file-text').value, 'broken');
  // undo, then an earlier version into the editor
  [...doc.querySelectorAll('.saved button')].find((b) => b.textContent === 'Wijzigingen ongedaan maken').click();
  assert.equal(doc.getElementById('file-text').value, text);
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'In de editor laden').click();
  await tick();
  assert.equal(doc.getElementById('file-text').value, '# the old one\n');
  // the included file: chosen from the list, with where it is included
  doc.getElementById('file-choose').value = 'media.yaml';
  doc.getElementById('file-choose').dispatchEvent(new w.Event('change'));
  await tick();
  assert.equal(doc.getElementById('file-text').value, '- Plex: {}\n');
  assert.match(doc.getElementById('panel').textContent, /Ingevoegd vanuit services\.yaml bij \[0\]\.Media/);
  // Advanced: settings.yaml as a file
  w.location.hash = '#advanced';
  await tick();
  assert.equal(doc.querySelector('#panel h2').textContent, 'settings.yaml');
});

test('settings page: the other settings.yaml keys as fields: background, layout, quick launch, app icons and shortcuts', async () => {
  const { doc, w, calls } = await page({
    'GET /api/settings': data(),
    'POST /api/settings': (init) => data({ values: { ...VALUES, ...JSON.parse(init.body).values } }),
  });
  const set = (id, value, event = 'input') => { const node = doc.getElementById(id); node.value = value; node.dispatchEvent(new w.Event(event)); };
  assert.equal(doc.getElementById('backgroundBlur'), null, 'the image first');
  set('backgroundImage', 'https://example.com/wall.jpg');
  doc.getElementById('backgroundImage').dispatchEvent(new w.Event('change'));
  set('cardBlur', 'md', 'change');
  await tick();
  assert.ok(doc.getElementById('backgroundBlur'), 'its settings once there is an image');
  set('backgroundOpacity', '60');
  set('maxGroupColumns', '6');
  doc.getElementById('fullWidth').click();
  assert.equal(doc.getElementById('qlUrl'), null);
  set('qlProvider', 'custom', 'change');
  await tick();
  set('qlUrl', 'https://search.lan/?q={q}');
  assert.match(doc.getElementById('panel').textContent, /waar \{q\} staat/);
  // a row added and filled, another added and removed
  const add = (legend) => [...doc.querySelectorAll('fieldset')].find((f) => f.querySelector('legend').textContent === legend).querySelector('.row:last-child button').click();
  add('App-snelkoppelingen');
  set('pwaShortcuts-0-name', 'Media');
  set('pwaShortcuts-0-url', '/#media');
  add('App-snelkoppelingen');
  doc.querySelector('[aria-label="Rij 2 verwijderen"]').click();
  assert.equal(doc.getElementById('pwaShortcuts-1-name'), null);
  set('discoveryInterval', '1m');
  [...doc.querySelectorAll('.saved button')].find((b) => b.textContent === 'Opslaan').click();
  await tick();
  const sent = calls.filter((c) => c.p === '/api/settings' && c.init.method === 'POST').at(-1).body.values;
  assert.deepEqual(
    [sent.backgroundImage, sent.cardBlur, sent.backgroundOpacity, sent.maxGroupColumns, sent.fullWidth, sent.qlProvider, sent.qlUrl, sent.pwaShortcuts, sent.discoveryInterval],
    ['https://example.com/wall.jpg', 'md', '60', '6', true, 'custom', 'https://search.lan/?q={q}', [{ name: 'Media', url: '/#media', description: '' }], '1m'],
  );
});

test('settings page: the groups: settings per group and nested group, the order by buttons, a gone group removed', async () => {
  const groups = [
    { name: 'Infra', kind: 'services', inFile: true, style: 'row', columns: '', header: true, initiallyCollapsed: '', useEqualHeights: '', iconsOnly: '', icon: '', tab: '',
      nested: [{ name: 'Network', style: '', columns: '2', header: true, initiallyCollapsed: '', useEqualHeights: '', iconsOnly: '', icon: '' }] },
    { name: 'Gone', kind: null, inFile: true, style: '', columns: '3', header: true, initiallyCollapsed: '', useEqualHeights: '', iconsOnly: '', icon: '', tab: '', nested: [] },
    { name: 'Developer', kind: 'bookmarks', inFile: false, style: '', columns: '', header: true, initiallyCollapsed: '', useEqualHeights: '', iconsOnly: '', icon: '', tab: '', nested: [] },
  ];
  const { doc, w, calls } = await page({
    'GET /api/settings': data({ layout: { form: 'map', groups } }),
    'POST /api/settings/layout': (init) => data({ layout: { form: 'map', groups: JSON.parse(init.body).groups.filter((g) => !g.remove) } }),
  }, () => {}, 'http://dash.lan/settings#layout');
  const cards = () => [...doc.querySelectorAll('.card')].map((c) => c.querySelector('strong').textContent);
  assert.deepEqual(cards(), ['Infra', 'Gone', 'Developer']);
  assert.match(doc.querySelectorAll('.card')[1].textContent, /Deze groep bestaat niet meer/);
  assert.equal(doc.getElementById('lg-2-style'), null, 'a bookmark group has no arrangement');
  assert.ok(doc.getElementById('lg-2-iconsOnly'));
  // settings, also of the nested group
  const set = (id, value, event) => { const n = doc.getElementById(id); n.value = value; n.dispatchEvent(new w.Event(event)); };
  set('lg-0-columns', '4', 'input');
  set('lg-0-tab', 'Home', 'input');
  set('lg-0-0-initiallyCollapsed', 'true', 'change');
  doc.getElementById('lg-2-header').click();
  set('lg-2-iconsOnly', 'true', 'change');
  doc.getElementById('lg-1-remove').click();
  // Developer up twice, with the keyboard focus following it
  doc.querySelector('[aria-label="Developer omhoog"]').click();
  doc.querySelector('[aria-label="Developer omhoog"]').click();
  assert.deepEqual(cards(), ['Developer', 'Infra', 'Gone']);
  assert.equal(doc.activeElement.getAttribute('aria-label'), 'Developer omlaag', 'at the top the focus goes to the other button');
  assert.equal(doc.getElementById('lg-0-up').disabled, true);
  [...doc.querySelectorAll('.saved button')].find((b) => b.textContent === 'Opslaan').click();
  await tick();
  const sent = calls.filter((c) => c.p === '/api/settings/layout').at(-1).body.groups;
  assert.deepEqual(sent.map((g) => [g.name, g.remove ?? false]), [['Developer', false], ['Infra', false], ['Gone', true]]);
  assert.deepEqual([sent[0].header, sent[0].iconsOnly, sent[1].columns, sent[1].tab, sent[1].nested[0].initiallyCollapsed], [false, 'true', '4', 'Home', 'true']);
  assert.deepEqual(cards(), ['Developer', 'Infra'], 'the answer shows the saved layout');
  assert.equal(doc.querySelector('.saved [role=status]').textContent, 'Opgeslagen.');
});

test('settings page: widget packages: the defaults, entries edited, added, reordered and removed; install again', async () => {
  const plugins = (entries) => ({
    entries,
    defaults: [{ source: 'git+https://github.com/stefanrenne/dashboard-widgets#latest', replaced: false, pin: { tag: 'v0.20.0', commit: 'abc', version: null } }],
    packages: [{ name: 'widgets', version: 'v0.20.0', url: 'https://github.com/stefanrenne/dashboard-widgets/releases/tag/v0.20.0' }],
    errors: [{ source: 'git+https://github.com/someone/broken#v1', message: 'cannot clone' }], warnings: [],
  });
  const entries = [
    { index: 0, kind: 'git', value: 'https://github.com/someone/pihole#v1.2.0', subdir: '', only: '', pin: { tag: 'v1.2.0', commit: 'abc', version: null }, error: null },
    { index: 1, kind: 'path', value: './my-widgets/garage', subdir: '', only: '', pin: null, error: null },
  ];
  let synced = '';
  const { doc, w, calls } = await page({
    'GET /api/settings': () => data({ plugins: plugins(entries) }),
    'POST /api/settings/plugins': (init) => data({ plugins: plugins(JSON.parse(init.body).entries.map((e, i) => ({ ...e, index: i, pin: null, error: null }))) }),
    'POST /api/plugins/sync': (init) => { synced = init; return { errors: [], warnings: [] }; },
  }, () => {}, 'http://dash.lan/settings#plugins');
  const text = doc.getElementById('panel').textContent;
  assert.match(text, /Altijd geïnstalleerd: git\+https:\/\/github\.com\/stefanrenne\/dashboard-widgets#latest · Vastgezet op v0\.20\.0/);
  assert.match(text, /Vastgezet op v1\.2\.0/);
  assert.match(text, /cannot clone/);
  const set = (id, value, event) => { const n = doc.getElementById(id); n.value = value; n.dispatchEvent(new w.Event(event)); };
  set('pl-0-value', 'https://github.com/someone/pihole#v1.3.0', 'input');
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Een widgetpakket toevoegen').click();
  assert.equal(doc.activeElement.id, 'pl-2-value');
  set('pl-2-kind', 'npm', 'change');
  assert.equal(doc.getElementById('pl-2-value').getAttribute('placeholder'), 'dashboard-widget-x@1.0.0');
  set('pl-2-value', 'dashboard-widget-adguard@2.0.1', 'input');
  set('pl-2-only', 'adguard', 'input');
  doc.querySelector('[aria-label="./my-widgets/garage verwijderen"]').click();
  doc.querySelector('[aria-label="dashboard-widget-adguard@2.0.1 omhoog"]').click();
  [...doc.querySelectorAll('.saved button')].find((b) => b.textContent === 'Opslaan').click();
  await tick();
  const sent = calls.filter((c) => c.p === '/api/settings/plugins').at(-1).body.entries;
  assert.deepEqual(sent, [
    { kind: 'npm', value: 'dashboard-widget-adguard@2.0.1', subdir: '', only: 'adguard', index: null },
    { kind: 'git', value: 'https://github.com/someone/pihole#v1.3.0', subdir: '', only: '', index: 0 },
  ]);
  assert.equal(doc.querySelector('.saved [role=status]').textContent, 'Opgeslagen.');
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Bijwerken naar de nieuwste').click();
  await tick();
  assert.equal(calls.some((c) => c.p === '/api/plugins/sync' && c.init.method === 'POST'), true);
  assert.equal(synced.headers['x-requested-with'], 'dashboard');
  assert.equal(doc.querySelector('.saved [role=status]').textContent, 'Klaar.');
});

test('settings page: services as a form: fields, rename, move to another group, add, remove; includes as blocks; discovered shown', async () => {
  const fields = (extra = {}) => ({ href: '', icon: '', description: '', siteMonitor: '', ping: '', container: '', server: '', target: '', statusStyle: '', showStats: '', weight: '', filter: '', confirm: '', proxmoxNode: '', proxmoxVMID: '', proxmoxType: '', app: '', namespace: '', podSelector: '', external: false, ...extra });
  const items = [
    { kind: 'group', id: '0', name: 'Infra', items: [
      { kind: 'service', id: '0/0', name: 'Router', fields: fields({ href: 'http://router.lan', ping: 'router.lan' }), widgets: [{ id: 'widget', type: 'custom-api', options: { url: 'http://router.lan/api', key: '__SECRET_0123456789__' }, rest: ['mappings'] }], other: [] },
      { kind: 'group', id: '0/1', name: 'Network', items: [] },
    ] },
    { kind: 'group', id: '1', name: 'Media', include: 'media.yaml', items: [] },
    { kind: 'group', id: '2', name: 'Apps', items: [{ kind: 'include', id: '2/0', file: 'apps.yaml' }] },
  ];
  const { doc, w, calls } = await page({
    'GET /api/settings': data(),
    'GET /api/settings/services': { ok: true, hash: 'h1', items, discovered: [{ group: 'Media', name: 'Jellyfin', origin: 'docker:local' }],
      widgets: [{ id: 'custom-api', name: 'Custom API', options: { url: { type: 'url', required: true }, key: { type: 'string', secret: true }, live: { type: 'boolean' } } }, { id: 'ping', name: 'Ping', options: { host: { type: 'string' } } }] },
    'POST /api/settings/widget-test': (init) => (JSON.parse(init.body).options.url ? { ok: true, blocks: [{ label: 'Up', value: 'yes' }] } : { ok: false, error: 'url: required' }),
    'POST /api/settings/services': (init) => ({ ok: true, hash: 'h2', items: JSON.parse(init.body).items, discovered: [] }),
  }, () => {}, 'http://dash.lan/settings#services');
  await tick();
  const panel = () => doc.getElementById('panel').textContent;
  assert.match(panel(), /De services van deze groep staan in media\.yaml/);
  assert.match(panel(), /Ingevoegd uit apps\.yaml/);
  assert.match(panel(), /Media › Jellyfin \(docker:local\)/);
  assert.match(panel(), /Ook: mappings \(bewerk ze als tekst\)/);
  assert.match(panel(), /Verborgen; typ om te vervangen/);
  const router = doc.querySelector('.card');
  const id = router.querySelector('input[id$="-name"]').id.replace('-name', '');
  const set = (sid, value, event = 'input') => { const n = doc.getElementById(sid); n.value = value; n.dispatchEvent(new w.Event(event)); };
  set(`${id}-name`, 'Gateway');
  set(`${id}-ping`, '');
  set(`${id}-showStats`, 'true', 'change');
  // its widget: an option changed and tested; a second widget added
  const wid = doc.querySelector(`[id^="${id}-w"][id$="-url"]`).id.replace('-url', '');
  assert.equal(doc.getElementById(`${wid}-key`).type, 'password');
  set(`${wid}-url`, 'http://router.lan/v2');
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Testen').click();
  await tick();
  assert.match(panel(), /Het antwoordt: Up: yes/);
  assert.equal(calls.filter((c) => c.p === '/api/settings/widget-test').at(-1).body.file, 'services.yaml');
  set(`${id}-add`, 'ping', 'change');
  set(doc.activeElement.id.replace('-type', '-host'), 'router.lan');
  // into the nested group Network
  const move = doc.getElementById(`${id}-move`);
  assert.deepEqual([...move.options].map((o) => o.textContent), ['Infra', 'Infra › Network', 'Apps']);
  set(`${id}-move`, '1', 'change');
  // a new service in Apps, named; the include block moved down below it
  const apps = [...doc.querySelectorAll('section.panel')].find((s) => s.querySelector('input').value === 'Apps');
  [...apps.querySelectorAll('button')].find((b) => b.textContent === 'Een service toevoegen').click();
  const fresh = doc.activeElement;
  assert.equal(fresh.value, 'Nieuwe service');
  set(fresh.id, 'Wiki');
  set(fresh.id.replace('-name', '-href'), 'http://wiki.lan');
  doc.querySelector('[aria-label="apps.yaml omlaag"]').click();
  // a group added and removed again
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Een groep toevoegen').click();
  doc.querySelector('[aria-label="Nieuwe groep verwijderen"]').click();
  [...doc.querySelectorAll('.saved button')].find((b) => b.textContent === 'Opslaan').click();
  await tick();
  const sent = calls.filter((c) => c.p === '/api/settings/services' && c.init.method === 'POST').at(-1).body;
  assert.equal(sent.hash, 'h1');
  assert.deepEqual(sent.items.map((g) => [g.name, g.items.map((x) => x.name ?? x.file ?? x.id)]), [['Infra', ['Network']], ['Media', []], ['Apps', ['Wiki', '2/0']]]);
  const gateway = sent.items[0].items[0].items[0];
  assert.deepEqual([gateway.id, gateway.name, gateway.fields.ping, gateway.fields.showStats, gateway.fields.href], ['0/0', 'Gateway', '', 'true', 'http://router.lan']);
  assert.deepEqual(gateway.widgets, [{ id: 'widget', type: 'custom-api', options: { url: 'http://router.lan/v2', key: '__SECRET_0123456789__' } }, { id: null, type: 'ping', options: { host: 'router.lan' } }]);
  assert.equal(sent.items[2].items[0].id, null);
  assert.equal(doc.querySelector('.saved [role=status]').textContent, 'Opgeslagen.');
});

test('settings page: header widgets as a form: changed, added, reordered, saved', async () => {
  const catalog = [{ id: 'datetime', name: 'Date and time', options: { format: { type: 'enum', values: ['short', 'long'] } } }, { id: 'search', name: 'Search', options: { provider: { type: 'string' } } }];
  const { doc, w, calls } = await page({
    'GET /api/settings': data(),
    'GET /api/settings/header': { ok: true, hash: 'h1', widgets: [{ id: '0', type: 'datetime', options: { format: 'short' }, rest: [] }], catalog },
    'POST /api/settings/header': (init) => ({ ok: true, hash: 'h2', widgets: JSON.parse(init.body).widgets.map((x, i) => ({ ...x, id: String(i), rest: [] })), catalog }),
  }, () => {}, 'http://dash.lan/settings#header');
  await tick();
  const set = (id, value, event) => { const n = doc.getElementById(id); n.value = value; n.dispatchEvent(new w.Event(event)); };
  const format = doc.querySelector('[id$="-format"]');
  assert.equal(format.value, 'short');
  set(format.id, 'long', 'change');
  set('h-add', 'search', 'change');
  set(doc.activeElement.id.replace('-type', '-provider'), 'duckduckgo', 'input');
  doc.querySelector('[aria-label="search omhoog"]').click();
  [...doc.querySelectorAll('.saved button')].find((b) => b.textContent === 'Opslaan').click();
  await tick();
  const sent = calls.filter((c) => c.p === '/api/settings/header' && c.init.method === 'POST').at(-1).body;
  assert.deepEqual(sent, { hash: 'h1', widgets: [{ id: null, type: 'search', options: { provider: 'duckduckgo' } }, { id: '0', type: 'datetime', options: { format: 'long' } }] });
  assert.equal(doc.querySelector('.saved [role=status]').textContent, 'Opgeslagen.');
});

test('settings page: bookmarks as a form: fields, move to another group, add, remove', async () => {
  const fields = (extra) => ({ href: '', abbr: '', icon: '', description: '', ...extra });
  const items = [
    { kind: 'group', id: '0', name: 'Developer', items: [{ kind: 'bookmark', id: '0/0', name: 'GitHub', fields: fields({ href: 'https://github.com', abbr: 'GH' }), other: [] }] },
    { kind: 'group', id: '1', name: 'Docs', items: [] },
    { kind: 'group', id: '2', name: 'Shared', include: 'shared.yaml', items: [] },
  ];
  const { doc, w, calls } = await page({
    'GET /api/settings': data(),
    'GET /api/settings/bookmarks': { ok: true, hash: 'h1', items },
    'POST /api/settings/bookmarks': (init) => ({ ok: true, hash: 'h2', items: JSON.parse(init.body).items }),
  }, () => {}, 'http://dash.lan/settings#bookmarks');
  await tick();
  assert.match(doc.getElementById('panel').textContent, /De bladwijzers van deze groep staan in shared\.yaml/);
  const set = (id, value, event = 'input') => { const n = doc.getElementById(id); n.value = value; n.dispatchEvent(new w.Event(event)); };
  const id = doc.querySelector('.card input[id$="-name"]').id.replace('-name', '');
  set(`${id}-description`, 'The code');
  set(`${id}-move`, '1', 'change');
  const dev = [...doc.querySelectorAll('section.panel')].find((s) => s.querySelector('input').value === 'Developer');
  [...dev.querySelectorAll('button')].find((b) => b.textContent === 'Een bladwijzer toevoegen').click();
  set(doc.activeElement.id, 'Hub');
  set(doc.activeElement.id.replace('-name', '-href'), 'https://hub.docker.com');
  [...doc.querySelectorAll('.saved button')].find((b) => b.textContent === 'Opslaan').click();
  await tick();
  const sent = calls.filter((c) => c.p === '/api/settings/bookmarks' && c.init.method === 'POST').at(-1).body;
  assert.deepEqual(sent.items.map((g) => [g.name, g.items.map((b) => [b.id, b.name, b.fields.href, b.fields.description])]), [
    ['Developer', [[null, 'Hub', 'https://hub.docker.com', '']]],
    ['Docs', [['0/0', 'GitHub', 'https://github.com', 'The code']]],
    ['Shared', []],
  ]);
  assert.equal(doc.querySelector('.saved [role=status]').textContent, 'Opgeslagen.');
});

test('settings page: Docker, Proxmox and Kubernetes as forms', async () => {
  const docker = { ok: true, hash: 'd1', flat: false, entries: [{ id: 'nas', name: 'nas', fields: { socket: '', host: '192.168.1.20', port: '2375', protocol: '', caFile: '', certFile: '', keyFile: '', discover: false, swarm: false }, other: ['allowVariables'] }] };
  const { doc, w, calls } = await page({
    'GET /api/settings': data(),
    'GET /api/settings/servers/docker.yaml': docker,
    'POST /api/settings/servers/docker.yaml': (init) => ({ ...docker, hash: 'd2', entries: JSON.parse(init.body).entries.map((e) => ({ ...e, id: e.name, other: [] })) }),
    'POST /api/settings/docker-test': { name: 'nas', ok: true, version: '27.0', containers: 12 },
    'GET /api/settings/servers/proxmox.yaml': { ok: true, hash: 'p1', flat: false, entries: [{ id: 'pve', name: 'pve', fields: { url: 'https://pve.lan', token: 't', secret: '__SECRET_0123456789__', insecure: false }, other: [] }] },
    'GET /api/settings/servers/kubernetes.yaml': { ok: true, hash: 'k1', fields: { mode: 'disabled', kubeconfig: '', context: '', ingress: '', traefik: '', gateway: '' }, other: [] },
    'POST /api/settings/servers/kubernetes.yaml': (init) => ({ ok: true, hash: 'k2', fields: JSON.parse(init.body).fields, other: [] }),
  }, () => {}, 'http://dash.lan/settings#docker');
  await tick();
  const panel = () => doc.getElementById('panel').textContent;
  assert.match(panel(), /Ook in het bestand: allowVariables/);
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'De verbinding testen').click();
  await tick();
  assert.match(panel(), /Docker 27\.0, 12 containers/);
  const set = (id, value, event = 'input') => { const n = doc.getElementById(id); n.value = value; n.dispatchEvent(new w.Event(event)); };
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Een server toevoegen').click();
  set(doc.activeElement.id, 'local');
  set(doc.activeElement.id.replace('-name', '-socket'), '/var/run/docker.sock');
  [...doc.querySelectorAll('.saved button')].find((b) => b.textContent === 'Opslaan').click();
  await tick();
  const sent = calls.filter((c) => c.p === '/api/settings/servers/docker.yaml' && c.init.method === 'POST').at(-1).body;
  assert.deepEqual(sent.entries.map((e) => [e.id, e.name, e.fields.socket || e.fields.host, e.fields.discover]), [['nas', 'nas', '192.168.1.20', false], [null, 'local', '/var/run/docker.sock', true]]);
  w.location.hash = '#proxmox';
  await tick();
  await tick();
  const secret = doc.querySelector('input[id$="-secret"]');
  assert.equal(secret.type, 'password');
  assert.match(panel(), /Verborgen; typ om te vervangen/);
  w.location.hash = '#kubernetes';
  await tick();
  await tick();
  set('kube-mode', 'cluster', 'change');
  set('kube-traefik', 'true', 'change');
  [...doc.querySelectorAll('.saved button')].find((b) => b.textContent === 'Opslaan').click();
  await tick();
  const kube = calls.filter((c) => c.p === '/api/settings/servers/kubernetes.yaml' && c.init.method === 'POST').at(-1).body;
  assert.deepEqual([kube.hash, kube.fields.mode, kube.fields.traefik], ['k1', 'cluster', 'true']);
});

test('settings page: Advanced imports homepage files after a check', async () => {
  const { doc, w, calls } = await page({
    'GET /api/settings': data(),
    'GET /api/settings/files': { ok: true, files: [{ file: 'settings.yaml', root: 'settings.yaml', from: null, at: '', exists: true }] },
    'GET /api/settings/files/settings.yaml': { ok: true, file: 'settings.yaml', exists: true, hash: 's1', text: 'title: Lab\n', history: [] },
    'POST /api/settings/import/check': { ok: true, files: ['services.yaml'], services: [{ name: 'Plex' }], bookmarks: 0, header: 0, errors: [], warnings: [], replaces: ['services.yaml'] },
    'POST /api/settings/import': { ok: true, files: ['services.yaml'] },
  }, () => {}, 'http://dash.lan/settings#advanced');
  await tick();
  await tick();
  const input = doc.getElementById('import-files');
  Object.defineProperty(input, 'files', { value: [{ name: 'services.yaml', text: async () => '- Media: []\n' }, { name: 'notes.txt', text: async () => 'x' }] });
  input.dispatchEvent(new w.Event('change'));
  await tick();
  assert.deepEqual(calls.filter((c) => c.p === '/api/settings/import/check').at(-1).body, { files: { 'services.yaml': '- Media: []\n' } });
  assert.match(doc.getElementById('panel').textContent, /services\.yaml: 1 services, 0 bladwijzers, 0 kopwidgets\.Vervangt services\.yaml\./);
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Importeren').click();
  await tick();
  assert.match(doc.getElementById('panel').textContent, /Geïmporteerd: services\.yaml\./);
  assert.ok([...doc.querySelectorAll('.saved button')].some((b) => b.textContent === 'Downloaden'));
});

test('settings page: connection tests for a Proxmox node and Kubernetes', async () => {
  const { doc, w, calls } = await page({
    'GET /api/settings': data(),
    'GET /api/settings/servers/proxmox.yaml': { ok: true, hash: 'p1', flat: false, entries: [{ id: 'pve', name: 'pve', fields: { url: 'https://pve.lan', token: 't', secret: '__SECRET_0123456789__', insecure: false }, other: [] }] },
    'POST /api/settings/proxmox-test': { ok: true, version: '8.2.4' },
    'GET /api/settings/servers/kubernetes.yaml': { ok: true, hash: 'k1', fields: { mode: 'cluster', kubeconfig: '', context: '', ingress: '', traefik: '', gateway: '' }, other: [] },
    'POST /api/settings/kubernetes-test': { ok: true, version: 'v1.30.2', services: 3 },
  }, () => {}, 'http://dash.lan/settings#proxmox');
  await tick();
  const test = () => [...doc.querySelectorAll('button')].find((b) => b.textContent === 'De verbinding testen').click();
  test();
  await tick();
  assert.match(doc.getElementById('panel').textContent, /Proxmox VE 8\.2\.4/);
  assert.deepEqual(calls.filter((c) => c.p === '/api/settings/proxmox-test').at(-1).body, { name: 'pve' });
  w.location.hash = '#kubernetes';
  await tick();
  await tick();
  test();
  await tick();
  assert.match(doc.getElementById('panel').textContent, /Kubernetes v1\.30\.2; discovery vindt 3 services/);
});

test('settings page: icon fields suggest the icons in use and show a preview', async () => {
  const fields = { href: '', icon: 'plex.svg', description: '', siteMonitor: '', ping: '', container: '', server: '', target: '', statusStyle: '', showStats: '', weight: '', filter: '', confirm: '', proxmoxNode: '', proxmoxVMID: '', proxmoxType: '', app: '', namespace: '', podSelector: '', external: false };
  const urls = { 'plex.svg': 'https://cdn.example.com/svg/plex.svg', 'mdi-server': 'https://cdn.example.com/mdi/server.svg#dash-mask' };
  const { doc, w } = await page({
    'GET /api/settings': data(),
    'GET /api/settings/icons': { ok: true, local: ['/icons/lab.png'], used: ['plex.svg'] },
    'GET /api/settings/icon': (init, u) => ({ ok: true, url: urls[u.searchParams.get('name')] ?? null }),
    'GET /api/settings/services': { ok: true, hash: 'h', items: [{ kind: 'group', id: '0', name: 'Media', items: [{ kind: 'service', id: '0/0', name: 'Plex', fields, widgets: [], other: [] }] }], discovered: [], widgets: [] },
  }, () => {}, 'http://dash.lan/settings#services');
  await tick();
  await tick();
  assert.deepEqual([...doc.querySelectorAll('#icon-list option')].map((o) => o.value), ['plex.svg', '/icons/lab.png']);
  const input = doc.querySelector('.icon-field input');
  assert.equal(input.getAttribute('list'), 'icon-list');
  assert.equal(doc.querySelector('.icon-preview img').getAttribute('src'), 'https://cdn.example.com/svg/plex.svg');
  input.value = 'mdi-server';
  input.dispatchEvent(new w.Event('input'));
  input.dispatchEvent(new w.Event('change'));
  await tick();
  assert.match(doc.querySelector('.icon-preview .mask').getAttribute('style'), /mask-image: url\("https:\/\/cdn\.example\.com\/mdi\/server\.svg"\)/);
  input.value = 'not a name!';
  input.dispatchEvent(new w.Event('change'));
  await tick();
  assert.equal(doc.querySelector('.icon-preview').textContent, '?');
});
