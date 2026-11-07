import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readLayout, checkLayout, writeLayout } from '../src/settings/layout.js';
import { loadConfig } from '../src/config/load.js';
import { tmpDir } from './helpers.mjs';

const GROUPS = { services: [{ name: 'Media', nested: [] }, { name: 'Infra', nested: ['Network'] }, { name: 'Tools', nested: [] }], bookmarks: ['Developer'] };
const MAP = `# mine
title: Lab
layout:
  Infra:   # the servers
    style: row
    custom: kept
    Network:
      columns: 2
  Gone:
    columns: 3
  Media:
    header: false
`;

function setup(text) {
  const dir = tmpDir('dash-layout-');
  fs.writeFileSync(path.join(dir, 'settings.yaml'), text);
  return dir;
}
const file = (dir) => fs.readFileSync(path.join(dir, 'settings.yaml'), 'utf8');
const save = (dir, groups) => {
  const checked = checkLayout(groups);
  assert.equal(checked.error, undefined);
  writeLayout(dir, checked.groups, readLayout(dir, GROUPS));
};

test('readLayout: the block\'s order, then the other groups; settings, nested groups, gone groups', () => {
  const { form, groups } = readLayout(setup(MAP), GROUPS);
  assert.equal(form, 'map');
  assert.deepEqual(groups.map((g) => [g.name, g.kind, g.inFile]), [['Infra', 'services', true], ['Gone', null, true], ['Media', 'services', true], ['Tools', 'services', false], ['Developer', 'bookmarks', false]]);
  assert.deepEqual(groups[0], {
    name: 'Infra', kind: 'services', inFile: true, style: 'row', columns: '', header: true, initiallyCollapsed: '', useEqualHeights: '', iconsOnly: '', icon: '', tab: '',
    nested: [{ name: 'Network', style: '', columns: '2', header: true, initiallyCollapsed: '', useEqualHeights: '', iconsOnly: '', icon: '' }],
  });
  assert.equal(groups[2].header, false);
});

test('writeLayout: the same layout back writes nothing', () => {
  const dir = setup(MAP);
  save(dir, readLayout(dir, GROUPS).groups);
  assert.equal(file(dir), MAP);
});

test('writeLayout: settings changed in place, comments and unknown keys kept, no entries for untouched groups', () => {
  const dir = setup(MAP);
  const groups = readLayout(dir, GROUPS).groups;
  groups[0].columns = '3';
  groups[0].nested[0].columns = '';
  groups[0].nested[0].initiallyCollapsed = 'true';
  groups[2].header = true; // Media back to the default: `Media:` stays, for the order
  groups[4].iconsOnly = 'true'; // Developer gets an entry
  save(dir, groups);
  const out = file(dir);
  assert.match(out, /# the servers/, 'the comment stays (the YAML library may move it a line down)');
  assert.match(out, /^ {4}custom: kept$/m);
  assert.match(out, /^ {4}columns: 3$/m);
  assert.match(out, /^ {4}Network:\n {6}initiallyCollapsed: true$/m);
  assert.match(out, /^ {2}Media: \{\}$/m);
  assert.match(out, /^ {2}Developer:\n {4}iconsOnly: true$/m);
  assert.doesNotMatch(out, /Tools/, 'an untouched group gets no entry');
  const config = loadConfig(dir);
  assert.deepEqual(config.errors, []);
  assert.deepEqual(config.settings.layout.Infra.Network, { initiallyCollapsed: true });
  assert.deepEqual(config.settings.layout.Media, {});
});

test('writeLayout: a new order puts every group in the block, in that order; a gone group removed', () => {
  const dir = setup(MAP);
  const groups = readLayout(dir, GROUPS).groups;
  const [infra, gone, media, tools, developer] = groups;
  save(dir, [developer, media, infra, tools, { ...gone, remove: true }]);
  const config = loadConfig(dir);
  assert.deepEqual(Object.keys(config.settings.layout), ['Developer', 'Media', 'Infra', 'Tools']);
  assert.equal(config.settings.layout.Infra.style, 'row');
  assert.match(file(dir), /# the servers/);
});

test("writeLayout: homepage's list form stays a list", () => {
  const dir = setup('layout:\n  - Media:\n  - Infra:\n      style: row\n');
  const read = readLayout(dir, GROUPS);
  assert.equal(read.form, 'list');
  const [media, infra, ...rest] = read.groups;
  save(dir, [infra, { ...media, columns: '4' }, ...rest]);
  const out = file(dir);
  assert.match(out, /^layout:\n {2}- Infra:\n {6}style: row\n {2}- Media:\n {6}columns: 4\n/);
  const config = loadConfig(dir);
  assert.deepEqual(Object.keys(config.settings.layout).slice(0, 2), ['Infra', 'Media']);
});

test('writeLayout: no layout yet; one group set makes the block', () => {
  const dir = setup('title: Lab\n');
  const groups = readLayout(dir, GROUPS).groups;
  groups[1].tab = 'Home';
  save(dir, groups);
  assert.equal(file(dir), 'title: Lab\nlayout:\n  Infra:\n    tab: Home\n');
});

test('checkLayout: refuses what the file cannot hold', () => {
  for (const bad of [[{ name: '' }], [{ name: 'A', columns: '13' }], [{ name: 'A', style: 'grid' }], [{ name: 'A', header: 'no' }], [{ name: 'A', iconsOnly: 'yes' }], [{ name: 'A', nested: [{ name: 'B', columns: 'x' }] }], 'nope']) {
    assert.ok(checkLayout(bad).error, JSON.stringify(bad));
  }
});
