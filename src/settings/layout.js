// The layout block of settings.yaml on the settings page: per group its style, columns, header,
// folding, equal heights, icon, tab (and iconsOnly for bookmark groups), the settings of nested
// groups, and the order of the groups. A save changes only the keys and entries that changed,
// so the block's form (a map, or homepage's list), its comments and keys the page does not know
// stay as they are. Entries for groups that no longer exist are shown, to be removed.
//
// The tabs too: settings.yaml `tabs:` (order, icon, the tab that opens first) with the tabs the
// groups and header widgets name. `tabs:` is written only when the page's tabs need it.

import YAML from 'yaml';
import { openYaml } from './yaml.js';
import { GROUP_STYLES, MAX_COLUMNS_IN_GROUP, TRISTATE as TRI } from '../config/schema.js';
import { headerTabNames } from './widgets.js';

const FILE = 'settings.yaml';
// The kinds of a group's settings: read (the file's value as the page has it), check (the page's
// value: null or what is wrong), clean (the page's value as saved) and file (what the file gets;
// undefined leaves the key out).
const KIND = {
  style: {
    read: (x) => (GROUP_STYLES.includes(x) ? x : ''),
    check: (v) => (['', ...GROUP_STYLES].includes(v ?? '') ? null : `${GROUP_STYLES.join(', ')} or empty`),
    clean: (v) => v ?? '',
    file: (v) => (v === '' ? undefined : v),
  },
  columns: {
    read: (x) => (x !== null && x !== undefined && x !== '' && Number.isInteger(Number(x)) ? String(Number(x)) : ''),
    check: (v) => {
      const c = String(v ?? '').trim();
      return c === '' || (Number.isInteger(Number(c)) && Number(c) >= 1 && Number(c) <= MAX_COLUMNS_IN_GROUP) ? null : `a whole number from 1 to ${MAX_COLUMNS_IN_GROUP}, or empty`;
    },
    clean: (v) => String(v ?? '').trim(),
    file: (v) => (v === '' ? undefined : Number(v)),
  },
  // on unless set to false
  on: {
    read: (x) => x !== false,
    check: (v) => (typeof (v ?? true) === 'boolean' ? null : 'true or false'),
    clean: (v) => v ?? true,
    file: (v) => (v === false ? false : undefined),
  },
  tristate: {
    read: (x) => (typeof x === 'boolean' ? String(x) : ''),
    check: (v) => (TRI.includes(v ?? '') ? null : 'empty, true or false'),
    clean: (v) => v ?? '',
    file: (v) => (v === '' ? undefined : v === 'true'),
  },
  text: {
    read: (x) => (typeof x === 'string' ? x : ''),
    check: (v) => (typeof (v ?? '') === 'string' && (v ?? '').length <= 200 ? null : 'text of at most 200 characters'),
    clean: (v) => (v ?? '').trim(),
    file: (v) => (v === '' ? undefined : v),
  },
};
// a group's own settings and their kind; a nested group has no tab
const KEYS = { style: 'style', columns: 'columns', header: 'on', initiallyCollapsed: 'tristate', useEqualHeights: 'tristate', iconsOnly: 'tristate', icon: 'text', tab: 'text' };
const keysOf = (nested) => Object.keys(KEYS).filter((k) => !(nested && k === 'tab'));
const kind = (key) => KIND[KEYS[key]];
const isMap = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);


/** The layout block's entries in their order: [[name, value]], for the map and the list form. */
function entriesOf(raw) {
  if (Array.isArray(raw)) {
    return raw.flatMap((e) => (typeof e === 'string' ? [[e, null]] : isMap(e) && Object.keys(e).length === 1 ? [Object.entries(e)[0]] : []));
  }
  return isMap(raw) ? Object.entries(raw) : [];
}

function formOf(v, nested = false) {
  const o = isMap(v) ? v : {};
  return Object.fromEntries(keysOf(nested).map((k) => [k, kind(k).read(o[k])]));
}

const MAX_TAB = 100;
const tabName = (x) => (typeof x === 'string' || typeof x === 'number' ? String(x).trim() : '');

/** settings.yaml `tabs:` as the page has them: [{ name, icon, default }]. */
function listedTabs(raw) {
  const out = [];
  for (const entry of Array.isArray(raw) ? raw : []) {
    const name = tabName(isMap(entry) ? entry.name : entry);
    if (!name || out.some((t) => t.name === name)) continue;
    out.push({ name, icon: isMap(entry) && typeof entry.icon === 'string' ? entry.icon : '', default: isMap(entry) && entry.default === true && !out.some((t) => t.default) });
  }
  return out;
}

/**
 * The layout as the page edits it. `groups`: { services: [{ name, nested: [names] }],
 * bookmarks: [names], tabs: [names] }, the groups and tabs the dashboard has now (discovered
 * ones included). Returns { form: 'map' | 'list', groups: [{ name, kind, inFile, ...settings,
 * nested }], tabs: [{ name, icon, default, listed }] }. Groups in the page's order: the layout
 * block's, then the groups it does not name. Tabs: `tabs:`, then those the groups, the
 * dashboard and the header widgets name.
 */
export function readLayout(configDir, groups) {
  const settings = openYaml(configDir, FILE, { shape: 'map' }).doc.toJS();
  const raw = settings?.layout;
  const entries = entriesOf(raw);
  const byName = new Map(entries);
  const known = new Map([
    ...groups.services.map((g) => [g.name, { kind: 'services', nested: g.nested ?? [] }]),
    ...groups.bookmarks.map((name) => [name, { kind: 'bookmarks', nested: [] }]),
  ]);
  const names = [...entries.map(([n]) => n), ...[...known.keys()].filter((n) => !byName.has(n))];
  const listed = listedTabs(settings?.tabs);
  const named = [...entries.map(([, v]) => tabName(isMap(v) ? v.tab : null)), ...(groups.tabs ?? []).map(tabName), ...headerTabNames(configDir)].filter(Boolean);
  return {
    form: Array.isArray(raw) ? 'list' : 'map',
    tabs: [...listed.map((t) => ({ ...t, listed: true })), ...[...new Set(named)].filter((n) => !listed.some((t) => t.name === n)).map((name) => ({ name, icon: '', default: false, listed: false }))],
    groups: [...new Set(names)].map((name) => {
      const value = byName.get(name);
      const info = known.get(name);
      const nestedNames = [...new Set([...(info?.nested ?? []), ...Object.keys(isMap(value) ? value : {}).filter((k) => isMap(value[k]))])];
      return {
        name,
        kind: info?.kind ?? null, // null: no such group any more
        inFile: byName.has(name),
        ...formOf(value),
        nested: nestedNames.map((n) => ({ name: n, ...formOf(isMap(value) ? value[n] : null, true) })),
      };
    }),
  };
}

function checkGroup(g, at, nested) {
  if (!isMap(g) || typeof g.name !== 'string' || !g.name) return `${at}: expected a group with a name`;
  for (const k of keysOf(nested)) {
    const wrong = kind(k).check(g[k]);
    if (wrong) return `${at}.${k}: ${wrong}`;
  }
  return null;
}

/**
 * Checks the page's tabs ([{ name, icon, default, was }]; `was`: the name it was read with, null
 * for a new tab): { tabs } cleaned up, or { error }.
 */
export function checkTabs(input) {
  if (!Array.isArray(input) || input.length > 50) return { error: 'expected the list of tabs' };
  const out = [];
  for (const [i, t] of input.entries()) {
    const at = `tabs[${i}]`;
    const name = typeof t?.name === 'string' ? t.name.trim() : '';
    if (!name || name.length > MAX_TAB) return { error: `${at}.name: a name of at most ${MAX_TAB} characters` };
    if (out.some((x) => x.name === name)) return { error: `${at}.name: "${name}" is there twice` };
    if (typeof (t.icon ?? '') !== 'string' || (t.icon ?? '').length > 200) return { error: `${at}.icon: text of at most 200 characters` };
    if (typeof (t.default ?? false) !== 'boolean') return { error: `${at}.default: true or false` };
    if (t.default && out.some((x) => x.default)) return { error: `${at}.default: one tab opens first` };
    const was = typeof t.was === 'string' && t.was ? t.was : null;
    if (was && out.some((x) => x.was === was)) return { error: `${at}: the same tab twice` };
    out.push({ name, icon: (t.icon ?? '').trim(), default: t.default === true, was });
  }
  return { tabs: out };
}

/**
 * What the tabs' save changes for the header widgets: { old name: new name, or null when the tab
 * is gone }. `known` is readLayout's tabs.
 */
export function tabChanges(tabs, known) {
  const changes = {};
  for (const t of tabs) if (t.was && t.was !== t.name) changes[t.was] = t.name;
  for (const k of known) if (!tabs.some((t) => t.was === k.name)) changes[k.name] = null;
  return changes;
}

/** Checks the page's layout: { groups } cleaned up, or { error }. */
export function checkLayout(input) {
  if (!Array.isArray(input) || input.length > 300) return { error: 'expected the list of groups' };
  const out = [];
  for (const [i, g] of input.entries()) {
    const error = checkGroup(g, `layout[${i}]`, false);
    if (error) return { error };
    const nested = Array.isArray(g.nested) ? g.nested : [];
    for (const [j, n] of nested.entries()) {
      const nestedError = checkGroup(n, `layout[${i}].nested[${j}]`, true);
      if (nestedError) return { error: nestedError };
    }
    const clean = (x, isNested) => ({ name: x.name, ...Object.fromEntries(keysOf(isNested).map((k) => [k, kind(k).clean(x[k])])) });
    out.push({ ...clean(g, false), remove: g.remove === true, nested: nested.map((n) => clean(n, true)) });
  }
  return { groups: out };
}

function applyKeys(doc, map, g, keys) {
  for (const key of keys) {
    if (!(key in g)) continue;
    const value = kind(key).file(g[key]);
    const current = map.get(key);
    if (value === undefined) {
      if (map.has(key)) map.delete(key);
    } else if (current !== value) map.set(key, value);
  }
}

const hasSettings = (g, keys) => keys.some((key) => key in g && kind(key).file(g[key]) !== undefined);

/**
 * settings.yaml `tabs:` from the page's tabs (checkTabs), when they need it: the file has the list
 * already, a tab has an icon or opens first, a tab no group names, or an order the groups'
 * would not give. Each tab keeps its node (comments); a plain tab is just its name.
 */
function applyTabs(doc, tabs, groups) {
  let node = doc.get('tabs', true);
  const plain = (t) => !t.icon && !t.default;
  const byGroups = [...new Set(groups.filter((g) => !g.remove).map((g) => g.tab).filter(Boolean))];
  const needed = YAML.isSeq(node) || !tabs.every(plain) || tabs.map((t) => t.name).join('\u0000') !== byGroups.join('\u0000');
  if (!needed) return;
  if (tabs.length === 0) {
    doc.delete('tabs');
    return;
  }
  const old = YAML.isSeq(node) ? node.items : [];
  const nameOf = (item) => tabName(YAML.isMap(item) ? item.get('name') : YAML.isScalar(item) ? item.value : null);
  const items = tabs.map((t) => {
    const item = old.find((x) => t.was && nameOf(x) === t.was);
    if (plain(t) && !YAML.isMap(item)) return YAML.isScalar(item) ? Object.assign(item, { value: t.name }) : doc.createNode(t.name);
    const map = YAML.isMap(item) ? item : doc.createNode({ name: t.name });
    if (YAML.isScalar(item) && item.commentBefore) map.commentBefore = item.commentBefore;
    if (map.get('name') !== t.name) map.set('name', t.name);
    if (t.icon) { if (map.get('icon') !== t.icon) map.set('icon', t.icon); } else map.delete('icon');
    if (t.default) { if (map.get('default') !== true) map.set('default', true); } else map.delete('default');
    return map;
  });
  if (!YAML.isSeq(node)) {
    node = doc.createNode([]);
    doc.set('tabs', node);
  }
  node.items = items;
}

/**
 * Writes the page's layout into settings.yaml. `groups` comes from checkLayout, `known` is what
 * readLayout returns now (for the order the page started from), `tabs` from checkTabs (or
 * undefined: `tabs:` stays as it is).
 */
export function writeLayout(configDir, groups, known, hash, tabs) {
  const yaml = openYaml(configDir, FILE, { shape: 'map', hash });
  const { doc } = yaml;
  if (tabs) {
    const same = JSON.stringify(tabs.map(({ name, icon, default: d }) => [name, icon, d])) === JSON.stringify(known.tabs.map(({ name, icon, default: d }) => [name, icon, d]));
    if (!same) applyTabs(doc, tabs, groups);
  }
  let node = doc.get('layout', true);
  if (!YAML.isMap(node) && !YAML.isSeq(node)) {
    node = doc.createNode({});
    doc.set('layout', node);
  }
  const list = YAML.isSeq(node);
  // the entries: { name, pair (the key and the value node), item (the list item, list form) }
  const entries = () => (list
    ? node.items.flatMap((item) => (YAML.isMap(item) && item.items.length === 1 ? [{ name: String(item.items[0].key?.value ?? item.items[0].key), pair: item.items[0], item }] : YAML.isScalar(item) ? [{ name: String(item.value), pair: null, item }] : []))
    : node.items.map((pair) => ({ name: String(YAML.isScalar(pair.key) ? pair.key.value : pair.key), pair, item: pair })));
  const find = (name) => entries().find((e) => e.name === name);
  const add = (name) => {
    // `Name: {}`: in the block for the order, nothing set
    if (list) node.items.push(doc.createNode({ [name]: {} }));
    else node.set(name, doc.createNode({}));
    return find(name);
  };
  const settingsOf = (entry) => {
    if (list && !entry.pair) {
      const item = doc.createNode({ [entry.name]: {} });
      node.items[node.items.indexOf(entry.item)] = item;
      return item.items[0].value;
    }
    if (!YAML.isMap(entry.pair.value)) entry.pair.value = doc.createNode({});
    return entry.pair.value;
  };

  const ownKeys = keysOf(false);
  const nestedKeys = keysOf(true);
  const order = groups.map((g) => g.name);
  const reordered = order.join('\u0000') !== known.groups.map((g) => g.name).filter((n) => order.includes(n)).join('\u0000');

  for (const g of groups) {
    let entry = find(g.name);
    if (g.remove) {
      if (entry) node.items.splice(node.items.indexOf(entry.item), 1);
      continue;
    }
    const needed = reordered || hasSettings(g, ownKeys) || g.nested.some((n) => hasSettings(n, nestedKeys));
    if (!entry && !needed) continue;
    entry ??= add(g.name);
    if (hasSettings(g, ownKeys) || (entry.pair && YAML.isMap(entry.pair.value))) applyKeys(doc, settingsOf(entry), g, ownKeys);
    for (const n of g.nested) {
      const parent = entry.pair && YAML.isMap(entry.pair.value) ? entry.pair.value : null;
      const own = parent?.get(n.name, true);
      if (!YAML.isMap(own) && !hasSettings(n, nestedKeys)) continue;
      const map = settingsOf(find(g.name));
      if (!YAML.isMap(map.get(n.name, true))) map.set(n.name, doc.createNode({}));
      const nestedMap = map.get(n.name, true);
      applyKeys(doc, nestedMap, n, nestedKeys);
      if (nestedMap.items.length === 0) map.delete(n.name);
    }
  }
  if (reordered) {
    const all = entries();
    const ranked = order.map((name) => all.find((e) => e.name === name)?.item).filter(Boolean);
    node.items = [...ranked, ...node.items.filter((item) => !ranked.includes(item))];
  }
  if (node.items.length === 0) doc.delete('layout');
  return yaml.save();
}
