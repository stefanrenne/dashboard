// A config file that is a list of groups, `- Group: [ … ]`, as the settings page edits it:
// services.yaml (services, and groups in groups) and bookmarks.yaml (bookmarks). Each entry
// carries the id of its YAML node (its path of list positions, "0/2/1"); the page sends the tree
// back edited (renamed, moved, added, removed) and the save rebuilds the lists from those nodes,
// so every entry keeps its comments and keys the page does not show. An `!include` stays one
// block that can be moved, never inlined. What a leaf is, is up to `leaf`:
//   leaf.kind                       'service' or 'bookmark'
//   leaf.read(pair)                 the leaf's own fields for the page, or null when it is no leaf
//   leaf.write(doc, pair, item, at) sets the page's fields; returns warnings
//   leaf.create(doc, name)          a new entry's node
// `nested`: whether a group may hold groups.

import YAML from 'yaml';
import { ConfigEditError } from '../config/edit.js';
import { openYaml, entries, isInclude, single, keyName, rename, setItems } from './yaml.js';

function walk(doc, leaf, nested) {
  const nodes = new Map();
  const other = (node, id) => ({ kind: 'other', id, text: String(node).trim() });
  const group = (pair, id) => (isInclude(pair.value)
    ? { kind: 'group', id, name: keyName(pair), include: String(pair.value.value), items: [] }
    : { kind: 'group', id, name: keyName(pair), items: (YAML.isSeq(pair.value) ? pair.value.items : []).map((n, i) => entry(n, `${id}/${i}`)) });
  const entry = (node, id) => {
    nodes.set(id, node);
    if (isInclude(node)) return { kind: 'include', id, file: String(node.value) };
    const pair = single(node);
    if (!pair) return other(node, id);
    const own = leaf.read(pair);
    if (own) return { kind: leaf.kind, id, name: keyName(pair), ...own };
    return nested && YAML.isSeq(pair.value) ? group(pair, id) : other(node, id);
  };
  const top = (node, id) => {
    nodes.set(id, node);
    if (isInclude(node)) return { kind: 'include', id, file: String(node.value) };
    const pair = single(node);
    return pair ? group(pair, id) : other(node, id);
  };
  return { nodes, items: doc.contents.items.map((n, i) => top(n, String(i))) };
}

/** The tree of `file`: { hash, items: [group | include | other] }. */
export function readTree(configDir, file, leaf, { nested = false } = {}) {
  const { doc, hash } = openYaml(configDir, file, { shape: 'seq' });
  return { hash, items: walk(doc, leaf, nested).items };
}

function checkName(name, at) {
  if (typeof name !== 'string' || !name.trim() || name.length > 200) throw new ConfigEditError(`${at}: a name of at most 200 characters is needed`, 400);
  return name.trim();
}

/**
 * Writes the page's tree into `file`. `hash` is the one readTree gave: a file changed since is
 * refused (409). The save is checked as loadConfig loads it (400 with the errors).
 */
export function writeTree(configDir, file, items, hash, leaf, { nested = false, opts = {} } = {}) {
  if (!Array.isArray(items)) throw new ConfigEditError('expected the list of groups', 400);
  const yaml = openYaml(configDir, file, { shape: 'seq', hash });
  const { doc } = yaml;
  const own = entries(walk(doc, leaf, nested).nodes);
  const warnings = [];
  const kept = (it, at) => {
    const node = own.take(it.id, at);
    if (!node) throw new ConfigEditError(`${at}: an include cannot be made here; add it as text`, 400);
    return node;
  };
  const group = (it, at, inGroup) => {
    if (inGroup && !nested) throw new ConfigEditError(`${at}: a group cannot hold groups here`, 400);
    if (!Array.isArray(it.items) && !it.include) throw new ConfigEditError(`${at}: expected the group's items`, 400);
    const name = checkName(it.name, at);
    const node = own.take(it.id, at) ?? doc.createNode({ [name]: [] });
    const pair = single(node);
    if (!pair) throw new ConfigEditError(`${at}: not a group`, 400);
    rename(doc, pair, name);
    if (isInclude(pair.value)) return node; // its entries are in the included file
    if (!YAML.isSeq(pair.value)) pair.value = doc.createNode([]);
    pair.value.items = it.items.map((child, i) => entry(child, `${at}.${name}[${i}]`));
    return node;
  };
  const entry = (it, at) => {
    if (!it || typeof it !== 'object') throw new ConfigEditError(`${at}: expected an entry`, 400);
    if (it.kind === 'include' || it.kind === 'other') return kept(it, at);
    if (it.kind === 'group') return group(it, at, true);
    if (it.kind !== leaf.kind) throw new ConfigEditError(`${at}: unknown kind of entry`, 400);
    const name = checkName(it.name, at);
    const node = own.take(it.id, at) ?? leaf.create(doc, name);
    const pair = single(node);
    if (!pair) throw new ConfigEditError(`${at}: not a ${leaf.kind}`, 400);
    rename(doc, pair, name);
    warnings.push(...leaf.write(doc, pair, it, `${at}.${name}`));
    return node;
  };
  setItems(doc.contents, items.map((it, i) => {
    const at = `[${i}]`;
    if (it?.kind === 'include' || it?.kind === 'other') return kept(it, at);
    if (it?.kind !== 'group') throw new ConfigEditError(`${at}: a ${leaf.kind} belongs in a group`, 400);
    return group(it, at, false);
  }));
  return yaml.save({ opts, warnings });
}
