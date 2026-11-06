import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  EDITABLE_FILES, HISTORY_DIR, HISTORY_KEEP, readConfigFile, parseDocument, documentText,
  checkConfigText, writeConfigFile, listHistory, readHistory, configPath, editableFiles,
} from '../src/config/edit.js';
import { loadConfig } from '../src/config/load.js';
import { isConfigChange } from '../src/config/watch.js';
import { tmpDir } from './helpers.mjs';

const SERVICES = `# my services
- Media: !include media.yaml   # the media group
- Infra:
    - Router:
        href: http://router.lan
        widget:
          type: custom-api
          url: "{{DASHBOARD_VAR_ROUTER_URL}}"   # a secret
`;

function setup() {
  const dir = tmpDir('dash-edit-');
  fs.writeFileSync(path.join(dir, 'services.yaml'), SERVICES);
  fs.writeFileSync(path.join(dir, 'media.yaml'), '- Plex:\n    href: http://plex.lan\n');
  return dir;
}

test('configPath: only the config files on the allow-list, in the folder itself', () => {
  const dir = setup();
  assert.ok(EDITABLE_FILES.includes('services.yaml') && EDITABLE_FILES.includes('proxmox.yaml'));
  assert.equal(configPath(dir, 'services.yaml'), path.join(path.resolve(dir), 'services.yaml'));
  assert.equal(configPath(dir, 'media.yaml'), path.join(path.resolve(dir), 'media.yaml'), 'included: editable');
  fs.writeFileSync(path.join(dir, 'other.yaml'), '[]');
  for (const bad of ['other.yaml', './services.yaml', '../services.yaml', '.history/services.yaml', 'plugins/plugins.lock.yaml', 'custom.html', '/etc/passwd']) {
    assert.throws(() => configPath(dir, bad), (err) => err.status === 404, bad);
  }
});

test('readConfigFile: text and hash; a missing file reads as empty', () => {
  const dir = setup();
  const read = readConfigFile(dir, 'services.yaml');
  assert.equal(read.text, SERVICES);
  assert.equal(read.exists, true);
  assert.match(read.hash, /^[0-9a-f]{16}$/);
  assert.deepEqual({ ...readConfigFile(dir, 'docker.yaml'), hash: undefined }, { file: 'docker.yaml', text: '', exists: false, hash: undefined });
});

test('a document edit keeps comments, !include and placeholders', () => {
  const dir = setup();
  const doc = parseDocument(readConfigFile(dir, 'services.yaml').text, 'services.yaml');
  doc.getIn([1, 'Infra', 0, 'Router']).set('description', 'Gateway');
  const out = documentText(doc);
  for (const kept of ['# my services', '!include media.yaml', '# the media group', '{{DASHBOARD_VAR_ROUTER_URL}}', '# a secret', 'description: Gateway']) {
    assert.ok(out.includes(kept), kept);
  }
  writeConfigFile(dir, 'services.yaml', out);
  const config = loadConfig(dir, { env: { DASHBOARD_VAR_ROUTER_URL: 'http://10.0.0.1' } });
  assert.deepEqual(config.errors, []);
  assert.deepEqual(config.services.map((g) => g.name), ['Media', 'Infra']);
  assert.equal(config.services[1].services[0].description, 'Gateway');
  assert.throws(() => parseDocument('a: [1', 'x.yaml'), /x\.yaml/);
});

test('writeConfigFile: refuses a save that adds errors, and leaves the file as it was', () => {
  const dir = setup();
  assert.throws(() => writeConfigFile(dir, 'services.yaml', '- Media: [1\n'), (err) => err.status === 400 && err.errors.length > 0 && err.errors[0].file === 'services.yaml');
  assert.throws(() => writeConfigFile(dir, 'services.yaml', 'just: a map\n'), (err) => err.status === 400 && /services\.yaml/.test(err.message));
  assert.equal(fs.readFileSync(path.join(dir, 'services.yaml'), 'utf8'), SERVICES);
  assert.deepEqual(listHistory(dir, 'services.yaml'), [], 'nothing kept for a refused save');
  assert.throws(() => writeConfigFile(dir, 'services.yaml', 42), (err) => err.status === 400);
});

test('writeConfigFile: an error that was already there does not block a save', () => {
  const dir = setup();
  fs.rmSync(path.join(dir, 'media.yaml'));
  assert.ok(loadConfig(dir).errors.length > 0, 'the include is broken');
  const text = SERVICES.replace('http://router.lan', 'http://gw.lan');
  assert.equal(writeConfigFile(dir, 'services.yaml', text).changed, true);
});

test('writeConfigFile: 409 when the file changed since it was read', () => {
  const dir = setup();
  const { hash } = readConfigFile(dir, 'services.yaml');
  fs.appendFileSync(path.join(dir, 'services.yaml'), '# edited by hand\n');
  assert.throws(() => writeConfigFile(dir, 'services.yaml', SERVICES, { hash }), (err) => err.status === 409 && err.hash === readConfigFile(dir, 'services.yaml').hash);
  const fresh = readConfigFile(dir, 'services.yaml');
  const out = writeConfigFile(dir, 'services.yaml', SERVICES, { hash: fresh.hash });
  assert.equal(out.hash, readConfigFile(dir, 'services.yaml').hash);
});

test('writeConfigFile: keeps the previous versions, newest first, at most HISTORY_KEEP', () => {
  const dir = setup();
  assert.deepEqual(writeConfigFile(dir, 'services.yaml', SERVICES).changed, false, 'the same text: nothing written');
  for (let i = 0; i < HISTORY_KEEP + 2; i++) writeConfigFile(dir, 'services.yaml', `${SERVICES}# save ${i}\n`);
  const versions = listHistory(dir, 'services.yaml');
  assert.equal(versions.length, HISTORY_KEEP);
  assert.equal(readHistory(dir, 'services.yaml', versions[0].id), `${SERVICES}# save ${HISTORY_KEEP}\n`);
  assert.throws(() => readHistory(dir, 'services.yaml', '../services.yaml'), (err) => err.status === 404);
  assert.throws(() => readHistory(dir, 'bookmarks.yaml', versions[0].id), (err) => err.status === 404, 'only versions of that file');
  // kept versions never count as config: not reloaded, not loaded
  assert.equal(isConfigChange(`${HISTORY_DIR}/${versions[0].id}`), false);
  assert.ok(fs.readdirSync(dir).every((n) => !n.endsWith('.tmp')));
});

test('writeConfigFile: a new file is written without a history entry', () => {
  const dir = setup();
  const out = writeConfigFile(dir, 'bookmarks.yaml', '- Dev:\n    - GitHub:\n        - href: https://github.com\n');
  assert.equal(out.changed, true);
  assert.equal(loadConfig(dir).bookmarks[0].name, 'Dev');
  assert.deepEqual(listHistory(dir, 'bookmarks.yaml'), []);
});

test('checkConfigText: warnings returned, values from variables scrubbed', () => {
  const dir = setup();
  const env = { DASHBOARD_VAR_THEME: 'sekrit-theme' };
  const out = checkConfigText(dir, 'settings.yaml', 'theme: "{{DASHBOARD_VAR_THEME}}"\n', { env });
  assert.deepEqual(out.errors, []);
  assert.ok(out.warnings.some((w) => w.path === 'theme'));
  assert.ok(out.warnings.every((w) => !w.message.includes('sekrit-theme')), JSON.stringify(out.warnings));
});

test('included files: listed with the config file they end up in, checked as part of it', () => {
  const dir = setup();
  fs.mkdirSync(path.join(dir, 'groups'));
  fs.writeFileSync(path.join(dir, 'media.yaml'), '- Plex:\n    href: http://plex.lan\n- !include groups/more.yaml\n');
  fs.writeFileSync(path.join(dir, 'groups', 'more.yaml'), '- Jellyfin:\n    href: http://jf.lan\n');
  fs.writeFileSync(path.join(dir, 'settings.yaml'), 'providers: !include secret/providers.yaml\nlayout: !include ../outside.yaml\n');
  fs.mkdirSync(path.join(dir, 'secret'));
  fs.writeFileSync(path.join(dir, 'secret', 'providers.yaml'), 'weather: abc123\n');
  const included = editableFiles(dir).filter((e) => e.from);
  assert.deepEqual(included.map(({ file, root, from, at }) => [file, root, from, at]), [
    ['secret/providers.yaml', 'settings.yaml', 'settings.yaml', 'providers'],
    ['media.yaml', 'services.yaml', 'services.yaml', '[0].Media'],
    ['groups/more.yaml', 'services.yaml', 'media.yaml', '[0].Media[1]'],
  ]);
  // a service that is not a map: an error of services.yaml's check, the file untouched
  assert.throws(() => writeConfigFile(dir, 'groups/more.yaml', '- Jellyfin: 42\n'), (err) => err.status === 400 && err.errors.some((e) => e.file === 'services.yaml'));
  assert.throws(() => writeConfigFile(dir, 'groups/more.yaml', '- [\n'), (err) => err.status === 400 && err.errors.some((e) => e.file === 'groups/more.yaml'));
  writeConfigFile(dir, 'groups/more.yaml', '- Emby:\n    href: http://emby.lan\n');
  assert.deepEqual(loadConfig(dir).services[0].services.map((s) => s.name), ['Plex', 'Emby']);
  const [version] = listHistory(dir, 'groups/more.yaml');
  assert.match(readHistory(dir, 'groups/more.yaml', version.id), /Jellyfin/);
  assert.ok(fs.existsSync(path.join(dir, HISTORY_DIR, 'groups', version.id)));
  assert.deepEqual(listHistory(dir, 'media.yaml'), [], 'not the history of another file');
  assert.equal(readConfigFile(dir, 'services.yaml').text, SERVICES, 'the include stays an include');
});

test('custom.css and custom.js: written as text, no YAML check, with history', () => {
  const dir = setup();
  assert.equal(writeConfigFile(dir, 'custom.css', 'body { color: red; }  /* not YAML: { */\n').changed, true);
  writeConfigFile(dir, 'custom.css', 'body { color: blue; }\n');
  assert.match(readHistory(dir, 'custom.css', listHistory(dir, 'custom.css')[0].id), /red/);
  assert.ok(editableFiles(dir).some((e) => e.file === 'custom.js'));
});
