import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskConfigText, unmaskConfigText, secretsOf } from '../src/settings/secrets.js';

const schemaFor = (type) => (type === 'counter' ? { url: { type: 'url' }, key: { type: 'string', secret: true }, pin: { type: 'number', secret: true } } : null);
const TOKEN = /__SECRET_[0-9a-f]{10}__/g;

const SERVICES = `# mine
- Apps:
    - Counter:
        href: http://counter.lan   # the app
        widget:
          type: counter
          url: http://counter.lan
          key: "s3cr3t-key"   # literal
          pin: 4711
    - Other:
        widgets:
          - type: counter
            key: '{{DASHBOARD_VAR_KEY}}'
          - type: unknown
            key: not-a-declared-secret
`;

test('maskConfigText: secret options become tokens; the rest of the text stays byte for byte', () => {
  const out = maskConfigText('services.yaml', SERVICES, schemaFor);
  assert.ok(!out.text.includes('s3cr3t-key') && !out.text.includes('4711'));
  assert.deepEqual(out.secrets, ['[0].Apps[0].Counter.widget.key', '[0].Apps[0].Counter.widget.pin']);
  assert.equal(out.text.replace(TOKEN, 'X'), SERVICES.replace('"s3cr3t-key"', 'X').replace('4711', 'X'));
  assert.ok(out.text.includes("'{{DASHBOARD_VAR_KEY}}'"), 'a placeholder is no secret');
  assert.ok(out.text.includes('not-a-declared-secret'), 'only declared secret options');
});

test('settings.yaml: adminPassword and providers; proxmox.yaml: secret; widgets.yaml: secret options', () => {
  const settings = maskConfigText('settings.yaml', 'title: Lab\nadminPassword: "scrypt:1:2:3:YQ==:Yg=="\nproviders:\n  weather: abcdef\n  sonarr: { key: xyz123 }\n');
  assert.deepEqual(settings.secrets, ['adminPassword', 'providers.weather', 'providers.sonarr.key']);
  assert.match(settings.text, /^title: Lab$/m);
  const proxmox = maskConfigText('proxmox.yaml', 'pve:\n  url: https://pve.lan:8006\n  token: api@pam!dash\n  secret: 1234-abcd\n');
  assert.deepEqual(proxmox.secrets, ['pve.secret']);
  assert.deepEqual(maskConfigText('proxmox.yaml', 'url: https://pve.lan\ntoken: t\nsecret: flat-secret\n').secrets, ['secret'], "homepage's flat form");
  const header = maskConfigText('widgets.yaml', '- counter:\n    url: http://c.lan\n    key: hdr-key\n- datetime:\n    key: shown\n', schemaFor);
  assert.deepEqual(header.secrets, ['[0].counter.key']);
});

test('a file that does not parse: the known secret values are hidden as text', () => {
  const out = maskConfigText('services.yaml', '- Apps: [\n  key: s3cr3t-key\n', schemaFor, ['s3cr3t-key']);
  assert.ok(!out.text.includes('s3cr3t-key'));
});

test('unmaskConfigText: tokens get their values back, also after moving; unknown tokens are refused', () => {
  const masked = maskConfigText('services.yaml', SERVICES, schemaFor).text;
  assert.equal(unmaskConfigText('services.yaml', masked, SERVICES, schemaFor).text, SERVICES.replace('"s3cr3t-key"', '"s3cr3t-key"'));
  // moved into another widget, and used inside a longer value
  const [key] = masked.match(TOKEN);
  const moved = masked.replace("'{{DASHBOARD_VAR_KEY}}'", key).replace('url: http://counter.lan\n', `url: http://counter.lan/?k=${key}\n`);
  const back = unmaskConfigText('services.yaml', moved, SERVICES, schemaFor).text;
  assert.ok(back.includes('url: "http://counter.lan/?k=s3cr3t-key"'));
  assert.equal(back.match(/s3cr3t-key/g).length, 3);
  assert.ok(back.includes('pin: 4711'), 'a number stays a number');
  assert.throws(() => unmaskConfigText('services.yaml', masked.replace(key, '__SECRET_0000000000__'), SERVICES, schemaFor), (err) => err.status === 400);
});

test('unmaskConfigText: a secret newly written into the file gets a warning', () => {
  const masked = maskConfigText('services.yaml', SERVICES, schemaFor).text;
  const typed = masked.replace("'{{DASHBOARD_VAR_KEY}}'", 'typed-in-key');
  const { warnings } = unmaskConfigText('services.yaml', typed, SERVICES, schemaFor);
  assert.deepEqual(warnings.map((w) => w.path), ['[0].Apps[1].Other.widgets[0].key']);
  assert.deepEqual(unmaskConfigText('services.yaml', masked, SERVICES, schemaFor).warnings, [], 'the secrets that were there: no warning');
  assert.equal(secretsOf('services.yaml', 'nope: [', schemaFor).size, 0);
});
