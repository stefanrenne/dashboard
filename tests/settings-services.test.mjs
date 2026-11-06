import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readServices, writeServices, widgetCatalog } from '../src/settings-services.js';
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
  assert.deepEqual([router.fields.href, router.fields.ping, router.fields.showStats, router.fields.external, router.widgets.map((w) => [w.id, w.type]), router.other], ['http://router.lan', 'router.lan', '', false, [['widget', 'custom-api']], []]);
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

const SCHEMA = { counter: { url: { type: 'url', required: true }, key: { type: 'string', secret: true }, every: { type: 'number' }, live: { type: 'boolean' }, unit: { type: 'enum', values: ['s', 'm'] }, mappings: { type: 'list' } } };
const schemaFor = (type) => SCHEMA[type] ?? null;
const WIDGETS = `- Apps:
    - Counter:
        href: http://counter.lan
        widget:
          type: counter
          url: http://counter.lan   # the API
          key: literal-key-123
          mappings: [a, b]
    - Other:
        widgets:
          - type: counter
            url: http://other.lan
            key: "{{DASHBOARD_VAR_KEY}}"
          - type: unknown
            x: 1
`;

test('widgets: options by their schema, secrets as tokens, lists and undeclared keys kept aside', () => {
  const dir = tmpDir('dash-services-');
  fs.writeFileSync(path.join(dir, 'services.yaml'), WIDGETS);
  const { items } = readServices(dir, schemaFor);
  const [counter, other] = items[0].items;
  const [w] = counter.widgets;
  assert.deepEqual([w.id, w.type, w.options.url, w.options.every, w.options.live, w.rest], ['widget', 'counter', 'http://counter.lan', '', '', ['mappings']]);
  assert.match(w.options.key, /^__SECRET_[0-9a-f]{10}__$/);
  assert.ok(!JSON.stringify(items).includes('literal-key-123'));
  assert.equal(other.widgets[0].options.key, '{{DASHBOARD_VAR_KEY}}', 'a placeholder is no secret');
  assert.deepEqual([other.widgets[1].id, other.widgets[1].type, other.widgets[1].rest], ['widgets/1', 'unknown', ['x']]);
});

test('widgets: edits keep comments, the secret behind its token, the form widget: or widgets:', () => {
  const dir = tmpDir('dash-services-');
  fs.writeFileSync(path.join(dir, 'services.yaml'), WIDGETS);
  const read = readServices(dir, schemaFor);
  assert.equal(writeServices(dir, read.items, read.hash, { env: { DASHBOARD_VAR_KEY: 'from-env' } }, schemaFor).changed, false, 'unchanged');
  const [counter, other] = read.items[0].items;
  counter.widgets[0].options.every = '30';
  counter.widgets[0].options.live = 'true';
  counter.widgets[0].options.unit = 'm';
  // Other: its unknown widget removed, a new one added; one widget left in a list stays a list
  other.widgets = [other.widgets[0]];
  const out = writeServices(dir, read.items, read.hash, { env: { DASHBOARD_VAR_KEY: 'from-env' } }, schemaFor);
  assert.deepEqual(out.warnings, []);
  let text = fs.readFileSync(path.join(dir, 'services.yaml'), 'utf8');
  assert.match(text, /url: http:\/\/counter\.lan +# the API/);
  assert.match(text, /key: literal-key-123/);
  assert.match(text, /mappings: \[ a, b \]|mappings: \[a, b\]/);
  assert.match(text, /every: 30\n +live: true\n +unit: m/);
  assert.match(text, /widgets:\n +- type: counter/);
  assert.doesNotMatch(text, /unknown/);
  // a second widget for Counter turns widget: into widgets:; a new secret typed in warns
  const again = readServices(dir, schemaFor);
  again.items[0].items[0].widgets.push({ id: null, type: 'counter', options: { url: 'http://two.lan', key: 'typed-key' } });
  const two = writeServices(dir, again.items, again.hash, { env: { DASHBOARD_VAR_KEY: 'from-env' } }, schemaFor);
  assert.deepEqual(two.warnings.map((w) => w.path), ['[0].Apps[0].Counter.widgets[1].key']);
  text = fs.readFileSync(path.join(dir, 'services.yaml'), 'utf8');
  const config = loadConfig(dir);
  assert.deepEqual(config.errors, []);
  assert.deepEqual(config.services[0].services[0].widgets.map((w) => [w.type, w.options.key]), [['counter', 'literal-key-123'], ['counter', 'typed-key']]);
  assert.doesNotMatch(text, /^ +widget:/m);
  // a token moved to another option is refused; a bad number too
  const bad = readServices(dir, schemaFor);
  bad.items[0].items[1].widgets[0].options.url = bad.items[0].items[0].widgets[0].options.key;
  assert.throws(() => writeServices(dir, bad.items, bad.hash, { env: { DASHBOARD_VAR_KEY: 'from-env' } }, schemaFor), (err) => err.status === 400);
  const nan = readServices(dir, schemaFor);
  nan.items[0].items[0].widgets[0].options.every = 'often';
  assert.throws(() => writeServices(dir, nan.items, nan.hash, { env: { DASHBOARD_VAR_KEY: 'from-env' } }, schemaFor), (err) => err.status === 400 && /every/.test(err.message));
  assert.deepEqual(widgetCatalog(new Map([['counter', { manifest: { id: 'counter', name: 'Counter', options: SCHEMA.counter } }]]))[0].options.key, { type: 'string', required: false, secret: true });
});
