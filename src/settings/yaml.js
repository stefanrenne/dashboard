// The YAML side of the settings page's form editors. A config file is opened as a document whose
// nodes an editor changes in place, so comments and keys it does not know stay; the page names
// entries by the id of their node; one save writes nothing when nothing changed.

import YAML from 'yaml';
import { readConfigFile, parseDocument, documentText, writeConfigFile, sameVersion, ConfigEditError } from '../config/edit.js';

export const isInclude = (node) => YAML.isScalar(node) && node.tag === '!include';
/** The one key/value pair of a `- Name: …` entry, or null. */
export const single = (node) => (YAML.isMap(node) && node.items.length === 1 ? node.items[0] : null);
export const keyName = (pair) => String(YAML.isScalar(pair.key) ? pair.key.value : pair.key);

/** Renames the key of `pair` in place, keeping its comments. */
export function rename(doc, pair, name) {
  if (keyName(pair) === name) return;
  pair.key = YAML.isScalar(pair.key) ? Object.assign(pair.key, { value: name }) : doc.createNode(name);
}

/**
 * `file` as a document whose root is a `shape` ('map' or 'seq'). With `hash`, a file changed since
 * that hash was read is refused (409): the ids the page sends name the nodes of that version.
 * Returns { doc, hash, save }: save({ opts, warnings }) writes the document through
 * writeConfigFile (checked as loadConfig loads it) and returns
 * { hash, warnings, changed }; nothing is written when the text is what was read.
 */
export function openYaml(configDir, file, { shape, hash } = {}) {
  const read = readConfigFile(configDir, file);
  sameVersion(file, hash, read);
  const doc = parseDocument(read.text, file);
  const empty = doc.contents === null;
  if (empty) doc.contents = doc.createNode(shape === 'seq' ? [] : {});
  else if (!(shape === 'seq' ? YAML.isSeq : YAML.isMap)(doc.contents)) throw new ConfigEditError(`${file}: expected a ${shape === 'seq' ? 'list' : 'map'}; edit it as text`, 400);
  const baseline = documentText(parseDocument(read.text, file));
  return {
    doc,
    hash: read.hash,
    save({ opts = {}, warnings = [] } = {}) {
      // an empty file that stayed empty is the same file, whatever the empty root prints as
      const text = empty && doc.contents.items.length === 0 ? read.text : documentText(doc);
      if (text === baseline || text === read.text) return { hash: read.hash, warnings: [], changed: false };
      const out = writeConfigFile(configDir, file, text, { hash: read.hash, opts });
      return { ...out, warnings: [...warnings, ...out.warnings] };
    },
  };
}

/**
 * The page's entries back to their nodes, for one save: take(id, at) gives the node an id named
 * when it was read, null for a new entry (no id); an id that no longer exists is refused (409),
 * one used twice too (400).
 */
export function entries(nodes) {
  const used = new Set();
  return {
    take(id, at) {
      if (id === null || id === undefined) return null;
      const node = nodes.get(String(id));
      if (!node) throw new ConfigEditError(`${at}: no such entry any more; reload the page`, 409);
      if (used.has(node)) throw new ConfigEditError(`${at}: the same entry twice`, 400);
      used.add(node);
      return node;
    },
  };
}

/**
 * Puts `items` (nodes, or pairs of a map) in `collection` (a YAML seq or map). The comment at the
 * top of the file belongs to the file, not to whichever entry came first: it stays on top.
 */
export function setItems(collection, items) {
  const holder = (x) => (YAML.isPair(x) ? x.key : x);
  const first = collection.items[0];
  if (first && items[0] && items[0] !== first && YAML.isNode(holder(first)) && holder(first).commentBefore) {
    const top = holder(first).commentBefore;
    holder(first).commentBefore = undefined;
    const to = holder(items[0]);
    if (YAML.isNode(to)) to.commentBefore = [top, to.commentBefore].filter(Boolean).join('\n');
  }
  collection.items = items;
}
