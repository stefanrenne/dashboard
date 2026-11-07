// The layout block of settings.yaml on the settings page: per group its style, columns, header,
// folding, equal heights, icon, tab (and iconsOnly for bookmark groups), the settings of nested
// groups, and the order of the groups. A save changes only the keys and entries that changed,
// so the block's form (a map, or homepage's list), its comments and keys the page does not know
// stay as they are. Entries for groups that no longer exist are shown, to be removed.

import YAML from 'yaml';
import { openYaml } from './yaml.js';
import { GROUP_STYLES, MAX_COLUMNS_IN_GROUP, TRISTATE as TRI } from '../config/schema.js';

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

/**
 * The layout as the page edits it. `groups`: { services: [{ name, nested: [names] }],
 * bookmarks: [names] }, the groups the dashboard has now (discovered ones included).
 * Returns { form: 'map' | 'list', groups: [{ name, kind, inFile, ...settings, nested }] } in the
 * page's order: the layout block's, then the groups it does not name.
 */
export function readLayout(configDir, groups) {
  const raw = openYaml(configDir, FILE, { shape: 'map' }).doc.toJS()?.layout;
  const entries = entriesOf(raw);
  const byName = new Map(entries);
  const known = new Map([
    ...groups.services.map((g) => [g.name, { kind: 'services', nested: g.nested ?? [] }]),
    ...groups.bookmarks.map((name) => [name, { kind: 'bookmarks', nested: [] }]),
  ]);
  const names = [...entries.map(([n]) => n), ...[...known.keys()].filter((n) => !byName.has(n))];
  return {
    form: Array.isArray(raw) ? 'list' : 'map',
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
 * Writes the page's layout into settings.yaml. `groups` comes from checkLayout, `known` is what
 * readLayout returns now (for the order the page started from).
 */
export function writeLayout(configDir, groups, known, hash) {
  const yaml = openYaml(configDir, FILE, { shape: 'map', hash });
  const { doc } = yaml;
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
