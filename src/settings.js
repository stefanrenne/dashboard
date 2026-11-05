// The settings page (/settings): reads and writes settings.yaml for the fields it knows, keeping
// the file's comments and every other key (layout, plugins, providers, ...) as they are. Only the
// admin password's hash is ever written, and changing it needs the current one.

import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { parseDuration } from './util.js';
import { LANGUAGES, THEMES, COLORS } from './onboarding.js';

// the fields the page shows, by settings.yaml key; `at` is a path into the file when nested
export const FIELDS = {
  title: { type: 'string' },
  language: { type: 'enum', values: LANGUAGES },
  theme: { type: 'enum', values: THEMES },
  color: { type: 'enum', values: COLORS },
  showTitle: { type: 'boolean', default: true },
  headerStyle: { type: 'enum', values: ['boxed', 'clean'], default: 'boxed' },
  target: { type: 'enum', values: ['_blank', '_self', '_top'], default: '_blank' },
  statusStyle: { type: 'enum', values: ['', 'dot', 'basic'], default: '' },
  allowedHosts: { type: 'hosts' },
  login: { type: 'boolean', default: false },
  loginRemember: { type: 'duration', at: ['login', 'remember'], default: '7d' },
  actionsRemember: { type: 'duration', at: ['actions', 'remember'], default: '15m' },
  hideVersion: { type: 'boolean', default: false },
  disableUpdateCheck: { type: 'boolean', default: false },
  disableIndexing: { type: 'boolean', default: false },
};
const HOST = /^(\*|[a-z0-9.-]+(:\d{1,5})?|\[[0-9a-f:]+\](:\d{1,5})?)$/;

function readDoc(configDir) {
  const file = path.join(configDir, 'settings.yaml');
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  const doc = YAML.parseDocument(text);
  if (doc.errors.length) throw new Error(`settings.yaml: ${doc.errors[0].message.split('\n')[0]}`);
  if (doc.contents === null) doc.contents = doc.createNode({});
  if (!YAML.isMap(doc.contents)) throw new Error('settings.yaml: expected a map');
  return { file, doc };
}

function writeDoc(file, doc) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, doc.toString({ lineWidth: 0 }));
  fs.renameSync(tmp, file);
}

/** The page's fields as settings.yaml has them now, and the other keys it leaves alone. */
export function readSettings(configDir) {
  const { doc } = readDoc(configDir);
  const raw = doc.toJS() ?? {};
  const login = raw.login;
  const values = {
    title: typeof raw.title === 'string' ? raw.title : 'Homelab',
    language: LANGUAGES.includes(raw.language) ? raw.language : 'en',
    theme: THEMES.includes(raw.theme) ? raw.theme : 'auto',
    color: COLORS.includes(raw.color) ? raw.color : 'slate',
    showTitle: raw.showTitle !== false,
    headerStyle: raw.headerStyle === 'clean' ? 'clean' : 'boxed',
    target: ['_self', '_top'].includes(raw.target) ? raw.target : '_blank',
    statusStyle: ['dot', 'basic'].includes(raw.statusStyle) ? raw.statusStyle : '',
    allowedHosts: Array.isArray(raw.allowedHosts) ? raw.allowedHosts.map(String) : typeof raw.allowedHosts === 'string' ? raw.allowedHosts.split(',').map((h) => h.trim()).filter(Boolean) : [],
    login: login === true || (login !== null && typeof login === 'object'),
    loginRemember: typeof login?.remember === 'string' || typeof login?.remember === 'number' ? String(login.remember) : '7d',
    actionsRemember: raw.actions?.remember !== undefined ? String(raw.actions.remember) : '15m',
    hideVersion: raw.hideVersion === true,
    disableUpdateCheck: raw.disableUpdateCheck === true,
    disableIndexing: raw.disableIndexing === true,
  };
  const known = new Set([...Object.keys(FIELDS), 'login', 'actions', 'adminPassword']);
  return { values, other: Object.keys(raw).filter((k) => !known.has(k)), hasPassword: typeof raw.adminPassword === 'string' && raw.adminPassword !== '' };
}

/** Checks the page's values; { values } cleaned up, or { error }. */
export function checkSettings(input) {
  if (!input || typeof input !== 'object') return { error: 'expected the settings' };
  const out = {};
  for (const [key, def] of Object.entries(FIELDS)) {
    const v = input[key];
    if (v === undefined) continue;
    if (def.type === 'string') {
      if (typeof v !== 'string' || v.length > 100) return { error: `${key}: text of at most 100 characters` };
      out[key] = v.trim();
    } else if (def.type === 'enum') {
      if (!def.values.includes(v)) return { error: `${key}: one of ${def.values.filter(Boolean).join(', ')}` };
      out[key] = v;
    } else if (def.type === 'boolean') {
      if (typeof v !== 'boolean') return { error: `${key}: true or false` };
      out[key] = v;
    } else if (def.type === 'hosts') {
      const list = (Array.isArray(v) ? v : String(v).split(/[\s,]+/)).map((h) => String(h).trim().toLowerCase()).filter(Boolean);
      if (list.length > 20 || list.some((h) => !HOST.test(h))) return { error: `${key}: host names such as dash.lan` };
      out[key] = [...new Set(list)];
    } else if (def.type === 'duration') {
      const text = String(v).trim();
      try {
        if (text !== '0') parseDuration(text);
      } catch (err) {
        return { error: `${key}: ${err.message} (such as 15m, 7d or 0)` };
      }
      out[key] = text;
    }
  }
  return { values: out };
}

/** Writes the page's values into settings.yaml: set where they differ from the default, left out where not. */
export function writeSettings(configDir, values) {
  const { file, doc } = readDoc(configDir);
  for (const [key, v] of Object.entries(values)) {
    const def = FIELDS[key];
    if (key === 'login') continue; // with loginRemember below
    if (def.at) continue;
    if (key === 'allowedHosts') {
      if (v.length) doc.set(key, doc.createNode(v, { flow: true }));
      else doc.delete(key);
    } else if (def.default !== undefined && v === def.default) doc.delete(key);
    else doc.set(key, v);
  }
  if ('login' in values || 'loginRemember' in values) {
    const on = values.login ?? readSettings(configDir).values.login;
    const remember = values.loginRemember ?? '7d';
    if (!on) doc.set('login', false);
    else doc.set('login', remember === '7d' ? true : doc.createNode({ remember }, { flow: true }));
  }
  if ('actionsRemember' in values) {
    const actions = doc.get('actions');
    if (values.actionsRemember === '15m') {
      if (YAML.isMap(actions)) {
        actions.delete('remember');
        if (actions.items.length === 0) doc.delete('actions');
      }
    } else if (YAML.isMap(actions)) actions.set('remember', values.actionsRemember);
    else doc.set('actions', doc.createNode({ remember: values.actionsRemember }));
  }
  writeDoc(file, doc);
}

/** Writes a new admin password's hash into settings.yaml. */
export function writeAdminPassword(configDir, hash) {
  const { file, doc } = readDoc(configDir);
  doc.set('adminPassword', hash);
  writeDoc(file, doc);
}
