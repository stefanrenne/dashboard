import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readPlugins, checkPlugins, writePlugins } from '../src/settings/plugins.js';
import { loadConfig } from '../src/config/load.js';
import { tmpDir } from './helpers.mjs';

const TEXT = `# mine
plugins:
  - source: git+https://github.com/someone/widget-pihole#v1.2.0   # pinned
    label: Pi-hole
  - path: ./my-widgets/garage
  - source: npm:dashboard-widget-adguard@2.0.1
    subdir: widgets/adguard
    only: [adguard]
`;

function setup(text = TEXT) {
  const dir = tmpDir('dash-plugins-');
  fs.writeFileSync(path.join(dir, 'settings.yaml'), text);
  fs.mkdirSync(path.join(dir, 'plugins'));
  fs.writeFileSync(path.join(dir, 'plugins', 'plugins.lock.yaml'), 'plugins:\n  git+https://github.com/someone/widget-pihole#v1.2.0:\n    dir: x\n    commit: abc1234def\n    tag: v1.2.0\n  git+https://github.com/stefanrenne/dashboard-widgets#latest:\n    dir: y\n    commit: 0a1b2c3\n    tag: v0.20.0\n');
  return dir;
}
const file = (dir) => fs.readFileSync(path.join(dir, 'settings.yaml'), 'utf8');

test('readPlugins: each entry as the page edits it, with its pin', () => {
  const dir = setup();
  const { entries } = readPlugins(dir);
  assert.deepEqual(entries.map(({ index, kind, value, subdir, only, error }) => [index, kind, value, subdir, only, error]), [
    [0, 'git', 'https://github.com/someone/widget-pihole#v1.2.0', '', '', null],
    [1, 'path', './my-widgets/garage', '', '', null],
    [2, 'npm', 'dashboard-widget-adguard@2.0.1', 'widgets/adguard', 'adguard', null],
  ]);
  assert.deepEqual(entries[0].pin, { tag: 'v1.2.0', commit: 'abc1234def', version: null });
  fs.writeFileSync(path.join(dir, 'settings.yaml'), 'plugins:\n  - source: git+https://github.com/stefanrenne/dashboard-widgets#v0.19.0\n  - source: ftp://nope\n');
  assert.match(readPlugins(dir).entries[1].error, /starts with "git\+" or "npm:"/);
});

test('writePlugins: the same list writes nothing; edits keep each entry\'s comments and other keys', () => {
  const dir = setup();
  const save = (entries) => {
    const checked = checkPlugins(entries);
    assert.equal(checked.error, undefined);
    writePlugins(dir, checked.entries);
  };
  const { entries } = readPlugins(dir);
  save(entries);
  assert.equal(file(dir), TEXT);
  // the pin moved, the path removed, the npm entry first, a new git entry at the end
  const [pihole, , adguard] = entries;
  save([{ ...adguard, only: 'adguard, adguard-2' }, { ...pihole, value: 'https://github.com/someone/widget-pihole#v1.3.0' }, { kind: 'git', value: 'https://github.com/other/clock#latest', subdir: '', only: '', index: null }]);
  const out = file(dir);
  assert.match(out, /^# mine$/m);
  assert.match(out, /widget-pihole#v1\.3\.0 +# pinned\n {4}label: Pi-hole$/m);
  assert.doesNotMatch(out, /garage/);
  const plugins = loadConfig(dir).settings.plugins;
  assert.deepEqual(plugins, [
    { source: 'npm:dashboard-widget-adguard@2.0.1', subdir: 'widgets/adguard', only: ['adguard', 'adguard-2'] },
    { source: 'git+https://github.com/someone/widget-pihole#v1.3.0', label: 'Pi-hole' },
    { source: 'git+https://github.com/other/clock#latest' },
  ]);
  // all removed: an empty list
  save([]);
  assert.match(file(dir), /^plugins: \[\]$/m);
  assert.deepEqual(loadConfig(dir).errors, []);
});

test('writePlugins: no plugins key yet', () => {
  const dir = setup('title: Lab\n');
  writePlugins(dir, checkPlugins([{ kind: 'path', value: './mine', subdir: '', only: '' }]).entries);
  assert.equal(file(dir), 'title: Lab\nplugins:\n  - path: ./mine\n');
});

test('checkPlugins: sources the installer would refuse are refused here', () => {
  for (const bad of [[{ kind: 'git', value: 'ftp://x' }], [{ kind: 'git', value: 'https://github.com/a/b#-x' }], [{ kind: 'npm', value: 'Not A Name' }], [{ kind: 'path', value: '' }],
    [{ kind: 'git', value: 'https://github.com/a/b', subdir: '../up' }], [{ kind: 'svn', value: 'x' }], 'nope']) {
    assert.ok(checkPlugins(bad).error, JSON.stringify(bad));
  }
});
