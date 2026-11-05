import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { loadConfig } from '../src/config/load.js';
import {
  Onboarding, MARKER, groupFor, imageRepository, isLocal, isPrivateAddress, matchWidget, newCode, readJson,
  scanContainers, servicesYaml, settingsYaml, WIDGETS_YAML, BOOKMARKS_YAML,
} from '../src/onboarding.js';
import { tmpDir, silentLog } from './helpers.mjs';

const req = (headers = {}, remoteAddress = '192.168.1.20') => ({ headers, socket: { remoteAddress } });

test('isLocal: a private address, and every address a proxy passed on private too', () => {
  for (const a of ['10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.20', '127.0.0.1', '100.64.1.2', '169.254.1.1', '::1', 'fd12:3456::1', 'fe80::1', '::ffff:192.168.1.20']) {
    assert.equal(isPrivateAddress(a), true, a);
  }
  for (const a of ['8.8.8.8', '172.32.0.1', '203.0.113.9', '2001:db8::1', '', 'nonsense']) assert.equal(isPrivateAddress(a), false, a);
  assert.equal(isLocal(req()), true, 'on the network itself');
  assert.equal(isLocal(req({}, '203.0.113.9')), false, 'straight from the internet');
  assert.equal(isLocal(req({ 'x-forwarded-for': '192.168.1.30' }, '172.18.0.2')), true, 'through a proxy, from the network');
  assert.equal(isLocal(req({ 'x-forwarded-for': '203.0.113.9' }, '172.18.0.2')), false, 'through a proxy, from the internet');
  assert.equal(isLocal(req({ 'x-forwarded-for': '10.0.0.1, 203.0.113.9' }, '172.18.0.2')), false, 'a private address written in by the visitor does not help');
  assert.equal(isLocal(req({ forwarded: 'for=203.0.113.9;proto=https' }, '172.18.0.2')), false);
  assert.equal(isLocal(req({ forwarded: 'for="[fd00::5]:4711"' }, '172.18.0.2')), true);
  assert.equal(isLocal(req({ 'x-forwarded-for': '192.168.1.30:51234' }, '172.18.0.2')), true, 'an address with a port');
});

test('newCode: eight letters and digits without look-alikes, in two halves', () => {
  for (let i = 0; i < 50; i++) assert.match(newCode(), /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  assert.notEqual(newCode(), newCode());
});

test('matchWidget: images in widget.yaml, then the image name against ids and aliases; only widgets with a url', () => {
  const widgets = [
    { id: 'radarr', options: { url: {} } },
    { id: 'plex', options: { url: {} }, images: ['plexinc/pms-docker'] },
    { id: 'homeassistant', options: { url: {} } },
    { id: 'npm', options: { url: {} }, images: ['jc21/nginx-proxy-manager'] },
    { id: 'pihole', aliases: ['pi-hole'], options: { url: {} } },
    { id: 'datetime', options: {} },
  ];
  assert.equal(imageRepository('ghcr.io/hotio/radarr:release@sha256:abc'), 'hotio/radarr');
  assert.equal(imageRepository('localhost:5000/radarr:1'), 'library/radarr');
  assert.equal(imageRepository('nginx'), 'library/nginx');
  assert.equal(matchWidget('lscr.io/linuxserver/radarr:latest', widgets), 'radarr');
  assert.equal(matchWidget('plexinc/pms-docker:public', widgets), 'plex', 'images: the whole repository');
  assert.equal(matchWidget('homeassistant/home-assistant:stable', widgets), 'homeassistant', 'dashes and case do not count');
  assert.equal(matchWidget('jc21/nginx-proxy-manager:latest', widgets), 'npm');
  assert.equal(matchWidget('pihole/pihole', widgets), 'pihole');
  assert.equal(matchWidget('someone/datetime', widgets), null, 'a header widget is no service card');
  assert.equal(matchWidget('postgres:16', widgets), null);
  assert.equal(groupFor('radarr'), 'Downloads');
  assert.equal(groupFor('plex'), 'Media');
  assert.equal(groupFor(null), 'Services');
});

test('scanContainers: the widget, the URL by network (shared, own address, published port), labelled ones marked', async () => {
  const containers = [
    { Id: 'self123', Names: ['/dashboard'], Image: 'ghcr.io/stefanrenne/dashboard', NetworkSettings: { Networks: { proxy: {} } } },
    { Id: 'a', Names: ['/radarr'], Image: 'linuxserver/radarr', Ports: [{ PrivatePort: 7878, Type: 'tcp' }], NetworkSettings: { Networks: { proxy: { IPAddress: '172.20.0.3' } } } },
    { Id: 'b', Names: ['/sonarr'], Image: 'linuxserver/sonarr', Ports: [{ PrivatePort: 8989, Type: 'tcp' }], NetworkSettings: { Networks: { br0: { IPAddress: '192.168.1.50' } } } },
    { Id: 'c', Names: ['/plex'], Image: 'plexinc/pms-docker', Ports: [{ PrivatePort: 32400, PublicPort: 32400, Type: 'tcp' }], NetworkSettings: { Networks: { bridge: { IPAddress: '172.17.0.4' } } } },
    { Id: 'd', Names: ['/labelled'], Image: 'linuxserver/lidarr', Labels: { 'dashboard.name': 'Lidarr' }, NetworkSettings: { Networks: {} } },
    { Id: 'e', Names: ['/postgres'], Image: 'postgres:16', Ports: [{ PrivatePort: 5432, Type: 'tcp' }], NetworkSettings: { Networks: { bridge: {} } } },
  ];
  const get = async (server, p) => {
    if (p === '/containers/json') return containers;
    if (p === '/containers/self123/json') return { NetworkSettings: { Networks: { proxy: {} } } };
    if (p === '/networks') return [{ Name: 'proxy', Driver: 'bridge' }, { Name: 'br0', Driver: 'macvlan' }, { Name: 'bridge', Driver: 'bridge' }];
    throw new Error('404');
  };
  const widgets = [{ id: 'radarr', options: { url: {} } }, { id: 'sonarr', options: { url: {} } }, { id: 'lidarr', options: { url: {} } }, { id: 'plex', options: { url: {} }, images: ['plexinc/pms-docker'] }];
  const { containers: out, problems } = await scanContainers({ servers: [{ name: 'local', socket: '/x' }], widgets, host: '192.168.1.10', get, selfId: 'self123' });
  assert.deepEqual(problems, []);
  const by = Object.fromEntries(out.map((c) => [c.name, c]));
  assert.equal(by.dashboard, undefined, 'the dashboard itself is left out');
  assert.deepEqual([by.radarr.widget, by.radarr.url, by.radarr.href], ['radarr', 'http://radarr:7878', null], 'a shared network: its name');
  assert.deepEqual([by.sonarr.url, by.sonarr.href], ['http://192.168.1.50:8989', 'http://192.168.1.50:8989'], 'an address of its own (br0)');
  assert.deepEqual([by.plex.widget, by.plex.url, by.plex.href, by.plex.group], ['plex', 'http://192.168.1.10:32400', 'http://192.168.1.10:32400', 'Media'], 'a published port on the host the page was opened by');
  assert.equal(by.labelled.discovered, true);
  assert.equal(by.postgres.widget, null);
  assert.equal(out.at(-1).widget, null, 'the ones without a widget last');
  const broken = await scanContainers({ servers: [{ name: 'nas', url: 'http://nas:2375' }], widgets, host: 'x', get: async () => { throw new Error('refused'); } });
  assert.deepEqual(broken, { containers: [], problems: ['nas: refused'] });
});

test('the YAML the wizard writes loads without a message, secrets as written, an empty list without cards', () => {
  const dir = tmpDir('dash-onb-');
  fs.writeFileSync(path.join(dir, 'settings.yaml'), settingsYaml({ title: 'Lab: "mine"', language: 'nl', theme: 'dark', color: 'emerald' }));
  fs.writeFileSync(path.join(dir, 'services.yaml'), servicesYaml([
    { group: 'Downloads', name: 'Radarr', href: 'http://radarr.lan', icon: 'radarr.png', container: 'radarr', server: 'local', widget: { type: 'radarr', url: 'http://radarr:7878', key: 'k#ey: 1' } },
    { group: 'Media', name: 'Plex', href: 'http://plex.lan' },
  ]));
  fs.writeFileSync(path.join(dir, 'widgets.yaml'), WIDGETS_YAML);
  fs.writeFileSync(path.join(dir, 'bookmarks.yaml'), BOOKMARKS_YAML);
  const config = loadConfig(dir, { env: {} });
  assert.deepEqual([config.errors, config.warnings], [[], []]);
  assert.deepEqual([config.settings.title, config.settings.language, config.settings.theme, config.settings.color], ['Lab: "mine"', 'nl', 'dark', 'emerald'], 'quoted where it must be');
  const groups = config.services.map((g) => [g.name, g.services.map((s) => s.name)]);
  assert.deepEqual(groups, [['Downloads', ['Radarr']], ['Media', ['Plex']]]);
  assert.equal(config.services[0].services[0].widgets[0].options.key, 'k#ey: 1');
  assert.equal(config.widgets.length, 3);
  assert.match(servicesYaml([]), /\n\[\]\n$/);
});

test('readJson: JSON only, at most the limit, broken JSON is a 400', async () => {
  const body = (text, headers = { 'content-type': 'application/json' }) => Object.assign(Readable.from([Buffer.from(text)]), { headers });
  assert.deepEqual(await readJson(body('{"a":1}')), { a: 1 });
  await assert.rejects(readJson(body('{"a":1}', { 'content-type': 'text/plain' })), (e) => e.status === 415);
  await assert.rejects(readJson(body('x'.repeat(200)), 100), (e) => e.status === 413);
  await assert.rejects(readJson(body('{"a":1}', { 'content-type': 'application/json', 'content-length': '5000' }), 100), (e) => e.status === 413, 'refused before reading');
  await assert.rejects(readJson(body('{broken')), (e) => e.status === 400);
});

test('Onboarding: active with the marker, the code once per start, sessions, wrong codes slowed down, finish writes all or nothing', () => {
  const dir = tmpDir('dash-onb-');
  const logged = [];
  const o = new Onboarding({ configDir: dir, log: { ...silentLog, info: (m) => logged.push(m), warn: (m) => logged.push(m) } });
  assert.equal(o.active, false);
  o.announce('http://x:3000');
  assert.equal(o.code, null, 'no code without the marker');
  fs.writeFileSync(path.join(dir, MARKER), '');
  o.announce('http://x:3000');
  assert.match(logged.at(-1), /open http:\/\/x:3000\/setup .* code: [A-Z0-9]{4}-[A-Z0-9]{4}$/);
  const outside = req({}, '203.0.113.9');
  assert.equal(o.allowed(outside), false);
  assert.equal(o.allowed(req()), true, 'local');
  assert.equal(o.verify(outside, 'WRONG-CODE').status, 401);
  const ok = o.verify(outside, o.code.toLowerCase());
  assert.equal(ok.ok, true, 'case does not matter');
  const cookie = ok.headers['set-cookie'].split(';')[0];
  assert.match(ok.headers['set-cookie'], /^dash_setup=[\w-]+; Path=\/; HttpOnly; SameSite=Strict$/);
  assert.equal(o.allowed(req({ cookie }, '203.0.113.9')), true);
  for (let i = 0; i < 4; i++) o.verify(req({}, '203.0.113.50'), 'nope');
  assert.equal(o.verify(req({}, '203.0.113.50'), 'nope').status, 401);
  assert.equal(o.verify(req({}, '203.0.113.50'), o.code).status, 429, 'waiting');
  // finish: nothing is written when one file exists already
  fs.writeFileSync(path.join(dir, 'services.yaml'), '[]');
  assert.deepEqual(o.finish({ 'settings.yaml': 'title: A\n', 'services.yaml': '[]\n' }), { ok: false, exists: ['services.yaml'] });
  assert.equal(fs.existsSync(path.join(dir, 'settings.yaml')), false);
  fs.rmSync(path.join(dir, 'services.yaml'));
  assert.deepEqual(o.finish({ 'settings.yaml': 'title: A\n', 'services.yaml': '[]\n' }), { ok: true, written: ['settings.yaml', 'services.yaml'] });
  assert.equal(o.active, false, 'the marker is gone');
  assert.equal(o.allowed(req({ cookie }, '203.0.113.9')), false, 'sessions end with it');
  assert.deepEqual(fs.readdirSync(dir).sort(), ['services.yaml', 'settings.yaml'], 'no temporary files left');
});
