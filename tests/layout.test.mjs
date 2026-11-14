import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveIcon } from '../src/icons.js';
import { loadConfig } from '../src/config/load.js';
import { buildState } from '../src/layout.js';
import { mergeDiscovered } from '../src/discovery/index.js';

test('icons: names, extensions, Simple Icons, Material Design, selfh.st, colours, local and URLs', () => {
  const base = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons';
  assert.equal(resolveIcon('unraid'), `${base}/png/unraid.png`);
  assert.equal(resolveIcon('plex.svg'), `${base}/svg/plex.svg`);
  assert.equal(resolveIcon('dashboard'), `${base}/png/dashboard.png`, 'Dashboard\'s own icon is on dashboard-icons, nothing built in');
  assert.equal(resolveIcon('dashboard.svg'), `${base}/svg/dashboard.svg`);
  assert.equal(resolveIcon('si-sonos'), 'https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/sonos.svg#dash-mask');
  assert.equal(resolveIcon('si-sonos-#A712A2'), 'https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/sonos.svg#dash-mask=a712a2');
  assert.equal(resolveIcon('mdi-flask-outline'), 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/flask-outline.svg#dash-mask');
  assert.equal(resolveIcon('mdi-flask-outline-#f0d453'), 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/flask-outline.svg#dash-mask=f0d453');
  assert.equal(resolveIcon('sh-plex'), 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/plex.png');
  assert.equal(resolveIcon('sh-plex.svg'), 'https://cdn.jsdelivr.net/gh/selfhst/icons/svg/plex.svg');
  assert.equal(resolveIcon('/icons/x.png'), '/icons/x.png');
  assert.equal(resolveIcon('https://a/b.png'), 'https://a/b.png');
  assert.equal(resolveIcon('Not An Icon!'), null);
  assert.equal(resolveIcon(undefined), null);
});

// ---------------------------------------------------------------- tabs
function tabState(files, found = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hd-tabs-'));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
  const config = loadConfig(dir);
  const widget = (id) => [id, { id, manifest: { options: id === 'own-tab' ? { tab: { type: 'string' } } : {}, refreshMs: 30000, apiVersion: 1, version: '1.0.0', name: id }, i18n: {}, source: 'test' }];
  const registry = new Map([widget('datetime'), widget('own-tab')]);
  const { groups } = mergeDiscovered(config.services, found);
  return buildState({ config, registry, groups });
}

test('tabs: settings.yaml tabs first (icon, default), then the tabs groups name, then discovered ones', () => {
  const { layout } = tabState({
    'settings.yaml': 'tabs:\n  - Home\n  - name: Media\n    icon: mdi-play\n    default: true\n  - Empty\nlayout:\n  Infra:\n    tab: Lab\n  Plex:\n    tab: Media\n',
    'services.yaml': '- Infra:\n    - Router: { href: http://router.lan }\n- Plex:\n    - Plex: { href: http://plex.lan }\n',
  }, [{ group: 'Found', name: 'Sonarr', def: {}, weight: 0, origin: 'docker:local', tab: 'Discovered' }]);
  assert.deepEqual(layout.tabs.map((t) => [t.name, t.default ?? false]), [['Home', false], ['Media', true], ['Empty', false], ['Lab', false], ['Discovered', false]]);
  assert.equal(layout.tabs[1].icon, resolveIcon('mdi-play'));
  assert.equal(layout.tabs[0].icon, null);
  assert.equal(layout.groups.find((g) => g.name === 'Found').layout.tab, 'Discovered', 'the label names the group\'s tab');
  assert.deepEqual(layout.messages.warnings, []);
});

test('tabs: the layout block wins over a discovered label', () => {
  const { layout } = tabState({ 'settings.yaml': 'layout:\n  Media:\n    tab: Home\n' }, [
    { group: 'Media', name: 'Plex', def: {}, weight: 0, origin: 'docker:local', tab: 'Elsewhere' },
  ]);
  assert.equal(layout.groups[0].layout.tab, 'Home');
  assert.deepEqual(layout.tabs.map((t) => t.name), ['Home']);
});

test('tabs: a header widget\'s tab (a name or a list), unknown tabs are warnings, a declared option stays the widget\'s', () => {
  const { layout, instances } = tabState({
    'settings.yaml': 'tabs: [Home, Media]\n',
    'widgets.yaml': '- datetime:\n    tab: Media\n- datetime:\n    tab: [Home, Media, Nope]\n- datetime:\n    tab: Nope\n- datetime: {}\n- own-tab:\n    tab: Home\n- datetime:\n    tab: { a: 1 }\n',
  });
  assert.deepEqual(layout.header.map((h) => h.tabs ?? null), [['Media'], ['Home', 'Media'], null, null, null, null]);
  assert.ok(!('tab' in instances.get(layout.header[0].instanceId).options), 'not an option of the widget');
  assert.equal(layout.header[4].options.tab, 'Home', 'a widget that declares tab gets it');
  assert.deepEqual(layout.messages.warnings.map((w) => [w.path, w.message]), [
    ['[1].datetime.tab', 'no tab "Nope" in settings.yaml tabs or a group\'s tab'],
    ['[2].datetime.tab', 'no tab "Nope" in settings.yaml tabs or a group\'s tab; the widget is on every tab'],
    ['[5].datetime.tab', 'expected a tab name or a list of them; the widget is on every tab'],
  ]);
});
