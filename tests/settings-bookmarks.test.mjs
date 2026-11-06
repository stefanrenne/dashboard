import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readBookmarks, writeBookmarks } from '../src/settings-bookmarks.js';
import { loadConfig } from '../src/config/load.js';
import { tmpDir } from './helpers.mjs';

const TEXT = `# my bookmarks
- Developer:
    - GitHub:   # the code
        - abbr: GH
          href: https://github.com
    - Docs:
        href: https://docs.example.com
- Shared: !include shared.yaml
`;
function setup() {
  const dir = tmpDir('dash-bookmarks-');
  fs.writeFileSync(path.join(dir, 'bookmarks.yaml'), TEXT);
  fs.writeFileSync(path.join(dir, 'shared.yaml'), '- Wiki:\n    - href: https://wiki.lan\n');
  return dir;
}
const file = (dir) => fs.readFileSync(path.join(dir, 'bookmarks.yaml'), 'utf8');

test('readBookmarks: groups and bookmarks in both forms, includes as blocks', () => {
  const { items } = readBookmarks(setup());
  const [dev, shared] = items;
  assert.deepEqual(dev.items.map((b) => [b.id, b.name, b.fields.href, b.fields.abbr]), [['0/0', 'GitHub', 'https://github.com', 'GH'], ['0/1', 'Docs', 'https://docs.example.com', '']]);
  assert.equal(shared.include, 'shared.yaml');
});

test('writeBookmarks: nothing for the same tree; edits keep comments and each form', () => {
  const dir = setup();
  const read = readBookmarks(dir);
  assert.equal(writeBookmarks(dir, read.items, read.hash).changed, false);
  const [dev, shared] = read.items;
  const [github, docs] = dev.items;
  github.fields.description = 'The code';
  docs.name = 'Manual';
  writeBookmarks(dir, [shared, { ...dev, items: [docs, github, { kind: 'bookmark', id: null, name: 'Hub', fields: { href: 'https://hub.docker.com', abbr: 'DH' } }] }, { kind: 'group', id: null, name: 'Empty', items: [] }], read.hash);
  const out = file(dir);
  assert.match(out, /^# my bookmarks\n- Shared: !include shared\.yaml/);
  assert.match(out, /GitHub:\s+# the code/);
  assert.match(out, /- Manual:\n +href: https:\/\/docs\.example\.com/, 'the map form stays a map');
  assert.match(out, /- Hub:\n +- href: https:\/\/hub\.docker\.com\n +abbr: DH/, "a new one in homepage's form");
  const config = loadConfig(dir);
  assert.deepEqual(config.errors, []);
  assert.deepEqual(config.bookmarks.map((g) => [g.name, g.bookmarks.map((b) => b.name)]), [['Shared', ['Wiki']], ['Developer', ['Manual', 'GitHub', 'Hub']], ['Empty', []]]);
  assert.equal(config.bookmarks[1].bookmarks[1].description, 'The code');
});

test('writeBookmarks: refuses a stale tree and what loadConfig would refuse', () => {
  const dir = setup();
  const read = readBookmarks(dir);
  assert.throws(() => writeBookmarks(dir, read.items, 'old'), (err) => err.status === 409);
  read.items[0].items[0].fields.href = '';
  assert.throws(() => writeBookmarks(dir, read.items, read.hash), (err) => err.status === 400 && err.errors?.some((e) => /GitHub/.test(e.path)));
  assert.throws(() => writeBookmarks(dir, [read.items[0].items[1]], read.hash), (err) => err.status === 400 && /belongs in a group/.test(err.message));
  assert.equal(file(dir), TEXT);
});
