import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readServices, writeServices } from '../src/settings-services.js';
import { loadConfig } from '../src/config/load.js';
import { tmpDir } from './helpers.mjs';

const TEXT = `# my services
- Infra:
    - Router:   # the gateway
        href: http://router.lan
        ping: router.lan
        widget:
          type: custom-api
          url: http://router.lan/api
    - Network:
        - Switch:
            href: http://switch.lan
- Media: !include media.yaml
- Apps:
    - !include apps.yaml
    - Empty:
`;

function setup() {
  const dir = tmpDir('dash-services-');
  fs.writeFileSync(path.join(dir, 'services.yaml'), TEXT);
  fs.writeFileSync(path.join(dir, 'media.yaml'), '- Plex:\n    href: http://plex.lan\n');
  fs.writeFileSync(path.join(dir, 'apps.yaml'), '- Wiki:\n    href: http://wiki.lan\n');
  return dir;
}
const file = (dir) => fs.readFileSync(path.join(dir, 'services.yaml'), 'utf8');
const names = (groups) => groups.map((g) => [g.name, g.services.map((s) => s.name), g.groups.map((n) => [n.name, n.services.map((s) => s.name)])]);

test('readServices: groups, nested groups, services with their fields and widgets, includes as blocks', () => {
  const { items, hash } = readServices(setup());
  assert.match(hash, /^[0-9a-f]{16}$/);
  const [infra, media, apps] = items;
  assert.deepEqual([infra.kind, infra.id, infra.name, infra.items.map((i) => [i.kind, i.id, i.name])], ['group', '0', 'Infra', [['service', '0/0', 'Router'], ['group', '0/1', 'Network']]]);
  const router = infra.items[0];
  assert.deepEqual([router.fields.href, router.fields.ping, router.fields.showStats, router.fields.external, router.widgets, router.other], ['http://router.lan', 'router.lan', '', false, ['custom-api'], []]);
  assert.deepEqual([media.kind, media.include], ['group', 'media.yaml']);
  assert.deepEqual(apps.items.map((i) => [i.kind, i.file ?? i.name]), [['include', 'apps.yaml'], ['service', 'Empty']]);
});

test('writeServices: the same tree writes nothing', () => {
  const dir = setup();
  const { items, hash } = readServices(dir);
  assert.equal(writeServices(dir, items, hash).changed, false);
  assert.equal(file(dir), TEXT);
});

test('writeServices: rename, move, add, remove and field changes keep comments, widgets and includes', () => {
  const dir = setup();
  const { items, hash } = readServices(dir);
  const [infra, media, apps] = items;
  const [router, network] = infra.items;
  router.name = 'Gateway';
  router.fields.description = 'The router';
  router.fields.ping = '';
  router.fields.weight = '10';
  router.fields.showStats = 'true';
  // the switch moves to Apps, after the include; Empty is removed; a new service in Network
  const [sw] = network.items;
  network.items = [{ kind: 'service', id: null, name: 'AP', fields: { href: 'http://ap.lan' } }];
  apps.items = [apps.items[0], sw];
  const out = writeServices(dir, [apps, infra, media, { kind: 'group', id: null, name: 'New', items: [] }], hash);
  assert.equal(out.changed, true);
  const text = file(dir);
  assert.match(text, /^# my services\n- Apps:/, 'the top comment stays at the top');
  assert.match(text, /- Gateway:\s+# the gateway/);
  assert.match(text, /widget:\n +type: custom-api\n +url: http:\/\/router\.lan\/api/);
  assert.match(text, /- Media: !include media\.yaml/);
  assert.match(text, /- !include apps\.yaml/);
  assert.doesNotMatch(text, /ping:|Empty/);
  const config = loadConfig(dir);
  assert.deepEqual(config.errors, []);
  assert.deepEqual(names(config.services), [['Apps', ['Wiki', 'Switch'], []], ['Infra', ['Gateway'], [['Network', ['AP']]]], ['Media', ['Plex'], []], ['New', [], []]]);
  const gateway = config.services[1].services[0];
  assert.deepEqual([gateway.description, gateway.weight, gateway.showStats, gateway.ping, gateway.widgets[0].type], ['The router', 10, true, undefined, 'custom-api']);
});

test('writeServices: refuses a stale tree, an entry twice, a bad field, and what loadConfig would refuse', () => {
  const dir = setup();
  const { items, hash } = readServices(dir);
  const again = () => readServices(dir);
  assert.throws(() => writeServices(dir, items, 'old'), (err) => err.status === 409);
  assert.throws(() => writeServices(dir, [...items, items[0]], hash), (err) => err.status === 400 && /twice/.test(err.message));
  const bad = again();
  bad.items[0].items[0].fields.weight = 'heavy';
  assert.throws(() => writeServices(dir, bad.items, bad.hash), (err) => err.status === 400 && /weight/.test(err.message));
  const loose = again();
  assert.throws(() => writeServices(dir, [loose.items[0].items[0]], loose.hash), (err) => err.status === 400 && /belongs in a group/.test(err.message));
  const gone = again();
  gone.items[0].items[0].id = '9/9';
  assert.throws(() => writeServices(dir, gone.items, gone.hash), (err) => err.status === 409);
  const filter = again();
  filter.items[0].items[0].fields.filter = 'container.status ==';
  assert.throws(() => writeServices(dir, filter.items, filter.hash), (err) => err.status === 400 && err.errors?.some((e) => /filter/.test(e.path)));
  assert.equal(file(dir), TEXT, 'nothing written');
});
