import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readLayout, checkLayout, checkTabs, tabChanges, writeLayout } from '../src/settings/layout.js';
import { renameHeaderTabs } from '../src/settings/widgets.js';
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

// ---------------------------------------------------------------- tabs
const TABBED = `layout:
  Media:
    tab: Watch
  Infra:
    tab: Lab
`;
function tabbed(settings, widgets) {
  const dir = setup(settings);
  if (widgets !== undefined) fs.writeFileSync(path.join(dir, 'widgets.yaml'), widgets);
  return dir;
}
const widgetsFile = (dir) => fs.readFileSync(path.join(dir, 'widgets.yaml'), 'utf8');
const saveTabs = (dir, edit, groupInfo = GROUPS) => {
  const known = readLayout(dir, groupInfo);
  const page = structuredClone(known);
  edit(page);
  const groups = checkLayout(page.groups);
  const tabs = checkTabs(page.tabs);
  assert.equal(groups.error, undefined);
  assert.equal(tabs.error, undefined);
  writeLayout(dir, groups.groups, known, undefined, tabs.tabs);
  const changes = tabChanges(tabs.tabs, known.tabs);
  if (Object.keys(changes).length) renameHeaderTabs(dir, changes);
};
const asPage = (t) => ({ ...t, was: t.name });

test('readLayout: the tabs of tabs:, then those groups, the dashboard and header widgets name', () => {
  const dir = tabbed(`tabs:\n  - name: Home\n    icon: mdi-home\n    default: true\n  - Watch\n${TABBED}`, '- datetime:\n    tab: [Clock, Home]\n- search: {}\n');
  const { tabs } = readLayout(dir, { ...GROUPS, tabs: ['Found'] });
  assert.deepEqual(tabs, [
    { name: 'Home', icon: 'mdi-home', default: true, listed: true },
    { name: 'Watch', icon: '', default: false, listed: true },
    { name: 'Lab', icon: '', default: false, listed: false },
    { name: 'Found', icon: '', default: false, listed: false },
    { name: 'Clock', icon: '', default: false, listed: false },
  ]);
});

test('writeLayout: the same tabs back write nothing; tabs: only when the tabs need it', () => {
  const dir = tabbed(TABBED);
  saveTabs(dir, (p) => { p.tabs = p.tabs.map(asPage); });
  assert.equal(file(dir), TABBED, 'no tabs: for tabs the groups give in that order');

  saveTabs(dir, (p) => { p.tabs = p.tabs.map(asPage); p.tabs[1].icon = 'mdi-flask'; p.tabs[1].default = true; });
  assert.equal(file(dir), `${TABBED}tabs:\n  - Watch\n  - name: Lab\n    icon: mdi-flask\n    default: true\n`);

  // the order, a new tab no group names yet; the list keeps its comments
  fs.writeFileSync(path.join(dir, 'settings.yaml'), file(dir).replace('  - Watch\n', '  - Watch # films\n'));
  saveTabs(dir, (p) => { p.tabs = [asPage(p.tabs[1]), { name: 'Extra', icon: '', default: false, was: null }, asPage(p.tabs[0])]; });
  assert.equal(file(dir), `${TABBED}tabs:\n  - name: Lab\n    icon: mdi-flask\n    default: true\n  - Extra\n  - Watch # films\n`);

  saveTabs(dir, (p) => { p.tabs = []; p.groups.forEach((g) => { g.tab = ''; }); });
  assert.equal(file(dir), 'layout:\n  Media: {}\n  Infra: {}\n');
});

test('tabs: a rename follows into the groups (the page) and the header widgets; a removed tab leaves them', () => {
  const dir = tabbed(TABBED, '# header\n- datetime:\n    tab: Watch # here\n- search:\n    tab: [Lab, Watch]\n- greeting:\n    text: hi\n    tab: Lab\n');
  saveTabs(dir, (p) => {
    p.tabs = p.tabs.map(asPage);
    p.tabs[0].name = 'Films';
    p.groups.find((g) => g.name === 'Media').tab = 'Films';
    p.tabs = p.tabs.filter((t) => t.name !== 'Lab');
    p.groups.find((g) => g.name === 'Infra').tab = '';
  });
  assert.equal(file(dir), 'layout:\n  Media:\n    tab: Films\n  Infra: {}\n');
  assert.equal(widgetsFile(dir), '# header\n- datetime:\n    tab: Films # here\n- search:\n    tab: Films\n- greeting:\n    text: hi\n');
});

test('checkTabs: names, one default, icons as text', () => {
  assert.match(checkTabs([{ name: ' ' }]).error, /tabs\[0\]\.name/);
  assert.match(checkTabs([{ name: 'A' }, { name: 'A ' }]).error, /twice/);
  assert.match(checkTabs([{ name: 'A', default: true }, { name: 'B', default: true }]).error, /tabs\[1\]\.default/);
  assert.match(checkTabs([{ name: 'A', icon: 3 }]).error, /tabs\[0\]\.icon/);
  assert.match(checkTabs('A').error, /list of tabs/);
  assert.deepEqual(checkTabs([{ name: ' A ', was: 'B' }]).tabs, [{ name: 'A', icon: '', default: false, was: 'B' }]);
});

test('header widgets: their tabs on the form, saved as a name or a list, every tab without', async () => {
  const { readHeader, writeHeader } = await import('../src/settings/widgets.js');
  const dir = tabbed('title: x\n', '- datetime:\n    tab: [A, B]\n- search:\n');
  const read = readHeader(dir);
  assert.deepEqual(read.widgets.map((w) => [w.tabs, w.rest]), [[['A', 'B'], []], [[], []]]);
  assert.equal(writeHeader(dir, read.widgets, read.hash).changed, false);
  read.widgets[0].tabs = [];
  read.widgets[1].tabs = ['B'];
  writeHeader(dir, read.widgets, read.hash);
  assert.equal(widgetsFile(dir), '- datetime: {}\n- search:\n    tab: B\n');
  const again = readHeader(dir);
  again.widgets[0].tabs = ['A', 'C'];
  writeHeader(dir, again.widgets, again.hash);
  assert.equal(widgetsFile(dir), '- datetime:\n    tab: [ A, C ]\n- search:\n    tab: B\n');
  // a widget that declares tab: its own option, not the dashboard's
  const own = (type) => (type === 'search' ? { tab: { type: 'string' } } : {});
  assert.deepEqual(readHeader(dir, own).widgets[1].tabs, []);
});
