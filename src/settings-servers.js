// docker.yaml, proxmox.yaml and kubernetes.yaml on the settings page. docker.yaml and
// proxmox.yaml are maps of a name to a server's fields; kubernetes.yaml is one map. A save
// changes the fields that changed, renames, adds, removes and reorders entries, and keeps every
// entry's node (comments, keys the page does not show, such as allowVariables). Proxmox's
// `secret` travels as a token, as in the text editor.

import YAML from 'yaml';
import { readConfigFile, parseDocument, documentText, writeConfigFile, ConfigEditError } from './config/edit.js';
import { tokenFor } from './config/mask.js';

// [field, path in the entry, type]; types: string, number, enum (values), boolean (default), secret
export const SPECS = {
  'docker.yaml': {
    named: true,
    fields: [
      ['socket', ['socket'], 'string'], ['host', ['host'], 'string'], ['port', ['port'], 'number'],
      ['protocol', ['protocol'], 'enum', ['', 'http', 'https']],
      ['caFile', ['tls', 'caFile'], 'string'], ['certFile', ['tls', 'certFile'], 'string'], ['keyFile', ['tls', 'keyFile'], 'string'],
      ['discover', ['discover'], 'boolean', true], ['swarm', ['swarm'], 'boolean', false],
    ],
  },
  'proxmox.yaml': {
    named: true,
    fields: [['url', ['url'], 'string'], ['token', ['token'], 'string'], ['secret', ['secret'], 'secret'], ['insecure', ['insecure'], 'boolean', false]],
  },
  'kubernetes.yaml': {
    named: false,
    fields: [
      ['mode', ['mode'], 'enum', ['disabled', 'cluster', 'default']], ['kubeconfig', ['kubeconfig'], 'string'], ['context', ['context'], 'string'],
      ['ingress', ['ingress'], 'tristate'], ['traefik', ['traefik'], 'tristate'], ['gateway', ['gateway'], 'tristate'],
    ],
  },
};
const PLACEHOLDER = /\{\{\s*(DASHBOARD|HOMEPAGE)_(VAR|FILE)_[A-Za-z0-9_]+\s*\}\}/;
const keyName = (pair) => String(YAML.isScalar(pair.key) ? pair.key.value : pair.key);

function spec(file) {
  const s = SPECS[file];
  if (!s) throw new ConfigEditError(`${file}: not a server file`, 404);
  return s;
}

function readDoc(file, text) {
  const doc = parseDocument(text, file);
  if (doc.contents !== null && !YAML.isMap(doc.contents)) throw new ConfigEditError(`${file}: expected a map; edit it as text`, 400);
  return doc;
}

const getIn = (o, at) => at.reduce((x, k) => (x && typeof x === 'object' ? x[k] : undefined), o);

/** An entry's fields as the form has them. */
function fieldsOf(s, o) {
  const out = {};
  for (const [name, at, type, def] of s.fields) {
    const v = getIn(o, at);
    if (type === 'boolean') out[name] = typeof v === 'boolean' ? v : def;
    else if (type === 'tristate') out[name] = typeof v === 'boolean' ? String(v) : '';
    else if (type === 'secret') out[name] = v === undefined || v === null || v === '' ? '' : PLACEHOLDER.test(String(v)) ? String(v) : tokenFor(v);
    else if (type === 'enum') out[name] = v === undefined || v === null ? s.fields.find((f) => f[0] === name)[3][0] : String(v);
    else out[name] = v === undefined || v === null ? '' : String(v);
  }
  return out;
}
const knownTop = (s) => new Set(s.fields.map((f) => f[1][0]));

/**
 * The file as the form edits it: { hash, flat, entries: [{ id, name, fields, other }] } for a map
 * of servers (flat: homepage's one proxmox node for all), or { hash, fields, other } for kubernetes.yaml.
 */
export function readServers(configDir, file) {
  const s = spec(file);
  const read = readConfigFile(configDir, file);
  const raw = readDoc(file, read.text).toJS() ?? {};
  const other = (o) => Object.keys(o && typeof o === 'object' ? o : {}).filter((k) => !knownTop(s).has(k));
  if (!s.named) return { hash: read.hash, fields: fieldsOf(s, raw), other: other(raw) };
  if (file === 'proxmox.yaml' && raw.url !== undefined) return { hash: read.hash, flat: true, entries: [{ id: '', name: '', fields: fieldsOf(s, raw), other: other(raw) }] };
  return { hash: read.hash, flat: false, entries: Object.entries(raw).map(([name, o]) => ({ id: name, name, fields: fieldsOf(s, o ?? {}), other: other(o) })) };
}

/** Sets an entry's fields in `map` (a YAML map node); returns the warnings. */
function applyFields(doc, map, s, fields, at, file) {
  const warnings = [];
  for (const [name, path, type, def] of s.fields) {
    if (!fields || !(name in fields)) continue;
    const v = fields[name];
    const current = map.getIn(path);
    let value;
    if (type === 'boolean') {
      if (typeof v !== 'boolean') throw new ConfigEditError(`${at}.${name}: true or false`, 400);
      value = v === def ? undefined : v;
    } else if (type === 'tristate') {
      if (!['', 'true', 'false'].includes(v)) throw new ConfigEditError(`${at}.${name}: empty, true or false`, 400);
      value = v === '' ? undefined : v === 'true';
    } else {
      if (typeof v !== 'string' || v.length > 2000) throw new ConfigEditError(`${at}.${name}: text of at most 2000 characters`, 400);
      const text = v.trim();
      if (type === 'secret' && current !== undefined && current !== null && text === tokenFor(current)) continue;
      if (/__SECRET_[0-9a-f]{10}__/.test(text)) throw new ConfigEditError(`${at}.${name}: a hidden value of another entry; type the secret again`, 400);
      const values = s.fields.find((f) => f[0] === name)[3];
      if (type === 'enum' && !values.includes(text)) throw new ConfigEditError(`${at}.${name}: one of ${values.filter(Boolean).join(', ')}`, 400);
      if (type === 'number' && text !== '' && !Number.isInteger(Number(text))) throw new ConfigEditError(`${at}.${name}: a whole number`, 400);
      value = text === '' || (type === 'enum' && text === values[0] && name !== 'mode') ? undefined : type === 'number' ? Number(text) : text;
      if (type === 'secret' && value !== undefined && String(current) !== value && !PLACEHOLDER.test(value)) {
        warnings.push({ file, path: `${at}.${name}`, message: 'a secret written into the file itself: a {{DASHBOARD_VAR_*}} variable keeps it out of the file' });
      }
    }
    if (value === undefined) {
      if (map.hasIn(path)) map.deleteIn(path);
      // an emptied tls: map goes too
      if (path.length > 1 && YAML.isMap(map.get(path[0], true)) && map.get(path[0], true).items.length === 0) map.delete(path[0]);
    } else if (current === undefined || current === null || String(current) !== String(value)) {
      if (path.length > 1 && !YAML.isMap(map.get(path[0], true))) map.set(path[0], doc.createNode({}));
      map.setIn(path, value);
    }
  }
  return warnings;
}

/** Writes the form into `file`; `hash` from readServers (409 when the file changed). */
export function writeServers(configDir, file, body, hash, opts = {}) {
  const s = spec(file);
  const read = readConfigFile(configDir, file);
  if (hash !== read.hash) throw new ConfigEditError(`${file} changed since it was opened: reload it and make your change again`, 409);
  const doc = readDoc(file, read.text);
  if (doc.contents === null) doc.contents = doc.createNode({});
  const root = doc.contents;
  let warnings = [];
  if (!s.named || (file === 'proxmox.yaml' && root.has('url'))) {
    const fields = s.named ? body?.entries?.[0]?.fields : body?.fields;
    if (!fields || typeof fields !== 'object') throw new ConfigEditError(`${file}: expected the fields`, 400);
    warnings = applyFields(doc, root, s, fields, s.named ? '' : file.replace('.yaml', ''), file);
  } else {
    const entries = body?.entries;
    if (!Array.isArray(entries) || entries.length > 50) throw new ConfigEditError(`${file}: expected the list of entries`, 400);
    const pairs = new Map(root.items.map((p) => [keyName(p), p]));
    // the comment at the top of the file sits on the first key; it stays at the top
    const firstKey = root.items[0]?.key;
    const top = YAML.isNode(firstKey) ? firstKey.commentBefore : undefined;
    if (top) firstKey.commentBefore = undefined;
    const names = new Set();
    const used = new Set();
    root.items = entries.map((e, i) => {
      const name = typeof e?.name === 'string' ? e.name.trim() : '';
      if (!/^[A-Za-z0-9_.-]{1,64}$/.test(name)) throw new ConfigEditError(`${file} [${i}]: a name of letters, digits, - _ or .`, 400);
      if (names.has(name)) throw new ConfigEditError(`${file} › ${name}: the same name twice`, 400);
      names.add(name);
      let pair = e.id ? pairs.get(String(e.id)) : null;
      if (e.id && !pair) throw new ConfigEditError(`${file} › ${e.id}: no such entry any more; reload the page`, 409);
      if (pair && used.has(pair)) throw new ConfigEditError(`${file} › ${name}: the same entry twice`, 400);
      if (!pair) pair = doc.createPair(name, doc.createNode({}));
      used.add(pair);
      if (keyName(pair) !== name) pair.key = YAML.isScalar(pair.key) ? Object.assign(pair.key, { value: name }) : doc.createNode(name);
      if (!YAML.isMap(pair.value)) pair.value = doc.createNode({});
      warnings.push(...applyFields(doc, pair.value, s, e.fields, name, file));
      return pair;
    });
    if (top) {
      const key = root.items[0]?.key;
      if (YAML.isNode(key)) key.commentBefore = [top, key.commentBefore].filter(Boolean).join('\n');
      else doc.commentBefore = [doc.commentBefore, top].filter(Boolean).join('\n');
    }
  }
  const text = documentText(doc);
  if (text === documentText(readDoc(file, read.text))) return { hash: read.hash, warnings: [], changed: false };
  const out = writeConfigFile(configDir, file, text, { hash, opts });
  return { ...out, warnings: [...warnings, ...out.warnings] };
}
