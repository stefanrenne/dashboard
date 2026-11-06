// services.yaml on the settings page, as a tree: groups, nested groups and services, each with
// the id of its YAML node (its path of list positions, "0/2/1"). The page sends the tree back,
// edited: renamed, moved, added, removed, fields changed. The save rebuilds the lists from the
// nodes the ids name, so every entry keeps its comments and keys the page does not show; only
// changed fields are written. An `!include` stays one block that can be moved, never inlined.
// A service's widgets are edited by their options' schema (widget.yaml); secret options travel
// as tokens, as in the text editor, and lists, objects and keys a widget does not declare stay.

import YAML from 'yaml';
import { readConfigFile, parseDocument, documentText, writeConfigFile, ConfigEditError } from './config/edit.js';
import { tokenFor } from './config/mask.js';

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
function walk(doc, schemaFor = () => null) {
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
  const widgetsOf = (map) => {
    if (!YAML.isMap(map)) return [];
    const one = map.get('widget', true);
    const list = map.get('widgets', true);
    return [...(one !== undefined ? [['widget', one]] : []), ...(YAML.isSeq(list) ? list.items.map((n, i) => [`widgets/${i}`, n]) : [])]
      .map(([id, n]) => ({ id, ...(YAML.isMap(n) ? widgetForm(n, schemaFor) : { type: '', options: {}, rest: [] }) }));
  };
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
      return { kind: 'service', id, name, fields: fieldsOf(pair.value), widgets: widgetsOf(pair.value), other: Object.keys(o).filter((k) => !KNOWN.has(k)) };
    }
    return { kind: 'other', id, text: String(node).trim() };
  };
  const root = YAML.isSeq(doc.contents) ? doc.contents.items : [];
  return { nodes, items: root.map((n, i) => item(n, String(i))) };
}

/** The tree of services.yaml: { hash, items: [group | include | other] }. */
export function readServices(configDir, schemaFor = () => null) {
  const read = readConfigFile(configDir, FILE);
  const { items } = walk(readDoc(read.text), schemaFor);
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
export function writeServices(configDir, items, hash, opts = {}, schemaFor = () => null) {
  if (!Array.isArray(items)) throw new ConfigEditError('expected the list of groups', 400);
  const read = readConfigFile(configDir, FILE);
  if (hash !== read.hash) throw new ConfigEditError('services.yaml changed since it was opened: reload it and make your change again', 409);
  const doc = readDoc(read.text);
  const { nodes } = walk(doc, schemaFor);
  const used = new Set();
  const warnings = [];
  // a service's widgets from the form: its nodes kept, `widget:` stays while there is one
  const setWidgets = (map, list, at) => {
    if (!Array.isArray(list)) return;
    const one = map.get('widget', true);
    const seq = map.get('widgets', true);
    const taken = new Set();
    const nodesOut = list.map((w, i) => {
      const old = w?.id === 'widget' ? one : /^widgets\/\d+$/.test(String(w?.id)) && YAML.isSeq(seq) ? seq.items[Number(String(w.id).split('/')[1])] : null;
      if (w?.id && !old) throw new ConfigEditError(`${at}.widgets[${i}]: no such widget any more; reload the page`, 409);
      if (old && taken.has(old)) throw new ConfigEditError(`${at}.widgets[${i}]: the same widget twice`, 400);
      if (old && !YAML.isMap(old)) throw new ConfigEditError(`${at}.widgets[${i}]: not a map; edit it as text`, 400);
      const node = old ?? doc.createNode({ type: String(w?.type ?? '') });
      taken.add(node);
      warnings.push(...applyWidget(doc, node, w, schemaFor, `${at}.widgets[${i}]`));
      return node;
    });
    if (nodesOut.length === 0) {
      map.delete('widget');
      map.delete('widgets');
    } else if (nodesOut.length === 1 && !YAML.isSeq(seq)) {
      if (one !== nodesOut[0]) map.set('widget', nodesOut[0]);
    } else {
      if (one !== undefined) map.delete('widget');
      if (YAML.isSeq(seq)) seq.items = nodesOut;
      else map.set('widgets', doc.createNode(nodesOut));
    }
  };
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
    const filled = Object.entries(it.fields ?? {}).some(([, v]) => v !== '' && v !== false) || (Array.isArray(it.widgets) && it.widgets.length > 0);
    if (!YAML.isMap(pair.value) && !filled) return node;
    if (!YAML.isMap(pair.value)) pair.value = doc.createNode({});
    setFields(pair.value, it.fields, `${at}.${name}`);
    setWidgets(pair.value, it.widgets, `${at}.${name}`);
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
  const out = writeConfigFile(configDir, FILE, text, { hash, opts });
  return { ...out, warnings: [...warnings, ...out.warnings] };
}

// ---------------------------------------------------------------- widgets (a service's widget: / widgets:, and widgets.yaml)
const EDITABLE_TYPES = new Set(['string', 'url', 'icon', 'enum', 'number', 'boolean']);
const PLACEHOLDER = /\{\{\s*(DASHBOARD|HOMEPAGE)_(VAR|FILE)_[A-Za-z0-9_]+\s*\}\}/;

/** Every installed widget with its options, for the forms: [{ id, name, description, options }]. */
export function widgetCatalog(registry) {
  const seen = new Set();
  const out = [];
  for (const w of registry.values()) {
    const m = w.manifest;
    if (!m?.id || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push({
      id: m.id, name: m.name ?? m.id, description: m.description ?? '',
      options: Object.fromEntries(Object.entries(m.options ?? {}).map(([k, d]) => [k, {
        type: d.type, required: Boolean(d.required), secret: Boolean(d.secret),
        ...(d.default !== undefined ? { default: d.default } : {}), ...(Array.isArray(d.values) ? { values: d.values.map(String) } : {}),
        ...(typeof d.description === 'string' ? { description: d.description } : {}),
      }])),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** A widget's options as the form has them: { type, options, rest }; secrets as tokens. */
export function widgetForm(map, schemaFor) {
  const o = YAML.isMap(map) ? map.toJSON() : {};
  const type = typeof o.type === 'string' ? o.type : '';
  const schema = schemaFor(type) ?? {};
  const options = {};
  for (const [k, def] of Object.entries(schema)) {
    if (!EDITABLE_TYPES.has(def.type)) continue;
    const v = o[k];
    if (v === undefined || v === null) options[k] = '';
    else if (def.secret && !(typeof v === 'string' && PLACEHOLDER.test(v))) options[k] = tokenFor(v);
    else options[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  const rest = Object.keys(o).filter((k) => k !== 'type' && !(k in options));
  return { type, options, rest };
}

/**
 * Sets a widget's type and options in `map` (a YAML map node) from the form. Only changed values
 * are written; a secret left as its token stays as it is. Returns the warnings (a secret written
 * into the file).
 */
export function applyWidget(doc, map, w, schemaFor, at) {
  const warnings = [];
  if (typeof w?.type !== 'string' || !w.type.trim()) throw new ConfigEditError(`${at}: a widget needs a type`, 400);
  if (String(map.get('type') ?? '') !== w.type) map.set('type', w.type);
  const schema = schemaFor(w.type) ?? {};
  for (const [k, raw] of Object.entries(w.options ?? {})) {
    const def = schema[k];
    if (!def || !EDITABLE_TYPES.has(def.type)) continue;
    if (typeof raw !== 'string' || raw.length > 4000) throw new ConfigEditError(`${at}.${k}: text of at most 4000 characters`, 400);
    const current = map.get(k);
    const text = raw.trim();
    if (def.secret && current !== undefined && current !== null && text === tokenFor(current)) continue; // unchanged
    if (/__SECRET_[0-9a-f]{10}__/.test(text)) throw new ConfigEditError(`${at}.${k}: a hidden value of another option; type the secret again`, 400);
    let value;
    if (text === '') value = undefined;
    else if (def.type === 'number') {
      if (!Number.isFinite(Number(text)) && !PLACEHOLDER.test(text)) throw new ConfigEditError(`${at}.${k}: a number`, 400);
      value = PLACEHOLDER.test(text) ? text : Number(text);
    } else if (def.type === 'boolean') {
      if (!['true', 'false'].includes(text)) throw new ConfigEditError(`${at}.${k}: true or false`, 400);
      value = text === 'true';
    } else if (def.type === 'enum' && Array.isArray(def.values) && !def.values.map(String).includes(text)) {
      throw new ConfigEditError(`${at}.${k}: one of ${def.values.join(', ')}`, 400);
    } else value = text;
    if (value === undefined) {
      if (map.has(k)) map.delete(k);
    } else if (current === undefined || current === null || String(current) !== String(value)) {
      map.set(k, value);
      if (def.secret && !PLACEHOLDER.test(String(value))) warnings.push({ file: FILE, path: `${at}.${k}`, message: 'a secret written into the file itself: a {{DASHBOARD_VAR_*}} variable keeps it out of the file' });
    }
  }
  return warnings;
}
