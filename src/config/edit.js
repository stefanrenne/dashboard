// Writes the user's config files, for the settings page only (hard rule 5: never on its own,
// only on an admin's explicit save). Every write
//   - is for a config file (EDITABLE_FILES), custom.css / custom.js (CUSTOM_FILES, as text) or a
//     file a config file includes, on its resolved
//     path inside the folder (never plugins/ or .history/);
//   - is checked first, the way loadConfig loads it (an included file as part of the config
//     file it ends up in): a save that adds errors is refused;
//   - is refused with 409 when the file changed since the page read it (`hash`);
//   - keeps the previous version under .history/ (the newest HISTORY_KEEP per file);
//   - replaces the file atomically (a temporary file, then a rename).
// YAML goes through the Document API, so comments, key order, `!include` and
// `{{DASHBOARD_VAR_*}}` placeholders stay as they are.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { checkConfigFile } from './load.js';
import { CONFIG_FILES, CUSTOM_FILES, PLUGINS_DIR } from './schema.js';
import { listIncludes } from './include.js';
import { scrub, writeAtomic } from '../util.js';

export const EDITABLE_FILES = CONFIG_FILES.map((name) => `${name}.yaml`);
export const HISTORY_DIR = '.history';
export const HISTORY_KEEP = 10;

/** An error with the HTTP status the settings API answers with, and optional details. */
export class ConfigEditError extends Error {
  constructor(message, status = 400, details = {}) {
    super(message);
    this.status = status;
    Object.assign(this, details);
  }
}

const hashText = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);

/**
 * The files the settings page edits: the config files, then every file they `!include`
 * ({ file, root, from, at } as listIncludes gives them).
 */
export function editableFiles(configDir) {
  const included = listIncludes(configDir, EDITABLE_FILES).filter((e) => !EDITABLE_FILES.includes(e.file));
  return [...EDITABLE_FILES.map((file) => ({ file, root: file, from: null, at: '' })), ...CUSTOM_FILES.map((file) => ({ file, root: file, from: null, at: '' })), ...included];
}

/** The config file `file` ends up in, and where: { file, root, from, at }; null when not editable. */
export function editableFile(configDir, file) {
  return editableFiles(configDir).find((e) => e.file === file) ?? null;
}

/** The full path of an editable file; throws for anything else. */
export function configPath(configDir, file) {
  const root = path.resolve(configDir);
  const full = path.resolve(root, String(file));
  const rel = path.relative(root, full).split(path.sep).join('/');
  const inside = rel !== '' && !rel.startsWith('../') && !path.isAbsolute(rel) && rel === file;
  if (!inside || rel.startsWith(`${PLUGINS_DIR}/`) || rel.startsWith(`${HISTORY_DIR}/`)) throw new ConfigEditError(`${file}: not a file the settings page edits`, 404);
  if (!EDITABLE_FILES.includes(file) && !CUSTOM_FILES.includes(file) && !editableFile(configDir, file)) throw new ConfigEditError(`${file}: not a file the settings page edits`, 404);
  return full;
}

/** { file, text, hash, exists } of a config file; a missing file reads as empty. */
export function readConfigFile(configDir, file) {
  const full = configPath(configDir, file);
  let text = '';
  let exists = true;
  try {
    text = fs.readFileSync(full, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw new ConfigEditError(`${file}: cannot read (${err.code ?? err.message})`, 409);
    exists = false;
  }
  return { file, text, hash: hashText(text), exists };
}

/** The YAML document of `text`, for edits that keep comments; throws on a syntax error. */
export function parseDocument(text, file) {
  const doc = YAML.parseDocument(text);
  if (doc.errors.length) throw new ConfigEditError(`${file}: ${doc.errors[0].message.split('\n')[0]}`, 400);
  return doc;
}

export const documentText = (doc) => doc.toString({ lineWidth: 0 });

const key = (m) => `${m.file}\u0000${m.path}\u0000${m.message}`;

/**
 * Checks `text` as the new contents of `file`: { errors, warnings }, messages scrubbed of the
 * values that variables fill in. `errors` are only the ones the current file does not have yet:
 * a problem that was already there (say in an included file) does not block a save.
 */
export function checkConfigText(configDir, file, text, opts = {}) {
  configPath(configDir, file);
  if (CUSTOM_FILES.includes(file)) return { errors: [], warnings: [] };
  const { root } = editableFile(configDir, file);
  const name = root.replace(/\.yaml$/, '');
  const rootText = readConfigFile(configDir, root).text;
  const before = checkConfigFile(configDir, name, rootText, opts);
  const after = root === file ? checkConfigFile(configDir, name, text, opts) : checkConfigFile(configDir, name, rootText, { ...opts, overrides: { [file]: text } });
  const secrets = [...before.secrets, ...after.secrets];
  const clean = (list) => list.map((m) => ({ file: m.file, path: m.path, message: scrub(m.message, secrets) }));
  const known = new Set(before.errors.map(key));
  return { errors: clean(after.errors.filter((m) => !known.has(key(m)))), warnings: clean(after.warnings) };
}

// .history/ mirrors the folders: .history/services/media.yaml.<time> for services/media.yaml
const historyDir = (configDir, file) => path.join(path.resolve(configDir), HISTORY_DIR, path.dirname(file));

function keepHistory(configDir, file, text) {
  const dir = historyDir(configDir, file);
  fs.mkdirSync(dir, { recursive: true });
  // the name ends in the time, not in .yaml: the config watcher and loadConfig ignore it
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.basename(file);
  let name = `${base}.${stamp}`;
  for (let n = 1; fs.existsSync(path.join(dir, name)); n++) name = `${base}.${stamp}-${n}`;
  fs.writeFileSync(path.join(dir, name), text);
  for (const old of listHistory(configDir, file).slice(HISTORY_KEEP)) fs.rmSync(path.join(dir, old.id), { force: true });
}

/** The kept versions of `file`, newest first: [{ id, size, time }]. */
export function listHistory(configDir, file) {
  configPath(configDir, file);
  const dir = historyDir(configDir, file);
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const base = path.basename(file);
  return names
    .filter((n) => n.startsWith(`${base}.`) && /\.\d{4}-\d\d-\d\dT[\d-]+Z(-\d+)?$/.test(n.slice(base.length)))
    .map((id) => {
      const stat = fs.statSync(path.join(dir, id));
      return { id, size: stat.size, time: stat.mtime.toISOString() };
    })
    .sort((a, b) => (a.id < b.id ? 1 : -1));
}

export function readHistory(configDir, file, id) {
  if (!listHistory(configDir, file).some((v) => v.id === id)) throw new ConfigEditError(`${file}: no such earlier version`, 404);
  return fs.readFileSync(path.join(historyDir(configDir, file), id), 'utf8');
}

/**
 * Writes `text` into `file`. `hash` (from readConfigFile) refuses the save with 409 when the file
 * changed since. The new text is checked first (checkConfigText): a save that adds errors is refused.
 * Returns { hash, warnings, changed }; throws ConfigEditError (with `errors` for a refused check).
 */
/** Refuses a save made on a version of `file` other than `current` (409). */
export function sameVersion(file, hash, current) {
  if (hash !== undefined && hash !== current.hash) {
    throw new ConfigEditError(`${file} changed since it was opened: reload it and make your change again`, 409, { hash: current.hash });
  }
}

export function writeConfigFile(configDir, file, text, { hash, opts = {} } = {}) {
  const full = configPath(configDir, file);
  if (typeof text !== 'string') throw new ConfigEditError(`${file}: expected the file's text`);
  const current = readConfigFile(configDir, file);
  sameVersion(file, hash, current);
  const { errors, warnings } = checkConfigText(configDir, file, text, opts);
  if (errors.length) {
    const first = errors[0];
    throw new ConfigEditError(`${first.file}${first.path ? ` › ${first.path}` : ''}: ${first.message}`, 400, { errors, warnings });
  }
  if (current.exists && current.text === text) return { hash: current.hash, warnings, changed: false };
  if (current.exists) keepHistory(configDir, file, current.text);
  writeAtomic(full, text);
  return { hash: hashText(text), warnings, changed: true };
}
