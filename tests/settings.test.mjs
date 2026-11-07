import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readSettings, checkSettings, writeSettings, writeAdminPassword } from '../src/settings/form.js';
import { loadConfig } from '../src/config/load.js';
import { tmpDir } from './helpers.mjs';

const SETTINGS = `# my settings
title: Lab   # the name
language: nl
color: emerald
layout:
  Media: { columns: 2 }   # keep me
plugins: []
providers:
  sonarr: abc
actions:
  remember: 30m
adminPassword: "scrypt:1:2:3:YQ==:Yg=="
`;

test("readSettings: the page's fields with their defaults, and the other keys it leaves alone", () => {
  const dir = tmpDir('dash-set-');
  fs.writeFileSync(path.join(dir, 'settings.yaml'), SETTINGS);
  const { values, other } = readSettings(dir);
  assert.deepEqual(values, {
    title: 'Lab', description: '', favicon: '', startUrl: '', base: '', instanceName: '', language: 'nl', theme: 'auto', color: 'emerald', showTitle: true,
    headerStyle: 'boxed', target: '_blank', statusStyle: '', cardStyle: '', blockStyle: '', font: '', iconStyle: 'gradient', bookmarksStyle: '', cardBlur: '',
    backgroundImage: '', backgroundBlur: '', backgroundSaturate: '', backgroundBrightness: '', backgroundOpacity: '',
    fullWidth: false, maxGroupColumns: '', maxBookmarkGroupColumns: '', useEqualHeights: false, disableCollapse: false, groupsInitiallyCollapsed: false, showStats: false,
    qlSearchDescriptions: false, qlProvider: '', qlUrl: '', qlSuggestionUrl: '', qlTarget: '', qlShowSearchSuggestions: '', qlHideInternetSearch: false, qlHideVisitURL: false, qlMobileButtonPosition: '',
    pwaIcons: [], pwaShortcuts: [],
    allowedHosts: [], login: false, loginRemember: '7d', actionsRemember: '30m', hideVersion: false, disableUpdateCheck: false, disableIndexing: false,
    pluginUpdateInterval: '1h', discoveryInterval: '30s', logpath: '',
  });
  assert.deepEqual(other, ['layout', 'plugins', 'providers']);
  assert.equal(readSettings(tmpDir('dash-set-')).values.title, 'Homelab', 'no file yet');
});

test('checkSettings: types, lists of hosts, durations', () => {
  assert.deepEqual(checkSettings({ title: ' Thuis ', allowedHosts: 'Dash.lan, x.lan:8443', loginRemember: '30d', actionsRemember: '0' }).values, { title: 'Thuis', allowedHosts: ['dash.lan', 'x.lan:8443'], loginRemember: '30d', actionsRemember: '0' });
  for (const bad of [{ theme: 'pink' }, { login: 'yes' }, { allowedHosts: ['a b'] }, { loginRemember: 'soon' }, { title: 'x'.repeat(101) }]) assert.ok(checkSettings(bad).error, JSON.stringify(bad));
});

test('writeSettings: changes only the fields, keeps comments and every other key; defaults leave the file', () => {
  const dir = tmpDir('dash-set-');
  const file = path.join(dir, 'settings.yaml');
  fs.writeFileSync(file, SETTINGS);
  writeSettings(dir, checkSettings({ title: 'Thuis', theme: 'dark', allowedHosts: ['dash.lan'], login: true, loginRemember: '30d', actionsRemember: '15m', showTitle: true }).values);
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /^# my settings$/m, 'the comments stay');
  assert.match(text, /^title: Thuis # the name$/m);
  assert.match(text, /Media: \{ columns: 2 \} # keep me/);
  assert.match(text, /^allowedHosts: \[ dash\.lan \]$/m);
  assert.match(text, /^login: \{ remember: 30d \}$/m);
  assert.ok(!/actions:/.test(text), '15m is the default: actions goes');
  assert.ok(!/showTitle/.test(text), 'a default is left out');
  const config = loadConfig(dir, { env: {} });
  assert.deepEqual(config.errors, []);
  assert.deepEqual([config.settings.title, config.settings.theme, config.settings.allowedHosts, config.settings.login.required, config.settings.login.rememberMs, config.settings.providers.sonarr], ['Thuis', 'dark', ['dash.lan'], true, 30 * 86_400_000, 'abc']);
  writeSettings(dir, { login: false });
  assert.match(fs.readFileSync(file, 'utf8'), /^login: false$/m);
  writeAdminPassword(dir, 'scrypt:9:8:1:Yw==:ZA==');
  assert.match(fs.readFileSync(file, "utf8"), /^adminPassword: "?scrypt:9:8:1:Yw==:ZA=="?$/m);
  // a file without actions: the default leaves it out, another value adds it
  fs.writeFileSync(file, 'title: Lab\n');
  writeSettings(dir, { title: 'Lab', actionsRemember: '15m' });
  assert.equal(fs.readFileSync(file, 'utf8'), 'title: Lab\n');
  writeSettings(dir, { actionsRemember: '1h' });
  assert.match(fs.readFileSync(file, 'utf8'), /^actions:\n {2}remember: 1h$/m);
  fs.writeFileSync(file, 'title: [broken');
  assert.throws(() => writeSettings(dir, { title: 'x' }), /settings\.yaml/, 'a file that does not parse is not written over');
});

test('writeSettings: the previous settings.yaml is kept in the history', async () => {
  const { listHistory, readHistory } = await import('../src/config/edit.js');
  const dir = tmpDir('dash-set-');
  fs.writeFileSync(path.join(dir, 'settings.yaml'), SETTINGS);
  writeSettings(dir, { title: 'Thuis' });
  const [last] = listHistory(dir, 'settings.yaml');
  assert.equal(readHistory(dir, 'settings.yaml', last.id), SETTINGS);
});

test('the other settings.yaml keys: nested paths, defaults left out, only what changed written, loadConfig agrees', () => {
  const dir = tmpDir('dash-set-');
  const text = `# mine
background: https://example.com/wall.jpg   # the wallpaper
quicklaunch:
  hideVisitURL: true   # keep me
pwa:
  icons:
    - { src: /icons/app-192.png, sizes: 192x192 }   # the small one
discovery: { interval: 1m }
pluginUpdateInterval: false
`;
  fs.writeFileSync(path.join(dir, 'settings.yaml'), text);
  const { values, other } = readSettings(dir);
  assert.deepEqual([values.backgroundImage, values.qlHideVisitURL, values.discoveryInterval, values.pluginUpdateInterval], ['https://example.com/wall.jpg', true, '1m', 'off']);
  assert.deepEqual(values.pwaIcons, [{ src: '/icons/app-192.png', sizes: '192x192', type: '', purpose: '' }]);
  assert.deepEqual(other, []);
  // the whole form sent back unchanged: the file stays as it is
  writeSettings(dir, checkSettings(values).values);
  assert.equal(fs.readFileSync(path.join(dir, 'settings.yaml'), 'utf8'), text);
  // changes: nested keys made and removed, defaults left out, background becomes a map
  const changed = checkSettings({ ...values, backgroundBlur: 'sm', backgroundOpacity: '50', qlHideVisitURL: false, qlProvider: 'brave', qlShowSearchSuggestions: 'false',
    discoveryInterval: '30s', pluginUpdateInterval: '2h', fullWidth: true, maxGroupColumns: '6', description: 'My lab', base: 'https://lab.example.com/dash',
    pwaShortcuts: [{ name: 'Media', url: '/#media', description: '' }, { name: '', url: '', description: '' }] });
  assert.equal(changed.error, undefined);
  writeSettings(dir, changed.values);
  const out = fs.readFileSync(path.join(dir, 'settings.yaml'), 'utf8');
  assert.match(out, /^# mine$/m);
  assert.match(out, /- \{ src: \/icons\/app-192\.png, sizes: 192x192 \} +# the small one/, 'an untouched list keeps its comments');
  assert.match(out, /- \{ name: Media, url: \/#media \}/);
  assert.doesNotMatch(out, /discovery/, 'the default: left out, with the emptied map');
  const config = loadConfig(dir);
  assert.deepEqual(config.errors, []);
  assert.deepEqual(config.warnings, []);
  const st = config.settings;
  assert.deepEqual(st.background, { image: 'https://example.com/wall.jpg', blur: 8, opacity: 50 });
  assert.deepEqual([st.quicklaunch.hideVisitURL, st.quicklaunch.provider, st.quicklaunch.showSearchSuggestions], [undefined, 'brave', false]);
  assert.deepEqual([st.fullWidth, st.maxGroupColumns, st.description, st.base, st.pluginUpdateInterval], [true, 6, 'My lab', 'https://lab.example.com/dash/', '2h']);
  assert.deepEqual(st.pwa.shortcuts, [{ name: 'Media', url: '/#media' }]);
  // back to only an image: the short form
  writeSettings(dir, checkSettings({ ...readSettings(dir).values, backgroundBlur: '', backgroundOpacity: '' }).values);
  assert.match(fs.readFileSync(path.join(dir, 'settings.yaml'), 'utf8'), /^background: https:\/\/example\.com\/wall\.jpg$/m);
  for (const bad of [{ base: 'lab.example.com' }, { maxGroupColumns: '9' }, { backgroundSaturate: '-1' }, { pwaIcons: [{ sizes: '1x1' }] }, { qlShowSearchSuggestions: 'yes' }, { pluginUpdateInterval: 'soon' }]) {
    assert.ok(checkSettings(bad).error, JSON.stringify(bad));
  }
});

test('durations: the form refuses what the dashboard would raise when it loads', () => {
  assert.match(checkSettings({ discoveryInterval: '1s' }).error, /discoveryInterval: at least 5s/);
  assert.match(checkSettings({ loginRemember: '0' }).error, /loginRemember: at least 1m/);
  assert.match(checkSettings({ pluginUpdateInterval: '10s' }).error, /pluginUpdateInterval: at least 1m, or off/);
  assert.equal(checkSettings({ pluginUpdateInterval: 'off' }).error, undefined);
  assert.equal(checkSettings({ actionsRemember: '0' }).error, undefined, '0: ask every time');
  assert.equal(checkSettings({ discoveryInterval: '5s' }).error, undefined);
});
