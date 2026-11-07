// services.yaml on the settings page: a tree (tree.js) whose leaves are services, with their
// fields (the schema's SERVICE_FIELDS) and widgets (widgets.js); groups may hold groups.

import YAML from 'yaml';
import { ConfigEditError } from '../config/edit.js';
import { SERVICE_FIELDS } from '../config/schema.js';
import { readTree, writeTree } from './tree.js';
import { serviceWidgets, setServiceWidgets } from './widgets.js';

const FILE = 'services.yaml';
const KNOWN = new Set([...Object.keys(SERVICE_FIELDS), 'widget', 'widgets']);

/** A service's fields as the form has them: '' for a field that is not set. */
function fieldsOf(map) {
  const o = YAML.isMap(map) ? map.toJSON() : {};
  return Object.fromEntries(Object.entries(SERVICE_FIELDS).map(([key, kind]) => {
    const v = o[key];
    if (kind === 'boolean') return [key, typeof v === 'boolean' ? String(v) : ''];
    if (kind === 'flag') return [key, v === true || v === 'true'];
    return [key, v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)];
  }));
}

/** Sets the fields the page sent in a service's map, where they changed. */
function setFields(map, fields, at) {
  for (const [key, kind] of Object.entries(SERVICE_FIELDS)) {
    if (!fields || !(key in fields)) continue;
    const v = fields[key];
    let value;
    if (kind === 'boolean') {
      if (!['', 'true', 'false'].includes(v)) throw new ConfigEditError(`${at}.${key}: empty, true or false`, 400);
      value = v === '' ? undefined : v === 'true';
    } else if (kind === 'flag') {
      if (typeof v !== 'boolean') throw new ConfigEditError(`${at}.${key}: true or false`, 400);
      value = v || undefined;
    } else {
      if (typeof v !== 'string' || v.length > 2000) throw new ConfigEditError(`${at}.${key}: text of at most 2000 characters`, 400);
      const text = v.trim();
      if (Array.isArray(kind) && text && !kind.includes(text)) throw new ConfigEditError(`${at}.${key}: one of ${kind.join(', ')}`, 400);
      if (kind === 'number' && text && !Number.isFinite(Number(text))) throw new ConfigEditError(`${at}.${key}: a number`, 400);
      value = text === '' ? undefined : kind === 'number' ? Number(text) : text;
    }
    const current = map.get(key);
    // a value written another way (a number as text) stays as written
    if (value === undefined) {
      if (map.has(key)) map.delete(key);
    } else if (current === undefined || current === null || String(current) !== String(value)) map.set(key, value);
  }
}

/** A service as tree.js's leaf: its fields and widgets; a group's list is no service. */
const service = (schemaFor) => ({
  kind: 'service',
  read(pair) {
    if (!(pair.value === null || (YAML.isScalar(pair.value) && pair.value.value === null) || YAML.isMap(pair.value))) return null;
    const o = YAML.isMap(pair.value) ? pair.value.toJSON() : {};
    return { fields: fieldsOf(pair.value), widgets: serviceWidgets(pair.value, schemaFor), other: Object.keys(o).filter((k) => !KNOWN.has(k)) };
  },
  create: (doc, name) => doc.createNode({ [name]: {} }),
  write(doc, pair, it, at) {
    // `- Name:` without any field stays so; a field makes it a map
    const filled = Object.values(it.fields ?? {}).some((v) => v !== '' && v !== false) || (Array.isArray(it.widgets) && it.widgets.length > 0);
    if (!YAML.isMap(pair.value) && !filled) return [];
    if (!YAML.isMap(pair.value)) pair.value = doc.createNode({});
    setFields(pair.value, it.fields, at);
    return setServiceWidgets(doc, pair.value, it.widgets, schemaFor, at, FILE);
  },
});

/** The tree of services.yaml: { hash, items: [group | include | other] }. */
export const readServices = (configDir, schemaFor = () => null) => readTree(configDir, FILE, service(schemaFor), { nested: true });

/** Writes the page's tree into services.yaml (tree.js: 409 when changed since, 400 when not valid). */
export const writeServices = (configDir, items, hash, opts = {}, schemaFor = () => null) => writeTree(configDir, FILE, items, hash, service(schemaFor), { nested: true, opts });
