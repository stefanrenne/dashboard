// bookmarks.yaml on the settings page: a tree (tree.js) whose leaves are bookmarks. A bookmark is
// homepage's one-item list (`- GitHub: [ { href } ]`) or a plain map; new ones get homepage's form.

import YAML from 'yaml';
import { ConfigEditError } from '../config/edit.js';
import { BOOKMARK_FIELDS as FIELDS } from '../config/schema.js';
import { readTree, writeTree } from './tree.js';

const FILE = 'bookmarks.yaml';

/** The map that holds a bookmark's fields: the first item of homepage's list, or the map itself. */
function bodyOf(value) {
  if (YAML.isSeq(value) && YAML.isMap(value.items[0])) return value.items[0];
  return YAML.isMap(value) ? value : null;
}

const bookmark = {
  kind: 'bookmark',
  read(pair) {
    const body = bodyOf(pair.value);
    if (!body && pair.value !== null) return null;
    const o = body ? body.toJSON() : {};
    return { fields: Object.fromEntries(FIELDS.map((k) => [k, o[k] === undefined || o[k] === null ? '' : String(o[k])])), other: Object.keys(o).filter((k) => !FIELDS.includes(k)) };
  },
  create: (doc, name) => doc.createNode({ [name]: [{}] }),
  blank: () => ({ fields: Object.fromEntries(FIELDS.map((k) => [k, ''])), other: [] }),
  write(doc, pair, it, at) {
    if (!bodyOf(pair.value)) pair.value = doc.createNode([{}]);
    const body = bodyOf(pair.value);
    for (const k of FIELDS) {
      const v = it.fields?.[k];
      if (v === undefined) continue;
      if (typeof v !== 'string' || v.length > 2000) throw new ConfigEditError(`${at}.${k}: text of at most 2000 characters`, 400);
      const text = v.trim();
      if (text === '') {
        if (body.has(k)) body.delete(k);
      } else if (String(body.get(k) ?? '') !== text) body.set(k, text);
    }
    return [];
  },
};

/** The tree of bookmarks.yaml: { hash, items }. */
export const readBookmarks = (configDir) => readTree(configDir, FILE, bookmark);

/** Writes the page's tree into bookmarks.yaml (tree.js: 409 when changed since, 400 when not valid). */
export const writeBookmarks = (configDir, items, hash, opts = {}) => writeTree(configDir, FILE, items, hash, bookmark, { opts });
