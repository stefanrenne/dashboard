// services.yaml on the settings page, as a tree: groups, nested groups and services, each with
// the id of its YAML node (its path of list positions, "0/2/1"). The page sends the tree back,
// edited: renamed, moved, added, removed, fields changed. The save rebuilds the lists from the
// nodes the ids name, so every entry keeps its comments and keys the page does not show; only
// changed fields are written. An `!include` stays one block that can be moved, never inlined.
// Widgets are kept as they are (their form is a step of its own).

import YAML from 'yaml';
import { readConfigFile, parseDocument, documentText, writeConfigFile, ConfigEditError } from './config/edit.js';

const FILE = 'services.yaml';
// the fields the page edits: [key, type]
export const SERVICE_FIELDS = [
  ['href', 'string'], ['icon', 'string'], ['description', 'string'],
  ['siteMonitor', 'string'], ['ping', 'string'], ['container', 'string'], ['server', 'string'],
  ['target', 'enum'], ['statusStyle', 'enum'], ['showStats', 'tristate'], ['weight', 'number'], ['filter', 'string'], ['confirm', 'enum'],
  ['proxmoxNode', 'string'], ['proxmoxVMID', 'number'], ['proxmoxType', 'enum'],
  ['app', 'string'], ['namespace', 'string'], ['podSelector', 'string'], ['external', 'boolean'],
];
const ENUMS = { target: ['', '_blank', '_self', '_top', 'hidden-iframe'], statusStyle: ['', 'dot', 'basic'], confirm: ['', 'password', 'always', 'none'], proxmoxType: ['', 'qemu', 'lxc'] };
const KNOWN = new Set([...SERVICE_FIELDS.map(([k]) => k), 'widget', 'widgets']);

const isInclude = (node) => YAML.isScalar(node) && node.tag === '!include';
const single = (node) => (YAML.isMap(node) && node.items.length === 1 ? node.items[0] : null);
const keyName = (pair) => String(YAML.isScalar(pair.key) ? pair.key.value : pair.key);

function readDoc(text) {
  const doc = parseDocument(text, FILE);
  if (doc.contents !== null && !YAML.isSeq(doc.contents)) throw new ConfigEditError('services.yaml: expected a list of groups; edit it as text', 400);
  return doc;
}

/** Every node by id, and the tree the page edits. */
function walk(doc) {
  const nodes = new Map();
  const fieldsOf = (map) => {
    const o = YAML.isMap(map) ? map.toJSON() : {};
    const out = {};
    for (const [key, type] of SERVICE_FIELDS) {
      const v = o[key];
      if (type === 'tristate') out[key] = typeof v === 'boolean' ? String(v) : '';
      else if (type === 'boolean') out[key] = v === true || v === 'true';
      else out[key] = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
    return out;
  };
  const widgetsOf = (o) => [...(o.widget !== undefined ? [o.widget] : []), ...(Array.isArray(o.widgets) ? o.widgets : [])]
    .map((w) => (w && typeof w === 'object' ? String(w.type ?? '') : ''));
  const item = (node, id) => {
    nodes.set(id, node);
    if (isInclude(node)) return { kind: 'include', id, file: String(node.value) };
    const pair = single(node);
    if (!pair) return { kind: 'other', id, text: String(node).trim() };
    const name = keyName(pair);
    if (YAML.isSeq(pair.value)) return { kind: 'group', id, name, items: pair.value.items.map((n, i) => item(n, `${id}/${i}`)) };
    if (isInclude(pair.value)) return { kind: 'group', id, name, include: String(pair.value.value), items: [] };
    if (pair.value === null || (YAML.isScalar(pair.value) && pair.value.value === null) || YAML.isMap(pair.value)) {
      const o = YAML.isMap(pair.value) ? pair.value.toJSON() : {};
      return { kind: 'service', id, name, fields: fieldsOf(pair.value), widgets: widgetsOf(o), other: Object.keys(o).filter((k) => !KNOWN.has(k)) };
    }
    return { kind: 'other', id, text: String(node).trim() };
  };
  const root = YAML.isSeq(doc.contents) ? doc.contents.items : [];
  return { nodes, items: root.map((n, i) => item(n, String(i))) };
}

/** The tree of services.yaml: { hash, items: [group | include | other] }. */
export function readServices(configDir) {
  const read = readConfigFile(configDir, FILE);
  const { items } = walk(readDoc(read.text));
  return { hash: read.hash, items };
}

function checkName(name, at) {
  if (typeof name !== 'string' || !name.trim() || name.length > 200) throw new ConfigEditError(`${at}: a name of at most 200 characters is needed`, 400);
  return name.trim();
}

/**
 * Writes the page's tree into services.yaml. `hash` is the one readServices gave: a file changed
 * since is refused (409). The save is checked as loadConfig loads it (400 with the errors).
 */
export function writeServices(configDir, items, hash, opts = {}) {
  if (!Array.isArray(items)) throw new ConfigEditError('expected the list of groups', 400);
  const read = readConfigFile(configDir, FILE);
  if (hash !== read.hash) throw new ConfigEditError('services.yaml changed since it was opened: reload it and make your change again', 409);
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
  const rename = (pair, name) => {
    if (keyName(pair) === name) return;
    pair.key = YAML.isScalar(pair.key) ? Object.assign(pair.key, { value: name }) : doc.createNode(name);
  };
  const setFields = (map, fields, at) => {
    for (const [key, type] of SERVICE_FIELDS) {
      if (!fields || !(key in fields)) continue;
      const v = fields[key];
      const current = map.get(key);
      let value;
      if (type === 'tristate') {
        if (!['', 'true', 'false'].includes(v)) throw new ConfigEditError(`${at}.${key}: empty, true or false`, 400);
        value = v === '' ? undefined : v === 'true';
      } else if (type === 'boolean') {
        if (typeof v !== 'boolean') throw new ConfigEditError(`${at}.${key}: true or false`, 400);
        value = v ? true : undefined;
      } else {
        if (typeof v !== 'string' || v.length > 2000) throw new ConfigEditError(`${at}.${key}: text of at most 2000 characters`, 400);
        const text = v.trim();
        if (type === 'enum' && !ENUMS[key].includes(text)) throw new ConfigEditError(`${at}.${key}: one of ${ENUMS[key].filter(Boolean).join(', ')}`, 400);
        if (type === 'number' && text !== '' && !Number.isFinite(Number(text))) throw new ConfigEditError(`${at}.${key}: a number`, 400);
        value = text === '' ? undefined : type === 'number' ? Number(text) : text;
      }
      // unchanged (also a number written as text): left as written
      if (value === undefined) {
        if (map.has(key)) map.delete(key);
      } else if (current === undefined || current === null || String(current) !== String(value)) map.set(key, value);
    }
  };
  const build = (it, at) => {
    if (!it || typeof it !== 'object') throw new ConfigEditError(`${at}: expected an entry`, 400);
    if (it.kind === 'include' || it.kind === 'other') {
      const node = own(it.id, at);
      if (!node) throw new ConfigEditError(`${at}: an include cannot be made here; add it as text`, 400);
      return node;
    }
    const name = checkName(it.name, at);
    let node = own(it.id, at);
    if (node && !single(node)) throw new ConfigEditError(`${at}: not a group or a service`, 400);
    if (it.kind === 'group') {
      if (!Array.isArray(it.items) && !it.include) throw new ConfigEditError(`${at}: expected the group's items`, 400);
      node ??= doc.createNode({ [name]: [] });
      const pair = single(node);
      rename(pair, name);
      if (isInclude(pair.value)) return node; // its services are in the included file
      if (!YAML.isSeq(pair.value)) pair.value = doc.createNode([]);
      pair.value.items = it.items.map((child, i) => build(child, `${at}.${name}[${i}]`));
      return node;
    }
    if (it.kind !== 'service') throw new ConfigEditError(`${at}: unknown kind of entry`, 400);
    node ??= doc.createNode({ [name]: {} });
    const pair = single(node);
    rename(pair, name);
    // `- Name:` without any field stays so; a field makes it a map
    const filled = Object.entries(it.fields ?? {}).some(([, v]) => v !== '' && v !== false);
    if (!YAML.isMap(pair.value) && !filled) return node;
    if (!YAML.isMap(pair.value)) pair.value = doc.createNode({});
    setFields(pair.value, it.fields, `${at}.${name}`);
    return node;
  };
  const items2 = items.map((g, i) => {
    if (g?.kind === 'service') throw new ConfigEditError(`[${i}]: a service belongs in a group`, 400);
    return build(g, `[${i}]`);
  });
  if (!YAML.isSeq(doc.contents)) doc.contents = doc.createNode([]);
  // the comment at the top of the file stays there, whichever group comes first now
  const first = doc.contents.items[0];
  if (first?.commentBefore && items2[0] && items2[0] !== first) {
    items2[0].commentBefore = [first.commentBefore, items2[0].commentBefore].filter(Boolean).join('\n');
    first.commentBefore = undefined;
  }
  doc.contents.items = items2;
  const text = documentText(doc);
  if (text === documentText(readDoc(read.text))) return { hash: read.hash, warnings: [], changed: false };
  return writeConfigFile(configDir, FILE, text, { hash, opts });
}
