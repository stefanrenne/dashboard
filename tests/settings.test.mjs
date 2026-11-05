import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readSettings, checkSettings, writeSettings, writeAdminPassword } from '../src/settings.js';
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
  const { values, other, hasPassword } = readSettings(dir);
  assert.deepEqual(values, {
    title: 'Lab', language: 'nl', theme: 'auto', color: 'emerald', showTitle: true, headerStyle: 'boxed', target: '_blank', statusStyle: '',
    allowedHosts: [], login: false, loginRemember: '7d', actionsRemember: '30m', hideVersion: false, disableUpdateCheck: false, disableIndexing: false,
  });
  assert.deepEqual(other, ['layout', 'plugins', 'providers']);
  assert.equal(hasPassword, true);
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
