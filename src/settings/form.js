// The settings page (/settings): reads and writes settings.yaml for the fields it knows, keeping
// the file's comments and every other key (layout, plugins, providers, ...) as they are. Only the
// admin password's hash is ever written, and changing it needs the current one.

import YAML from 'yaml';
import { parseDuration } from '../util.js';
import { openYaml } from './yaml.js';
import {
  LANGUAGES, THEMES, COLORS, HEADER_STYLES, CARD_STYLES, BLOCK_STYLES, FONTS, ICON_STYLES, BOOKMARK_STYLES, STATUS_STYLES,
  TARGETS, SEARCH_PROVIDERS, BUTTON_POSITIONS, BLURS, MAX_GROUP_COLUMNS, DEFAULTS,
  HTTP_URL,
} from '../config/schema.js';

const optional = (values) => ['', ...values];

// The fields the page shows, by name. `at` is the path into the file (the name itself when left
// out); a value equal to `default` is left out of the file. `special` fields are written by code
// of their own below. Types: string, url (http or https, or empty), enum, boolean, tristate
// ('' leaves it out, 'true' or 'false'), int (min..max, '' leaves it out), duration (with
// `off` for false or 0), hosts, list (of maps with `keys`, `required` ones needed).
export const FIELDS = {
  title: { type: 'string', max: 100 },
  description: { type: 'string', default: '', max: 300 },
  favicon: { type: 'string', default: '' },
  startUrl: { type: 'string', default: '' },
  base: { type: 'url', default: '' },
  instanceName: { type: 'string', default: '' },
  language: { type: 'enum', values: LANGUAGES },
  theme: { type: 'enum', values: THEMES },
  color: { type: 'enum', values: COLORS },
  showTitle: { type: 'boolean', default: true },
  headerStyle: { type: 'enum', values: HEADER_STYLES, default: DEFAULTS.headerStyle },
  target: { type: 'enum', values: TARGETS, default: DEFAULTS.target },
  statusStyle: { type: 'enum', values: optional(STATUS_STYLES), default: '' },
  cardStyle: { type: 'enum', values: optional(CARD_STYLES), default: '' },
  blockStyle: { type: 'enum', values: optional(BLOCK_STYLES), default: '' },
  font: { type: 'enum', values: optional(FONTS), default: '' },
  iconStyle: { type: 'enum', values: ICON_STYLES, default: DEFAULTS.iconStyle },
  bookmarksStyle: { type: 'enum', values: optional(BOOKMARK_STYLES), default: '' },
  cardBlur: { type: 'enum', values: optional(BLURS), default: '' },
  backgroundImage: { type: 'string', at: ['background', 'image'], default: '', special: true },
  backgroundBlur: { type: 'enum', values: optional(BLURS), at: ['background', 'blur'], default: '', special: true },
  backgroundSaturate: { type: 'int', min: 0, max: 200, at: ['background', 'saturate'], default: '', special: true },
  backgroundBrightness: { type: 'int', min: 0, max: 200, at: ['background', 'brightness'], default: '', special: true },
  backgroundOpacity: { type: 'int', min: 0, max: 100, at: ['background', 'opacity'], default: '', special: true },
  fullWidth: { type: 'boolean', default: false },
  maxGroupColumns: { type: 'int', min: 1, max: MAX_GROUP_COLUMNS, default: '' },
  maxBookmarkGroupColumns: { type: 'int', min: 1, max: MAX_GROUP_COLUMNS, default: '' },
  useEqualHeights: { type: 'boolean', default: false },
  disableCollapse: { type: 'boolean', default: false },
  groupsInitiallyCollapsed: { type: 'boolean', default: false },
  showStats: { type: 'boolean', default: false },
  qlSearchDescriptions: { type: 'boolean', at: ['quicklaunch', 'searchDescriptions'], default: false },
  qlProvider: { type: 'enum', values: optional(SEARCH_PROVIDERS), at: ['quicklaunch', 'provider'], default: '' },
  qlUrl: { type: 'string', at: ['quicklaunch', 'url'], default: '' },
  qlSuggestionUrl: { type: 'string', at: ['quicklaunch', 'suggestionUrl'], default: '' },
  qlTarget: { type: 'enum', values: optional(TARGETS), at: ['quicklaunch', 'target'], default: '' },
  qlShowSearchSuggestions: { type: 'tristate', at: ['quicklaunch', 'showSearchSuggestions'], default: '' },
  qlHideInternetSearch: { type: 'boolean', at: ['quicklaunch', 'hideInternetSearch'], default: false },
  qlHideVisitURL: { type: 'boolean', at: ['quicklaunch', 'hideVisitURL'], default: false },
  qlMobileButtonPosition: { type: 'enum', values: optional(BUTTON_POSITIONS), at: ['quicklaunch', 'mobileButtonPosition'], default: '' },
  pwaIcons: { type: 'list', at: ['pwa', 'icons'], keys: ['src', 'sizes', 'type', 'purpose'], required: ['src'] },
  pwaShortcuts: { type: 'list', at: ['pwa', 'shortcuts'], keys: ['name', 'url', 'description'], required: ['name', 'url'] },
  allowedHosts: { type: 'hosts', special: true },
  login: { type: 'boolean', default: false, special: true },
  loginRemember: { type: 'duration', at: ['login', 'remember'], default: DEFAULTS.loginRemember, special: true },
  actionsRemember: { type: 'duration', at: ['actions', 'remember'], default: DEFAULTS.actionsRemember, special: true },
  hideVersion: { type: 'boolean', default: false },
  disableUpdateCheck: { type: 'boolean', default: false },
  disableIndexing: { type: 'boolean', default: false },
  pluginUpdateInterval: { type: 'duration', off: true, default: DEFAULTS.pluginUpdateInterval },
  discoveryInterval: { type: 'duration', at: ['discovery', 'interval'], default: DEFAULTS.discoveryInterval },
  logpath: { type: 'string', default: '' },
};
const HOST = /^(\*|[a-z0-9.-]+(:\d{1,5})?|\[[0-9a-f:]+\](:\d{1,5})?)$/;
const FILE = 'settings.yaml';
const pathOf = (key) => FIELDS[key].at ?? [key];
const getIn = (obj, at) => at.reduce((o, k) => (o !== null && typeof o === 'object' && !Array.isArray(o) ? o[k] : undefined), obj);


function formValue(def, v) {
  switch (def.type) {
    case 'string': case 'url': return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : def.default ?? '';
    case 'enum': return def.values.includes(v) ? v : def.default ?? def.values[0];
    case 'boolean': return typeof v === 'boolean' ? v : def.default;
    case 'tristate': return typeof v === 'boolean' ? String(v) : '';
    case 'int': return Number.isInteger(Number(v)) && v !== null && v !== '' && v !== undefined ? String(Number(v)) : '';
    case 'duration': return v === false || v === 0 ? (def.off ? 'off' : '0') : typeof v === 'string' || typeof v === 'number' ? String(v) : def.default;
    case 'list': return Array.isArray(v) ? v.filter((i) => i && typeof i === 'object').map((i) => Object.fromEntries(def.keys.map((k) => [k, i[k] === undefined ? '' : String(i[k])]))) : [];
    default: return v;
  }
}

/** The page's fields as settings.yaml has them now, and the other keys it leaves alone. */
export function readSettings(configDir) {
  const { doc } = openYaml(configDir, FILE, { shape: 'map' });
  const raw = doc.toJS() ?? {};
  const values = {};
  for (const [key, def] of Object.entries(FIELDS)) values[key] = formValue(def, getIn(raw, pathOf(key)));
  values.title = typeof raw.title === 'string' ? raw.title : DEFAULTS.title;
  if (typeof raw.background === 'string') values.backgroundImage = raw.background;
  values.allowedHosts = Array.isArray(raw.allowedHosts) ? raw.allowedHosts.map(String) : typeof raw.allowedHosts === 'string' ? raw.allowedHosts.split(',').map((h) => h.trim()).filter(Boolean) : [];
  const login = raw.login;
  values.login = login === true || (login !== null && typeof login === 'object');
  values.loginRemember = typeof login?.remember === 'string' || typeof login?.remember === 'number' ? String(login.remember) : DEFAULTS.loginRemember;
  const known = new Set([...Object.keys(FIELDS), ...Object.values(FIELDS).map((d) => d.at?.[0]).filter(Boolean), 'adminPassword']);
  return { values, other: Object.keys(raw).filter((k) => !known.has(k)), hasPassword: typeof raw.adminPassword === 'string' && raw.adminPassword !== '' };
}

function checkValue(key, def, v) {
  if (def.type === 'string' || def.type === 'url') {
    const max = def.max ?? 200;
    if (typeof v !== 'string' || v.length > max) return { error: `${key}: text of at most ${max} characters` };
    const text = v.trim();
    if (def.type === 'url' && text && !HTTP_URL.test(text)) return { error: `${key}: a full URL such as https://lab.example.com/dashboard/` };
    return { value: text };
  }
  if (def.type === 'enum') return def.values.includes(v) ? { value: v } : { error: `${key}: one of ${def.values.filter(Boolean).join(', ')}` };
  if (def.type === 'boolean') return typeof v === 'boolean' ? { value: v } : { error: `${key}: true or false` };
  if (def.type === 'tristate') return ['', 'true', 'false'].includes(v) ? { value: v } : { error: `${key}: empty, true or false` };
  if (def.type === 'int') {
    const text = String(v ?? '').trim();
    if (text === '') return { value: '' };
    const n = Number(text);
    return Number.isInteger(n) && n >= def.min && n <= def.max ? { value: String(n) } : { error: `${key}: a whole number from ${def.min} to ${def.max}` };
  }
  if (def.type === 'hosts') {
    const list = (Array.isArray(v) ? v : String(v).split(/[\s,]+/)).map((h) => String(h).trim().toLowerCase()).filter(Boolean);
    if (list.length > 20 || list.some((h) => !HOST.test(h))) return { error: `${key}: host names such as dash.lan` };
    return { value: [...new Set(list)] };
  }
  if (def.type === 'duration') {
    const text = String(v).trim();
    if (def.off && ['off', 'false', '0'].includes(text)) return { value: 'off' };
    try {
      if (text !== '0') parseDuration(text);
    } catch (err) {
      return { error: `${key}: ${err.message} (such as 15m, 7d${def.off ? ' or off' : ' or 0'})` };
    }
    return { value: text };
  }
  if (def.type === 'list') {
    if (!Array.isArray(v) || v.length > 30) return { error: `${key}: a list of at most 30 entries` };
    const out = [];
    for (const [i, item] of v.entries()) {
      if (!item || typeof item !== 'object') return { error: `${key}[${i}]: expected ${def.required.join(' and ')}` };
      const clean = Object.fromEntries(def.keys.map((k) => [k, typeof item[k] === 'string' ? item[k].trim().slice(0, 300) : '']));
      if (def.keys.every((k) => clean[k] === '')) continue;
      if (def.required.some((k) => clean[k] === '')) return { error: `${key}[${i}]: ${def.required.join(' and ')} needed` };
      out.push(clean);
    }
    return { value: out };
  }
  return { error: `${key}: unknown field` };
}

/** Checks the page's values; { values } cleaned up, or { error }. */
export function checkSettings(input) {
  if (!input || typeof input !== 'object') return { error: 'expected the settings' };
  const out = {};
  for (const [key, def] of Object.entries(FIELDS)) {
    if (input[key] === undefined) continue;
    const checked = checkValue(key, def, input[key]);
    if (checked.error) return { error: checked.error };
    out[key] = checked.value;
  }
  return { values: out };
}

function prune(doc, at) {
  for (let n = at.length - 1; n >= 1; n--) {
    const node = doc.getIn(at.slice(0, n));
    if (YAML.isMap(node) && node.items.length === 0) doc.deleteIn(at.slice(0, n));
    else break;
  }
}

function setIn(doc, at, value) {
  for (let n = 1; n < at.length; n++) if (!YAML.isMap(doc.getIn(at.slice(0, n)))) doc.setIn(at.slice(0, n), doc.createNode({}));
  doc.setIn(at, value);
}

/** The value the file gets for a field, or undefined to leave it out. */
function fileValue(doc, def, v) {
  if (def.type === 'tristate') return v === '' ? undefined : v === 'true';
  if (def.type === 'int') return v === '' ? undefined : Number(v);
  if (def.type === 'duration' && v === 'off') return false;
  if (def.type === 'list') {
    if (!v.length) return undefined;
    const seq = doc.createNode(v.map((i) => Object.fromEntries(Object.entries(i).filter(([, x]) => x !== ''))));
    for (const item of seq.items) item.flow = true; // - { src: /icons/app.png, sizes: 192x192 }, as in the docs
    return seq;
  }
  if (def.default !== undefined && v === def.default) return undefined;
  return v;
}

/** Writes the page's values into settings.yaml: set where they differ from the default, left out where not. */
export function writeSettings(configDir, values) {
  const yaml = openYaml(configDir, FILE, { shape: 'map' });
  const { doc } = yaml;
  // only what changed: the form sends every field, and a key it did not touch stays as written
  const before = readSettings(configDir).values;
  const changed = (key) => key in values && JSON.stringify(before[key]) !== JSON.stringify(values[key]);
  for (const [key, v] of Object.entries(values)) {
    const def = FIELDS[key];
    if (def.special || !changed(key)) continue;
    const at = pathOf(key);
    const value = fileValue(doc, def, v);
    if (value === undefined) {
      doc.deleteIn(at);
      prune(doc, at);
    } else setIn(doc, at, value);
  }
  if (changed('allowedHosts')) {
    if (values.allowedHosts.length) doc.set('allowedHosts', doc.createNode(values.allowedHosts, { flow: true }));
    else doc.delete('allowedHosts');
  }
  if (changed('login') || changed('loginRemember')) {
    const on = values.login ?? readSettings(configDir).values.login;
    const remember = values.loginRemember ?? DEFAULTS.loginRemember;
    if (!on) doc.set('login', false);
    else doc.set('login', remember === DEFAULTS.loginRemember ? true : doc.createNode({ remember }, { flow: true }));
  }
  if (changed('actionsRemember')) {
    const actions = doc.get('actions');
    if (values.actionsRemember === DEFAULTS.actionsRemember) {
      if (YAML.isMap(actions)) {
        actions.delete('remember');
        if (actions.items.length === 0) doc.delete('actions');
      }
    } else if (YAML.isMap(actions)) actions.set('remember', values.actionsRemember);
    else doc.set('actions', doc.createNode({ remember: values.actionsRemember }));
  }
  writeBackground(doc, Object.fromEntries(BACKGROUND.filter(changed).map((k) => [k, values[k]])));
  return yaml.save();
}

// background: a text (homepage's short form) while only the image is set, else a map
const BACKGROUND = ['backgroundImage', 'backgroundBlur', 'backgroundSaturate', 'backgroundBrightness', 'backgroundOpacity'];
function writeBackground(doc, values) {
  if (!BACKGROUND.some((k) => k in values)) return;
  const current = doc.get('background', true);
  const raw = YAML.isScalar(current) ? { image: current.value } : YAML.isMap(current) ? current.toJSON() : {};
  for (const key of BACKGROUND) {
    if (!(key in values)) continue;
    const name = FIELDS[key].at[1];
    const value = fileValue(doc, FIELDS[key], values[key]);
    if (value === undefined) delete raw[name];
    else raw[name] = value;
  }
  if (!raw.image) doc.delete('background');
  else if (Object.keys(raw).length === 1) doc.set('background', raw.image);
  else if (YAML.isMap(current)) {
    for (const key of BACKGROUND) {
      const name = FIELDS[key].at[1];
      if (raw[name] === undefined) current.delete(name);
      else current.set(name, raw[name]);
    }
  } else doc.set('background', doc.createNode(raw));
}

export function writeAdminPassword(configDir, hash) {
  const yaml = openYaml(configDir, FILE, { shape: 'map' });
  yaml.doc.set('adminPassword', hash);
  return yaml.save();
}
