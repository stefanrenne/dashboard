// The plugins list of settings.yaml on the settings page: each entry's source (git, npm or a
// local path), subdir and only:, with what the lock file pinned it to. A source is checked as the
// installer reads it (parseSource). A save keeps the YAML node of every entry it had, so an
// entry's comments and keys the page does not know (label, ...) stay; entries are added,
// removed and reordered.

import YAML from 'yaml';
import { openYaml } from './yaml.js';
import { parseSource, readLock } from '../plugins/installer.js';

const FILE = 'settings.yaml';
const KINDS = ['git', 'npm', 'path'];
const isMap = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);


/** An entry as the page shows it: { kind, value, subdir, only: 'a, b' }. */
function formOf(entry) {
  const kind = typeof entry.path === 'string' ? 'path' : String(entry.source ?? '').startsWith('npm:') ? 'npm' : 'git';
  return {
    kind,
    value: kind === 'path' ? entry.path : String(entry.source ?? '').replace(/^(git\+|npm:)/, ''),
    subdir: typeof entry.subdir === 'string' ? entry.subdir : '',
    only: Array.isArray(entry.only) ? entry.only.map(String).join(', ') : '',
  };
}

/** The entry for the file: { source } or { path }, with subdir and only when set. */
function entryOf(form) {
  const out = form.kind === 'path' ? { path: form.value } : { source: `${form.kind === 'npm' ? 'npm:' : 'git+'}${form.value}` };
  if (form.subdir) out.subdir = form.subdir;
  const only = form.only.split(/[\s,]+/).filter(Boolean);
  if (only.length) out.only = only;
  return out;
}

const pinOf = (lock, entry) => {
  try {
    const record = lock[parseSource(entry).key];
    return record ? { tag: record.tag ?? null, commit: record.commit === undefined ? null : String(record.commit), version: record.version ?? null } : null;
  } catch {
    return null;
  }
};

/** The page's view: { entries: [{ index, kind, value, subdir, only, pin, error }] }. */
export function readPlugins(configDir) {
  const raw = openYaml(configDir, FILE, { shape: 'map' }).doc.toJS()?.plugins;
  const list = Array.isArray(raw) ? raw : [];
  const lock = readLock(configDir);
  const entries = list.map((entry, index) => {
    if (!isMap(entry)) return { index, kind: 'git', value: '', subdir: '', only: '', pin: null, error: 'expected "source:" or "path:"' };
    let error = null;
    try {
      parseSource(entry);
    } catch (err) {
      error = err.message;
    }
    return { index, ...formOf(entry), pin: pinOf(lock, entry), error };
  });
  return { entries };
}

/** Checks the page's list: { entries } cleaned up, or { error }. */
export function checkPlugins(input) {
  if (!Array.isArray(input) || input.length > 50) return { error: 'expected the list of plugins' };
  const out = [];
  for (const [i, e] of input.entries()) {
    if (!isMap(e) || !KINDS.includes(e.kind)) return { error: `plugins[${i}]: git, npm or path` };
    const form = { kind: e.kind, value: String(e.value ?? '').trim(), subdir: String(e.subdir ?? '').trim(), only: String(e.only ?? '').trim() };
    if (!form.value) return { error: `plugins[${i}]: ${e.kind === 'path' ? 'a folder' : 'a source'} is needed` };
    if ([form.value, form.subdir, form.only].some((s) => s.length > 500)) return { error: `plugins[${i}]: too long` };
    try {
      parseSource(entryOf(form));
    } catch (err) {
      return { error: `plugins[${i}]: ${err.message}` };
    }
    const index = Number.isInteger(e.index) && e.index >= 0 ? e.index : null;
    out.push({ ...form, index });
  }
  return { entries: out };
}

/** Writes the page's list into settings.yaml; nothing when it is the same. */
export function writePlugins(configDir, entries, hash) {
  const yaml = openYaml(configDir, FILE, { shape: 'map', hash });
  const { doc } = yaml;
  const current = doc.get('plugins', true);
  const old = YAML.isSeq(current) ? current.items : [];
  const items = entries.map((form) => {
    const want = entryOf(form);
    const node = form.index !== null && YAML.isMap(old[form.index]) ? old[form.index] : null;
    if (!node) return doc.createNode(want);
    // the entry's own node: only the keys the page edits change
    for (const key of ['source', 'path', 'subdir', 'only']) {
      if (want[key] === undefined) node.delete(key);
      else if (JSON.stringify(node.toJSON()[key]) !== JSON.stringify(want[key])) node.set(key, key === 'only' ? doc.createNode(want[key], { flow: true }) : want[key]);
    }
    return node;
  });
  if (YAML.isSeq(current)) {
    current.items = items;
    current.flow = items.length === 0 ? true : current.flow && items.every((i) => i.flow);
  } else doc.set('plugins', doc.createNode(items.length ? items : [], { flow: items.length === 0 }));
  return yaml.save();
}
