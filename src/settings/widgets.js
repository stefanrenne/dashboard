// Widgets on the settings page: a form per widget from the options its widget.yaml declares, for a
// service's `widget:` / `widgets:` (services.yaml) and for the header (widgets.yaml). Secret options
// travel as tokens (secrets.js); lists, objects and keys a widget does not declare stay as written.

import YAML from 'yaml';
import { ConfigEditError } from '../config/edit.js';
import { hasPlaceholder, substitute } from '../config/vars.js';
import { shownSecret, secretFromPage, refuseToken, isHidden, TOKEN } from './secrets.js';
import { openYaml, entries, single, keyName, rename, setItems } from './yaml.js';

// the option types a form field edits; list and object options stay in the file as they are
const EDITABLE_TYPES = new Set(['string', 'url', 'icon', 'enum', 'number', 'boolean']);
const HEADER = 'widgets.yaml';

/** A widget's options as its form has them: { type, options, hidden, rest }. */
function widgetForm(map, type, schemaFor) {
  const o = YAML.isMap(map) ? map.toJSON() : {};
  const schema = schemaFor(type) ?? {};
  const options = {};
  for (const [k, def] of Object.entries(schema)) {
    if (!EDITABLE_TYPES.has(def.type)) continue;
    const v = o[k];
    if (def.secret) options[k] = shownSecret(v);
    else options[k] = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
  return { type, options, hidden: Object.keys(options).filter((k) => isHidden(options[k])), rest: Object.keys(o).filter((k) => k !== 'type' && !(k in options)) };
}

/** Sets the options the page sent in `map`, where they changed. Returns the warnings. */
function applyOptions(map, w, schemaFor, at, file) {
  const warnings = [];
  const schema = schemaFor(w.type) ?? {};
  for (const [k, raw] of Object.entries(w.options ?? {})) {
    const def = schema[k];
    if (!def || !EDITABLE_TYPES.has(def.type)) continue;
    if (typeof raw !== 'string' || raw.length > 4000) throw new ConfigEditError(`${at}.${k}: text of at most 4000 characters`, 400);
    const current = map.get(k);
    let value = raw.trim();
    if (def.secret) {
      const secret = secretFromPage(value, current, { file, at: `${at}.${k}` });
      if (secret.keep) continue;
      warnings.push(...secret.warnings);
    } else refuseToken(value, `${at}.${k}`);
    if (value === '') value = undefined;
    else if (def.type === 'number' && !hasPlaceholder(value)) {
      if (!Number.isFinite(Number(value))) throw new ConfigEditError(`${at}.${k}: a number`, 400);
      value = Number(value);
    } else if (def.type === 'boolean') {
      if (!['true', 'false'].includes(value)) throw new ConfigEditError(`${at}.${k}: true or false`, 400);
      value = value === 'true';
    } else if (def.type === 'enum' && Array.isArray(def.values) && !def.values.map(String).includes(value)) {
      throw new ConfigEditError(`${at}.${k}: one of ${def.values.join(', ')}`, 400);
    }
    if (value === undefined) {
      if (map.has(k)) map.delete(k);
    } else if (current === undefined || current === null || String(current) !== String(value)) map.set(k, value);
  }
  return warnings;
}

const checkType = (w, at) => {
  if (typeof w?.type !== 'string' || !w.type.trim()) throw new ConfigEditError(`${at}: a widget needs a type`, 400);
};

// ---------------------------------------------------------------- a service's widget: / widgets:

/** A service's widgets as the form has them: [{ id, type, options, hidden, rest }]; ids widget or widgets/<n>. */
export function serviceWidgets(map, schemaFor) {
  if (!YAML.isMap(map)) return [];
  const one = map.get('widget', true);
  const list = map.get('widgets', true);
  return [...(one !== undefined ? [['widget', one]] : []), ...(YAML.isSeq(list) ? list.items.map((n, i) => [`widgets/${i}`, n]) : [])]
    .map(([id, n]) => ({ id, ...(YAML.isMap(n) ? widgetForm(n, String(n.get('type') ?? ''), schemaFor) : { type: '', options: {}, hidden: [], rest: [] }) }));
}

/**
 * Sets a service's widgets from the form in its map, keeping each widget's node. `widget:` stays
 * while there is one widget and no `widgets:` list. Returns the warnings.
 */
export function setServiceWidgets(doc, map, list, schemaFor, at, file) {
  if (!Array.isArray(list)) return [];
  const one = map.get('widget', true);
  const seq = map.get('widgets', true);
  const nodes = new Map([...(one !== undefined ? [['widget', one]] : []), ...(YAML.isSeq(seq) ? seq.items.map((n, i) => [`widgets/${i}`, n]) : [])]);
  const own = entries(nodes);
  const warnings = [];
  const out = list.map((w, i) => {
    const where = `${at}.widgets[${i}]`;
    checkType(w, where);
    const old = own.take(w.id, where);
    if (old && !YAML.isMap(old)) throw new ConfigEditError(`${where}: not a map; edit it as text`, 400);
    const node = old ?? doc.createNode({ type: w.type });
    if (String(node.get('type') ?? '') !== w.type) node.set('type', w.type);
    warnings.push(...applyOptions(node, w, schemaFor, where, file));
    return node;
  });
  if (out.length === 0) {
    map.delete('widget');
    map.delete('widgets');
  } else if (out.length === 1 && !YAML.isSeq(seq)) {
    if (one !== out[0]) map.set('widget', out[0]);
  } else {
    if (one !== undefined) map.delete('widget');
    if (YAML.isSeq(seq)) seq.items = out;
    else map.set('widgets', doc.createNode(out));
  }
  return warnings;
}

// ---------------------------------------------------------------- widgets.yaml: the header

/** The header widgets: { hash, widgets: [{ id, type, options, hidden, rest }] }; an id is a list position. */
export function readHeader(configDir, schemaFor = () => null) {
  const { doc, hash } = openYaml(configDir, HEADER, { shape: 'seq' });
  return {
    hash,
    widgets: doc.contents.items.map((node, i) => {
      const pair = single(node);
      if (!pair) return { id: String(i), type: '', options: {}, hidden: [], rest: [], other: String(node).trim() };
      return { id: String(i), ...widgetForm(YAML.isMap(pair.value) ? pair.value : null, keyName(pair), schemaFor) };
    }),
  };
}

/** Writes the header widgets from the form; each keeps its node (comments, other keys). */
export function writeHeader(configDir, list, hash, opts = {}, schemaFor = () => null) {
  if (!Array.isArray(list)) throw new ConfigEditError('expected the list of widgets', 400);
  const file = openYaml(configDir, HEADER, { shape: 'seq', hash });
  const { doc } = file;
  const own = entries(new Map(doc.contents.items.map((n, i) => [String(i), n])));
  const warnings = [];
  const items = list.map((w, i) => {
    const at = `[${i}]`;
    const node = own.take(w?.id, at);
    if (node && !single(node)) return node; // not a widget entry: kept as it is
    checkType(w, at);
    const item = node ?? doc.createNode({ [w.type]: null });
    const pair = single(item);
    rename(doc, pair, w.type);
    if (!YAML.isMap(pair.value)) {
      if (!Object.values(w.options ?? {}).some((v) => v !== '')) return item;
      pair.value = doc.createNode({});
    }
    warnings.push(...applyOptions(pair.value, w, schemaFor, `${at}.${w.type}`, HEADER));
    return item;
  });
  setItems(doc.contents, items);
  return file.save({ opts, warnings });
}

/**
 * A widget's options from its form, for a test run: hidden values (tokens) back to the values
 * `known` (secretsOf) has for them, numbers and switches as their type, variables filled in from
 * `env`. Returns { options, secrets } (the values to keep out of the answer).
 */
export function optionsForTest(type, given, { known, schemaFor, env }) {
  const schema = schemaFor(type) ?? {};
  const raw = {};
  for (const [k, v] of Object.entries(given && typeof given === 'object' ? given : {})) {
    if (typeof v !== 'string' || v.trim() === '') continue;
    let value = v.replace(TOKEN, (token) => String(known.get(token)?.value ?? token));
    if (schema[k]?.type === 'number' && Number.isFinite(Number(value))) value = Number(value);
    else if (schema[k]?.type === 'boolean') value = value === 'true';
    raw[k] = value;
  }
  const filled = substitute(raw, { env });
  return { options: filled.value, secrets: [...[...known.values()].map((x) => String(x.value)), ...filled.secrets] };
}
