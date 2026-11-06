// The layout block of settings.yaml on the settings page: per group its style, columns, header,
// folding, equal heights, icon, tab (and iconsOnly for bookmark groups), the settings of nested
// groups, and the order of the groups. A save changes only the keys and entries that changed,
// so the block's form (a map, or homepage's list), its comments and keys the page does not know
// stay as they are. Entries for groups that no longer exist are shown, to be removed.

import YAML from 'yaml';
import { readConfigFile, parseDocument, documentText, writeConfigFile } from './config/edit.js';

const FILE = 'settings.yaml';
const TRI = ['', 'true', 'false'];
// [key, default] of a group's own settings, as the page has them
const KEYS = [['style', ''], ['columns', ''], ['header', true], ['initiallyCollapsed', ''], ['useEqualHeights', ''], ['iconsOnly', ''], ['icon', ''], ['tab', '']];
const TRISTATES = new Set(['initiallyCollapsed', 'useEqualHeights', 'iconsOnly']);
const isMap = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function readDoc(configDir) {
  const doc = parseDocument(readConfigFile(configDir, FILE).text, FILE);
  if (doc.contents === null) doc.contents = doc.createNode({});
  if (!YAML.isMap(doc.contents)) throw new Error('settings.yaml: expected a map');
  return doc;
}

/** The layout block's entries in their order: [[name, value]], for the map and the list form. */
function entriesOf(raw) {
  if (Array.isArray(raw)) {
    return raw.flatMap((e) => (typeof e === 'string' ? [[e, null]] : isMap(e) && Object.keys(e).length === 1 ? [Object.entries(e)[0]] : []));
  }
  return isMap(raw) ? Object.entries(raw) : [];
}

/** A group's settings as the form shows them. */
function formOf(v, nested = false) {
  const o = isMap(v) ? v : {};
  const tri = (x) => (typeof x === 'boolean' ? String(x) : '');
  const out = {
    style: ['row', 'column'].includes(o.style) ? o.style : '',
    columns: Number.isInteger(Number(o.columns)) && o.columns !== null && o.columns !== undefined && o.columns !== '' ? String(Number(o.columns)) : '',
    header: o.header !== false,
    initiallyCollapsed: tri(o.initiallyCollapsed),
    useEqualHeights: tri(o.useEqualHeights),
    iconsOnly: tri(o.iconsOnly),
    icon: typeof o.icon === 'string' ? o.icon : '',
    tab: typeof o.tab === 'string' ? o.tab : '',
  };
  if (nested) delete out.tab;
  return out;
}

/**
 * The layout as the page edits it. `groups`: { services: [{ name, nested: [names] }],
 * bookmarks: [names] }, the groups the dashboard has now (discovered ones included).
 * Returns { form: 'map' | 'list', groups: [{ name, kind, inFile, ...settings, nested }] } in the
 * page's order: the layout block's, then the groups it does not name.
 */
export function readLayout(configDir, groups) {
  const raw = readDoc(configDir).toJS()?.layout;
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
  if (!['', 'row', 'column'].includes(g.style ?? '')) return `${at}.style: row, column or empty`;
  const cols = String(g.columns ?? '').trim();
  if (cols !== '' && !(Number.isInteger(Number(cols)) && Number(cols) >= 1 && Number(cols) <= 12)) return `${at}.columns: a whole number from 1 to 12, or empty`;
  if (typeof (g.header ?? true) !== 'boolean') return `${at}.header: true or false`;
  for (const k of TRISTATES) if (!TRI.includes(g[k] ?? '')) return `${at}.${k}: empty, true or false`;
  for (const k of nested ? ['icon'] : ['icon', 'tab']) if (typeof (g[k] ?? '') !== 'string' || (g[k] ?? '').length > 200) return `${at}.${k}: text of at most 200 characters`;
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
    const clean = (x, isNested) => ({
      name: x.name, style: x.style ?? '', columns: String(x.columns ?? '').trim(), header: x.header ?? true,
      initiallyCollapsed: x.initiallyCollapsed ?? '', useEqualHeights: x.useEqualHeights ?? '', iconsOnly: x.iconsOnly ?? '',
      icon: (x.icon ?? '').trim(), ...(isNested ? {} : { tab: (x.tab ?? '').trim() }),
    });
    out.push({ ...clean(g, false), remove: g.remove === true, nested: nested.map((n) => clean(n, true)) });
  }
  return { groups: out };
}

/** The value a key gets in the file, or undefined to leave it out. */
function fileValue(key, v) {
  if (key === 'header') return v === false ? false : undefined;
  if (TRISTATES.has(key)) return v === '' ? undefined : v === 'true';
  if (key === 'columns') return v === '' ? undefined : Number(v);
  return v === '' ? undefined : v;
}

/** Sets a group's keys in `map` (a YAML map node); returns whether anything differs from before. */
function applyKeys(doc, map, g, keys) {
  for (const [key] of keys) {
    if (!(key in g)) continue;
    const value = fileValue(key, g[key]);
    const current = map.get(key);
    if (value === undefined) {
      if (map.has(key)) map.delete(key);
    } else if (current !== value) map.set(key, value);
  }
}

const hasSettings = (g, keys) => keys.some(([key]) => key in g && fileValue(key, g[key]) !== undefined);

/**
 * Writes the page's layout into settings.yaml. `groups` comes from checkLayout, `known` is what
 * readLayout returns now (for the order the page started from).
 */
export function writeLayout(configDir, groups, known) {
  const doc = readDoc(configDir);
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
  // a group's settings map, made when needed
  const settingsOf = (entry) => {
    if (list && !entry.pair) {
      const item = doc.createNode({ [entry.name]: {} });
      node.items[node.items.indexOf(entry.item)] = item;
      return item.items[0].value;
    }
    if (!YAML.isMap(entry.pair.value)) entry.pair.value = doc.createNode({});
    return entry.pair.value;
  };

  const ownKeys = KEYS;
  const nestedKeys = KEYS.filter(([k]) => k !== 'tab');
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
  const text = documentText(doc);
  if (text !== documentText(readDoc(configDir))) writeConfigFile(configDir, FILE, text, { check: false });
}
