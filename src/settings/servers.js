// docker.yaml, proxmox.yaml and kubernetes.yaml on the settings page. docker.yaml and
// proxmox.yaml are maps of a name to a server's fields (homepage's flat proxmox.yaml is one node
// for all); kubernetes.yaml is one map of fields. A save changes the fields that changed, renames,
// adds, removes and reorders entries, and keeps every entry's node (comments, keys the page does
// not show, such as allowVariables). A secret field travels as a token (secrets.js).

import YAML from 'yaml';
import { ConfigEditError } from '../config/edit.js';
import { KUBERNETES_MODES } from '../config/schema.js';
import { shownSecret, secretFromPage, refuseToken, isHidden } from './secrets.js';
import { openYaml, keyName, rename, setItems } from './yaml.js';

// A file's fields: { name, at (path in the entry), type, values (enum), default (left out of the
// file) }. Types: string, number, enum, boolean, tristate ('' leaves it out), secret.
// `named`: a map of name → entry; `flat(root)`: the file is one entry for all (homepage's form).
const field = (name, type, more = {}) => ({ name, at: [name], type, ...more });
export const SPECS = {
  'docker.yaml': {
    named: true,
    fields: [
      field('socket', 'string'), field('host', 'string'), field('port', 'number'),
      field('protocol', 'enum', { values: ['', 'http', 'https'] }),
      field('caFile', 'string', { at: ['tls', 'caFile'] }), field('certFile', 'string', { at: ['tls', 'certFile'] }), field('keyFile', 'string', { at: ['tls', 'keyFile'] }),
      field('discover', 'boolean', { default: true }), field('swarm', 'boolean', { default: false }),
    ],
  },
  'proxmox.yaml': {
    named: true,
    flat: (root) => root.has('url'),
    fields: [field('url', 'string'), field('token', 'string'), field('secret', 'secret'), field('insecure', 'boolean', { default: false })],
  },
  'kubernetes.yaml': {
    named: false,
    fields: [
      field('mode', 'enum', { values: KUBERNETES_MODES }), field('kubeconfig', 'string'), field('context', 'string'),
      field('ingress', 'tristate'), field('traefik', 'tristate'), field('gateway', 'tristate'),
    ],
  },
};

function spec(file) {
  const s = SPECS[file];
  if (!s) throw new ConfigEditError(`${file}: not a server file`, 404);
  return s;
}

/** The form of a file's entries, for the page: [{ name, type, values }]. */
const formOf = (s) => s.fields.map(({ name, type, values }) => ({ name, type, ...(values ? { values } : {}) }));

/** An entry (a YAML map) as the form has it: { fields, hidden, other }. */
function entryOf(s, map) {
  const fields = {};
  for (const f of s.fields) {
    const v = YAML.isMap(map) ? map.getIn(f.at) : undefined;
    if (f.type === 'boolean') fields[f.name] = typeof v === 'boolean' ? v : f.default;
    else if (f.type === 'tristate') fields[f.name] = typeof v === 'boolean' ? String(v) : '';
    else if (f.type === 'secret') fields[f.name] = shownSecret(v);
    else fields[f.name] = v === undefined || v === null ? (f.type === 'enum' ? f.values[0] : '') : String(v);
  }
  const own = new Set(s.fields.map((f) => f.at[0]));
  return {
    fields,
    hidden: Object.keys(fields).filter((k) => isHidden(fields[k])),
    other: YAML.isMap(map) ? map.items.map(keyName).filter((k) => !own.has(k)) : [],
  };
}

/**
 * The file as the form edits it: { hash, form, flat, entries: [{ id, name, fields, hidden, other }] }
 * for a map of servers, or { hash, form, fields, hidden, other } for kubernetes.yaml.
 */
export function readServers(configDir, file) {
  const s = spec(file);
  const { doc, hash } = openYaml(configDir, file, { shape: 'map' });
  const root = doc.contents;
  if (!s.named) return { hash, form: formOf(s), ...entryOf(s, root) };
  if (s.flat?.(root)) return { hash, form: formOf(s), flat: true, entries: [{ id: '', name: '', ...entryOf(s, root) }] };
  return { hash, form: formOf(s), blank: entryOf(s, null).fields, flat: false, entries: root.items.map((p) => ({ id: keyName(p), name: keyName(p), ...entryOf(s, p.value) })) };
}

/** Sets an entry's fields in `map`, where they changed; returns the warnings. */
function applyFields(doc, map, s, fields, at, file) {
  const warnings = [];
  for (const f of s.fields) {
    if (!fields || !(f.name in fields)) continue;
    const v = fields[f.name];
    const where = `${at}.${f.name}`;
    const current = map.getIn(f.at);
    let value;
    if (f.type === 'boolean') {
      if (typeof v !== 'boolean') throw new ConfigEditError(`${where}: true or false`, 400);
      value = v;
    } else if (f.type === 'tristate') {
      if (!['', 'true', 'false'].includes(v)) throw new ConfigEditError(`${where}: empty, true or false`, 400);
      value = v === '' ? undefined : v === 'true';
    } else {
      if (typeof v !== 'string' || v.length > 2000) throw new ConfigEditError(`${where}: text of at most 2000 characters`, 400);
      value = v.trim();
      if (f.type === 'secret') {
        const secret = secretFromPage(value, current, { file, at: where });
        if (secret.keep) continue;
        warnings.push(...secret.warnings);
      } else refuseToken(value, where);
      if (f.type === 'enum' && !f.values.includes(value)) throw new ConfigEditError(`${where}: one of ${f.values.filter(Boolean).join(', ')}`, 400);
      if (f.type === 'number' && value !== '' && !Number.isInteger(Number(value))) throw new ConfigEditError(`${where}: a whole number`, 400);
      if (f.type === 'number' && value !== '') value = Number(value);
    }
    if (value === '' || value === f.default) value = undefined;
    if (value === undefined) {
      if (map.hasIn(f.at)) map.deleteIn(f.at);
      // an emptied parent (tls:) goes too
      const parent = f.at.length > 1 ? map.get(f.at[0], true) : null;
      if (YAML.isMap(parent) && parent.items.length === 0) map.delete(f.at[0]);
    } else if (current === undefined || current === null || String(current) !== String(value)) {
      if (f.at.length > 1 && !YAML.isMap(map.get(f.at[0], true))) map.set(f.at[0], doc.createNode({}));
      map.setIn(f.at, value);
    }
  }
  return warnings;
}

/** Writes the form into `file`; `hash` from readServers (409 when the file changed since). */
export function writeServers(configDir, file, body, hash, opts = {}) {
  const s = spec(file);
  const yaml = openYaml(configDir, file, { shape: 'map', hash });
  const { doc } = yaml;
  const root = doc.contents;
  if (!s.named || s.flat?.(root)) {
    const fields = s.named ? body?.entries?.[0]?.fields : body?.fields;
    if (!fields || typeof fields !== 'object') throw new ConfigEditError(`${file}: expected the fields`, 400);
    return yaml.save({ opts, warnings: applyFields(doc, root, s, fields, s.named ? '' : file.replace('.yaml', ''), file) });
  }
  const list = body?.entries;
  if (!Array.isArray(list) || list.length > 50) throw new ConfigEditError(`${file}: expected the list of entries`, 400);
  const pairs = new Map(root.items.map((p) => [keyName(p), p]));
  const names = new Set();
  const used = new Set();
  const warnings = [];
  setItems(root, list.map((e, i) => {
    const name = typeof e?.name === 'string' ? e.name.trim() : '';
    if (!/^[A-Za-z0-9_.-]{1,64}$/.test(name)) throw new ConfigEditError(`${file} [${i}]: a name of letters, digits, - _ or .`, 400);
    if (names.has(name)) throw new ConfigEditError(`${file} › ${name}: the same name twice`, 400);
    names.add(name);
    let pair = e.id ? pairs.get(String(e.id)) : null;
    if (e.id && !pair) throw new ConfigEditError(`${file} › ${e.id}: no such entry any more; reload the page`, 409);
    if (pair && used.has(pair)) throw new ConfigEditError(`${file} › ${name}: the same entry twice`, 400);
    pair ??= doc.createPair(name, doc.createNode({}));
    used.add(pair);
    rename(doc, pair, name);
    if (!YAML.isMap(pair.value)) pair.value = doc.createNode({});
    warnings.push(...applyFields(doc, pair.value, s, e.fields, name, file));
    return pair;
  }));
  return yaml.save({ opts, warnings });
}
