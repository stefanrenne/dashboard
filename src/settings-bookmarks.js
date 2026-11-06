// bookmarks.yaml on the settings page, as a tree of groups and bookmarks with the ids of their
// YAML nodes (as src/settings-services.js does for services.yaml). A save rebuilds the lists from
// those nodes, so comments and keys the page does not show stay; only changed fields are written.
// A bookmark is homepage's one-item list (`- GitHub: [ { href } ]`) or a plain map; new ones get
// homepage's form. An `!include` stays one block.

import YAML from 'yaml';
import { readConfigFile, parseDocument, documentText, writeConfigFile, ConfigEditError } from './config/edit.js';

const FILE = 'bookmarks.yaml';
export const BOOKMARK_FIELDS = ['href', 'abbr', 'icon', 'description'];

const isInclude = (node) => YAML.isScalar(node) && node.tag === '!include';
const single = (node) => (YAML.isMap(node) && node.items.length === 1 ? node.items[0] : null);
const keyName = (pair) => String(YAML.isScalar(pair.key) ? pair.key.value : pair.key);

function readDoc(text) {
  const doc = parseDocument(text, FILE);
  if (doc.contents !== null && !YAML.isSeq(doc.contents)) throw new ConfigEditError('bookmarks.yaml: expected a list of groups; edit it as text', 400);
  return doc;
}

/** The map that holds a bookmark's fields: the first item of homepage's list, or the map itself. */
function bodyOf(value) {
  if (YAML.isSeq(value) && YAML.isMap(value.items[0])) return value.items[0];
  return YAML.isMap(value) ? value : null;
}

function walk(doc) {
  const nodes = new Map();
  const bookmark = (node, id) => {
    nodes.set(id, node);
    if (isInclude(node)) return { kind: 'include', id, file: String(node.value) };
    const pair = single(node);
    const body = pair ? bodyOf(pair.value) : null;
    if (!pair || (!body && pair.value !== null)) return { kind: 'other', id, text: String(node).trim() };
    const o = body ? body.toJSON() : {};
    return { kind: 'bookmark', id, name: keyName(pair), fields: Object.fromEntries(BOOKMARK_FIELDS.map((k) => [k, o[k] === undefined || o[k] === null ? '' : String(o[k])])), other: Object.keys(o).filter((k) => !BOOKMARK_FIELDS.includes(k)) };
  };
  const group = (node, id) => {
    nodes.set(id, node);
    if (isInclude(node)) return { kind: 'include', id, file: String(node.value) };
    const pair = single(node);
    if (!pair) return { kind: 'other', id, text: String(node).trim() };
    if (isInclude(pair.value)) return { kind: 'group', id, name: keyName(pair), include: String(pair.value.value), items: [] };
    const items = YAML.isSeq(pair.value) ? pair.value.items : [];
    return { kind: 'group', id, name: keyName(pair), items: items.map((n, i) => bookmark(n, `${id}/${i}`)) };
  };
  const root = YAML.isSeq(doc.contents) ? doc.contents.items : [];
  return { nodes, items: root.map((n, i) => group(n, String(i))) };
}

/** The tree of bookmarks.yaml: { hash, items }. */
export function readBookmarks(configDir) {
  const read = readConfigFile(configDir, FILE);
  return { hash: read.hash, items: walk(readDoc(read.text)).items };
}

/** Writes the page's tree into bookmarks.yaml; `hash` from readBookmarks (409 when it changed). */
export function writeBookmarks(configDir, items, hash, opts = {}) {
  if (!Array.isArray(items)) throw new ConfigEditError('expected the list of groups', 400);
  const read = readConfigFile(configDir, FILE);
  if (hash !== read.hash) throw new ConfigEditError('bookmarks.yaml changed since it was opened: reload it and make your change again', 409);
  const doc = readDoc(read.text);
  const { nodes } = walk(doc);
  const used = new Set();
  const own = (id, at) => {
    if (id === null || id === undefined) return null;
    const node = nodes.get(String(id));
    if (!node) throw new ConfigEditError(`${at}: no such entry any more; reload the page`, 409);
    if (used.has(String(id))) throw new ConfigEditError(`${at}: the same entry twice`, 400);
    used.add(String(id));
    return node;
  };
  const name = (v, at) => {
    if (typeof v !== 'string' || !v.trim() || v.length > 200) throw new ConfigEditError(`${at}: a name of at most 200 characters is needed`, 400);
    return v.trim();
  };
  const rename = (pair, to) => {
    if (keyName(pair) !== to) pair.key = YAML.isScalar(pair.key) ? Object.assign(pair.key, { value: to }) : doc.createNode(to);
  };
  const kept = (it, at) => {
    const node = own(it.id, at);
    if (!node) throw new ConfigEditError(`${at}: an include cannot be made here; add it as text`, 400);
    return node;
  };
  const bookmark = (it, at) => {
    if (it?.kind === 'include' || it?.kind === 'other') return kept(it, at);
    if (it?.kind !== 'bookmark') throw new ConfigEditError(`${at}: expected a bookmark`, 400);
    const n = name(it.name, at);
    const node = own(it.id, at) ?? doc.createNode({ [n]: [{}] });
    const pair = single(node);
    if (!pair) throw new ConfigEditError(`${at}: not a bookmark`, 400);
    rename(pair, n);
    if (!bodyOf(pair.value)) pair.value = doc.createNode([{}]);
    const body = bodyOf(pair.value);
    for (const k of BOOKMARK_FIELDS) {
      const v = it.fields?.[k];
      if (v === undefined) continue;
      if (typeof v !== 'string' || v.length > 2000) throw new ConfigEditError(`${at}.${n}.${k}: text of at most 2000 characters`, 400);
      const text = v.trim();
      if (text === '') {
        if (body.has(k)) body.delete(k);
      } else if (String(body.get(k) ?? '') !== text) body.set(k, text);
    }
    return node;
  };
  const group = (it, at) => {
    if (it?.kind === 'include' || it?.kind === 'other') return kept(it, at);
    if (it?.kind !== 'group') throw new ConfigEditError(`${at}: a bookmark belongs in a group`, 400);
    const n = name(it.name, at);
    const node = own(it.id, at) ?? doc.createNode({ [n]: [] });
    const pair = single(node);
    if (!pair) throw new ConfigEditError(`${at}: not a group`, 400);
    rename(pair, n);
    if (isInclude(pair.value)) return node;
    if (!Array.isArray(it.items)) throw new ConfigEditError(`${at}: expected the group's bookmarks`, 400);
    if (!YAML.isSeq(pair.value)) pair.value = doc.createNode([]);
    pair.value.items = it.items.map((b, i) => bookmark(b, `${at}.${n}[${i}]`));
    return node;
  };
  const out = items.map((g, i) => group(g, `[${i}]`));
  if (!YAML.isSeq(doc.contents)) doc.contents = doc.createNode([]);
  const first = doc.contents.items[0];
  if (first?.commentBefore && out[0] && out[0] !== first) {
    out[0].commentBefore = [first.commentBefore, out[0].commentBefore].filter(Boolean).join('\n');
    first.commentBefore = undefined;
  }
  doc.contents.items = out;
  const text = documentText(doc);
  if (text === documentText(readDoc(read.text))) return { hash: read.hash, warnings: [], changed: false };
  return writeConfigFile(configDir, FILE, text, { hash, opts });
}
