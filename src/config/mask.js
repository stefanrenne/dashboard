// Secrets in the config files the settings page shows (hard rule 1: they never reach the
// browser, not even an admin's). A secret written literally in a file is sent as a token,
// __SECRET_<id>__; a save puts the value back wherever the token now is, so moving a block keeps
// its secrets. A token the server does not know is refused. Placeholders such as
// {{DASHBOARD_VAR_KEY}} are no secret themselves and are sent as written.
//
// What counts as a secret:
//   - settings.yaml: `adminPassword`, everything under `providers`;
//   - proxmox.yaml: `secret` of each node;
//   - services.yaml (`widget:` / `widgets:`) and widgets.yaml: options the widget's
//     widget.yaml marks `secret: true`.
//
// Masking replaces the scalars' own source ranges, so the rest of the text stays byte for byte.

import crypto from 'node:crypto';
import YAML from 'yaml';
import { ConfigEditError } from './edit.js';

const KEY = crypto.randomBytes(32); // per process: a token means nothing outside this server
export const TOKEN = /__SECRET_([0-9a-f]{10})__/g;
const HAS_TOKEN = /__SECRET_[0-9a-f]{10}__/;
const PLACEHOLDER = /\{\{\s*(DASHBOARD|HOMEPAGE)_(VAR|FILE)_[A-Za-z0-9_]+\s*\}\}/;

export const tokenFor = (value) => `__SECRET_${crypto.createHmac('sha256', KEY).update(String(value)).digest('hex').slice(0, 10)}__`;
const keyOf = (pair) => (YAML.isScalar(pair.key) ? String(pair.key.value) : null);
const join = (p, k) => (typeof k === 'number' ? `${p}[${k}]` : p ? `${p}.${k}` : String(k));

/** `where`: a config file's name, or { file, root, at } for a file it includes (editableFiles). */
const whereOf = (where) => (typeof where === 'string' ? { file: where, root: where, at: '' } : where);

/**
 * Every scalar to hide in `doc`: [{ node, path }]. `schemaFor(type)` gives a widget's options. An
 * included file follows the rules of the config file it ends up in, at the place it is included.
 */
function secretScalars(doc, where, schemaFor) {
  const { root: file, at } = whereOf(where);
  const found = [];
  const all = (node, p) => {
    if (YAML.isScalar(node)) {
      const v = node.value;
      if ((typeof v === 'string' && v !== '' && !PLACEHOLDER.test(v)) || typeof v === 'number') found.push({ node, path: p });
    } else if (YAML.isMap(node)) node.items.forEach((pair) => all(pair.value, join(p, keyOf(pair))));
    else if (YAML.isSeq(node)) node.items.forEach((item, i) => all(item, join(p, i)));
  };
  const widgetOptions = (map, type, p) => {
    if (!YAML.isMap(map)) return;
    const schema = schemaFor(type) ?? {};
    for (const pair of map.items) {
      const k = keyOf(pair);
      if (k !== null && schema[k]?.secret) all(pair.value, join(p, k));
    }
  };
  const root = doc.contents;
  const last = at.split(/[.[\]]/).filter(Boolean).at(-1) ?? '';
  if (file === 'settings.yaml') {
    if (/^(adminPassword|providers)(\.|\[|$)/.test(at)) all(root, '');
    else if (at === '' && YAML.isMap(root)) for (const pair of root.items) if (['adminPassword', 'providers'].includes(keyOf(pair))) all(pair.value, keyOf(pair));
  } else if (file === 'proxmox.yaml') {
    const node = (map, p) => YAML.isMap(map) && map.items.forEach((pair) => keyOf(pair) === 'secret' && all(pair.value, join(p, 'secret')));
    if (last === 'secret') all(root, '');
    else if (at !== '' || (YAML.isMap(root) && root.has('url'))) node(root, '');
    else if (YAML.isMap(root)) root.items.forEach((pair) => node(pair.value, keyOf(pair)));
  } else if (file === 'widgets.yaml') {
    const item = (map, p) => YAML.isMap(map) && map.items.forEach((pair) => widgetOptions(pair.value, keyOf(pair), join(p, keyOf(pair))));
    const options = /^\[\d+\]\.([^.[]+)$/.exec(at);
    if (options) widgetOptions(root, options[1], '');
    else if (YAML.isSeq(root)) root.items.forEach((it, i) => item(it, join('', i)));
    else item(root, '');
  } else if (file === 'services.yaml') {
    const widget = (node, p) => YAML.isMap(node) && widgetOptions(node, String(node.get('type') ?? ''), p);
    const walk = (node, p) => {
      if (YAML.isSeq(node)) node.items.forEach((it, i) => walk(it, join(p, i)));
      else if (YAML.isMap(node)) {
        for (const pair of node.items) {
          const k = keyOf(pair);
          if (k === 'widget') widget(pair.value, join(p, k));
          else if (k === 'widgets' && YAML.isSeq(pair.value)) pair.value.items.forEach((w, i) => widget(w, join(join(p, k), i)));
          else walk(pair.value, join(p, k));
        }
      }
    };
    if (last === 'widget' || /\.widgets\[\d+\]$/.test(at)) widget(root, '');
    else if (last === 'widgets' && YAML.isSeq(root)) root.items.forEach((w, i) => widget(w, join('', i)));
    else walk(root, '');
  }
  return found;
}

function parse(text, file) {
  const doc = YAML.parseDocument(text);
  if (doc.errors.length) return null;
  return doc;
}

/** Replaces source ranges, from the end: [{ start, end, text }]. */
function splice(text, edits) {
  let out = text;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

/** The secrets of `text`: Map of token → { value, path }. */
export function secretsOf(file, text, schemaFor = () => null) {
  const doc = parse(text, file);
  const out = new Map();
  if (!doc) return out;
  for (const { node, path } of secretScalars(doc, file, schemaFor)) out.set(tokenFor(node.value), { value: node.value, path });
  return out;
}

/**
 * `text` with its secrets as tokens: { text, secrets: [paths] }. A file that does not parse
 * cannot be masked by its structure, so every value from the current secrets set is hidden
 * as text instead.
 */
export function maskConfigText(file, text, schemaFor = () => null, knownSecrets = []) {
  const doc = parse(text, file);
  if (!doc) {
    let out = text;
    for (const s of knownSecrets) if (s && s.length >= 3) out = out.split(s).join(tokenFor(s));
    return { text: out, secrets: [] };
  }
  const found = secretScalars(doc, file, schemaFor).filter(({ node }) => node.range);
  const edits = found.map(({ node }) => ({ start: node.range[0], end: node.range[1], text: tokenFor(node.value) }));
  return { text: splice(text, edits), secrets: found.map((f) => f.path) };
}

const render = (value) => (typeof value === 'number' ? String(value) : JSON.stringify(String(value)));

/**
 * Puts the secrets of `currentText` back into `newText` where their tokens are. Returns
 * { text, warnings }: a warning for each secret newly written into the file as it is (a
 * variable keeps it out of the file). Throws ConfigEditError for a token it does not know.
 */
export function unmaskConfigText(file, newText, currentText, schemaFor = () => null) {
  const known = secretsOf(file, currentText, schemaFor);
  const unknown = [...newText.matchAll(TOKEN)].map((m) => m[0]).find((t) => !known.has(t));
  if (unknown) throw new ConfigEditError(`${whereOf(file).file}: ${unknown} is not a hidden value of this file; type the secret again`, 400);
  let text = newText;
  const doc = parse(newText, file);
  if (doc && HAS_TOKEN.test(newText)) {
    const edits = [];
    YAML.visit(doc, {
      Scalar(_, node) {
        if (typeof node.value !== 'string' || !node.range || !node.value.includes('__SECRET_')) return;
        const whole = known.get(node.value);
        const value = whole ? whole.value : node.value.replace(TOKEN, (t) => String(known.get(t).value));
        edits.push({ start: node.range[0], end: node.range[1], text: render(value) });
      },
    });
    text = splice(newText, edits);
  } else if (!doc) {
    text = newText.replace(TOKEN, (t) => String(known.get(t).value));
  }
  const before = new Set([...known.values()].map((s) => String(s.value)));
  const warnings = [...secretsOf(file, text, schemaFor).values()]
    .filter((s) => !before.has(String(s.value)))
    .map((s) => ({ file: whereOf(file).file, path: s.path, message: 'a secret written into the file itself: a {{DASHBOARD_VAR_*}} variable keeps it out of the file' }));
  return { text, warnings };
}
