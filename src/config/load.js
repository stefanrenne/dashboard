// Loads and normalizes the YAML files in the config directory.
//
// The file formats are a contract with existing installations (hard rule 6): see
// docs/configuration/. Problems never throw; they are collected as `errors`
// (the file or entry is skipped) and `warnings` (it is used anyway), each with the
// file and a path into it, so the dashboard can show them.

import fs from 'node:fs';
import path from 'node:path';
import { substitute, VARIABLE_NAME } from './vars.js';
import { parseConfigYaml, resolveIncludes } from './include.js';
import { isPlainObject, parseDuration } from '../util.js';
import { parseFilter } from '../filter.js';
import { LANGUAGE_ALIASES, BOOKMARK_FIELDS, HTTP_URL, DOCKER_PORT, BACKGROUND_MAX, MIN_DURATIONS, CONFIG_FILES, DEFAULTS, LANGUAGES, THEMES, COLORS, HEADER_STYLES, CARD_STYLES, BLOCK_STYLES, FONTS, ICON_STYLES, BOOKMARK_STYLES, STATUS_STYLES, TARGETS, KUBERNETES_MODES, SEARCH_PROVIDERS, BUTTON_POSITIONS, HIGHLIGHT_LEVELS, BLUR_PX, MAX_GROUP_COLUMNS, SCRYPT_HASH, SERVICE_FIELDS, TAB_KEYS } from './schema.js';


const DEFAULT_SETTINGS = {
  title: DEFAULTS.title,
  language: DEFAULTS.language,
  theme: DEFAULTS.theme,
  color: DEFAULTS.color,
  target: DEFAULTS.target,
  showTitle: true,
  headerStyle: DEFAULTS.headerStyle,
  layout: {},
  plugins: [],
  pluginUpdateInterval: DEFAULTS.pluginUpdateInterval,
  discovery: { interval: DEFAULTS.discoveryInterval },
};

// settings.yaml keys that take one value of a list (DEFAULTS has the fallback, when there is one)
const SETTING_CHOICES = [
  ['language', LANGUAGES], ['theme', THEMES], ['color', COLORS], ['headerStyle', HEADER_STYLES], ['target', TARGETS],
  ['cardStyle', CARD_STYLES], ['blockStyle', BLOCK_STYLES], ['font', FONTS], ['iconStyle', ICON_STYLES],
  ['bookmarksStyle', BOOKMARK_STYLES], ['statusStyle', STATUS_STYLES],
];

/**
 * A duration setting in ms. `fallback` and `min` are written as durations (15m, 7d), `fallback` from
 * DEFAULTS; `off` lets false and 0 turn it off (0 ms).
 */
function durationSetting(value, { file, at, fallback, off = false, min = null }, ctx) {
  const fallbackMs = parseDuration(fallback);
  if (off && (value === false || value === 0 || value === '0')) return 0;
  let ms;
  try {
    ms = parseDuration(value, fallbackMs);
  } catch (err) {
    ctx.warn(file, at, `${err.message}; using ${fallback}`);
    return fallbackMs;
  }
  if (min && ms < parseDuration(min)) {
    ctx.warn(file, at, `at least ${min}; using that`);
    return parseDuration(min);
  }
  return ms;
}

/** settings.yaml `actions: { remember }`: how long a correct admin password unlocks a browser; 0 asks every time. */
function actionRememberMs(actions, file, ctx) {
  const fallback = DEFAULTS.actionsRemember;
  if (actions === undefined) return parseDuration(fallback);
  if (!isPlainObject(actions)) {
    ctx.warn(file, 'actions', `expected a map such as { remember: ${fallback} }, ignored`);
    return parseDuration(fallback);
  }
  for (const key of Object.keys(actions)) if (key !== 'remember') ctx.warn(file, `actions.${key}`, 'unknown key, ignored');
  return durationSetting(actions.remember, { file, at: 'actions.remember', fallback, off: true }, ctx);
}

/** settings.yaml `allowedHosts`: a list or comma-separated names, or `*`; null when not set. */
function allowedHostsSetting(value, file, ctx) {
  if (value === undefined || value === null) return null;
  const list = (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null);
  if (!list || list.some((h) => typeof h !== 'string')) {
    ctx.warn(file, 'allowedHosts', 'expected a list of host names, such as [dash.lan], or "*"; ignored');
    return null;
  }
  return list.map((h) => h.trim().toLowerCase()).filter(Boolean);
}

/**
 * settings.yaml `adminPassword`: only the scrypt hash src/hash-password.mjs (or the setup wizard)
 * makes, never the password itself. A plain one is refused: the presses it guards stay locked.
 */
function adminPasswordSetting(value, file, ctx) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !SCRYPT_HASH.test(value.trim())) {
    ctx.error(file, 'adminPassword', 'expected the scrypt hash of the password (node src/hash-password.mjs), not the password itself; what asks for it stays locked');
    return { broken: true };
  }
  return { value: value.trim(), hashed: true };
}

/** settings.yaml `login`: true, false, or { remember: 7d }: a login page with the admin password. */
function loginSetting(value, file, ctx) {
  const off = { required: false, rememberMs: parseDuration(DEFAULTS.loginRemember) };
  if (value === undefined || value === false || value === null) return off;
  if (value === true) return { ...off, required: true };
  if (!isPlainObject(value)) {
    ctx.warn(file, 'login', 'expected true, false or { remember: 7d }; no login page');
    return off;
  }
  for (const key of Object.keys(value)) if (key !== 'remember') ctx.warn(file, `login.${key}`, 'unknown key, ignored');
  return { required: true, rememberMs: durationSetting(value.remember, { file, at: 'login.remember', fallback: DEFAULTS.loginRemember, min: MIN_DURATIONS.loginRemember }, ctx) };
}

/** One file's text → its value with includes and variables resolved; undefined when it does not parse. */
function parseFile(dir, file, text, opts, out) {
  let parsed;
  try {
    parsed = parseConfigYaml(text);
  } catch (err) {
    const line = err.linePos?.[0]?.line;
    out.errors.push({ file, path: line ? `line ${line}` : '', message: err.message.split('\n')[0] });
    return undefined;
  }
  parsed = resolveIncludes(parsed, { configDir: dir, file, errors: out.errors, overrides: opts.overrides });
  const sub = substitute(parsed, opts);
  for (const s of sub.secrets) out.secrets.add(s);
  for (const w of sub.warnings) out.warnings.push({ file, path: '', message: w });
  return sub.value;
}

// each file's normalizer: (raw, ctx, configDir) → its part of the config
const NORMALIZE = {
  settings: normalizeSettings,
  services: normalizeServices,
  widgets: normalizeHeaderWidgets,
  bookmarks: normalizeBookmarks,
  docker: normalizeDocker,
  kubernetes: normalizeKubernetes,
  proxmox: normalizeProxmox,
};

function collector() {
  const out = { errors: [], warnings: [], secrets: new Set() };
  out.ctx = {
    error: (file, p, message) => out.errors.push({ file, path: p, message }),
    warn: (file, p, message) => out.warnings.push({ file, path: p, message }),
  };
  return out;
}

export function loadConfig(dir, opts = {}) {
  const out = collector();
  const raw = {};
  for (const name of CONFIG_FILES) {
    const file = `${name}.yaml`;
    let text;
    try {
      text = fs.readFileSync(path.join(dir, file), 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') out.errors.push({ file, path: '', message: `cannot read: ${err.code || err.message}` });
      continue;
    }
    raw[name] = parseFile(dir, file, text, opts, out);
  }
  const config = {};
  for (const name of CONFIG_FILES) config[name] = NORMALIZE[name](raw[name], out.ctx, dir);
  return { ...config, errors: out.errors, warnings: out.warnings, secrets: out.secrets };
}

/**
 * Checks `text` as the new contents of config file `name` ('services', ...) the way loadConfig
 * loads it: { errors, warnings, secrets }, each message with its file and a path into it.
 */
export function checkConfigFile(dir, name, text, opts = {}) {
  if (!NORMALIZE[name]) throw new Error(`not a config file: ${name}`);
  const out = collector();
  const raw = parseFile(dir, `${name}.yaml`, text, opts, out);
  NORMALIZE[name](raw, out.ctx, dir);
  return { errors: out.errors, warnings: out.warnings, secrets: out.secrets, raw };
}

/** `- Key: value` entries: a list of single-key maps. Returns [[key, value, index]]. */
function singleKeyEntries(list, file, p, ctx) {
  if (list === undefined || list === null) return [];
  if (!Array.isArray(list)) {
    ctx.error(file, p, 'expected a list');
    return [];
  }
  const out = [];
  list.forEach((entry, i) => {
    if (!isPlainObject(entry) || Object.keys(entry).length !== 1) {
      ctx.error(file, `${p}[${i}]`, 'expected an entry like "- Name: ..."');
      return;
    }
    const [key, value] = Object.entries(entry)[0];
    out.push([key, value, i]);
  });
  return out;
}

function normalizeSettings(raw, ctx) {
  const file = 'settings.yaml';
  if (raw === undefined || raw === null) raw = {};
  if (!isPlainObject(raw)) {
    ctx.error(file, '', 'expected a map of settings');
    raw = {};
  }
  const settings = { ...DEFAULT_SETTINGS, ...raw };
  settings.discovery = { ...DEFAULT_SETTINGS.discovery, ...(isPlainObject(raw.discovery) ? raw.discovery : {}) };
  settings.discoveryMs = durationSetting(settings.discovery.interval, { file, at: 'discovery.interval', fallback: DEFAULTS.discoveryInterval, min: MIN_DURATIONS.discoveryInterval }, ctx);
  settings.language = LANGUAGE_ALIASES[settings.language] ?? settings.language;
  for (const [key, values] of SETTING_CHOICES) {
    if (settings[key] === undefined || values.includes(settings[key])) continue;
    const fallback = DEFAULTS[key];
    ctx.warn(file, key, `unknown ${key} "${settings[key]}" (${values.join(', ')}); ${fallback ? `using ${fallback}` : 'ignored'}`);
    if (fallback) settings[key] = fallback;
    else delete settings[key];
  }
  settings.showTitle = settings.showTitle !== false;
  for (const key of ['description', 'favicon', 'startUrl', 'instanceName', 'base', 'logpath']) {
    if (settings[key] === undefined || settings[key] === null) delete settings[key];
    else if (typeof settings[key] !== 'string') {
      ctx.warn(file, key, 'expected text, ignored');
      delete settings[key];
    } else settings[key] = settings[key].trim();
  }
  if (settings.base !== undefined && !HTTP_URL.test(settings.base)) {
    ctx.warn(file, 'base', 'expected a full URL such as https://lab.example.com/dashboard/, ignored');
    delete settings.base;
  } else if (settings.base && !settings.base.endsWith('/')) settings.base += '/';
  settings.pwa = normalizePwa(settings.pwa, file, ctx);
  settings.pluginUpdateMs = durationSetting(settings.pluginUpdateInterval, { file, at: 'pluginUpdateInterval', fallback: DEFAULTS.pluginUpdateInterval, off: true, min: MIN_DURATIONS.pluginUpdateInterval }, ctx);
  settings.actionRememberMs = actionRememberMs(settings.actions, file, ctx);
  delete settings.actions;
  settings.allowedHosts = allowedHostsSetting(settings.allowedHosts, file, ctx);
  settings.adminPassword = adminPasswordSetting(settings.adminPassword, file, ctx);
  settings.login = loginSetting(settings.login, file, ctx);
  for (const key of ['fullWidth', 'useEqualHeights', 'disableCollapse', 'groupsInitiallyCollapsed', 'showStats', 'hideVersion', 'disableUpdateCheck', 'disableIndexing']) {
    if (settings[key] !== undefined && typeof settings[key] !== 'boolean') {
      ctx.warn(file, key, 'expected true or false, ignored');
      delete settings[key];
    }
  }
  for (const key of ['maxGroupColumns', 'maxBookmarkGroupColumns']) {
    if (settings[key] === undefined) continue;
    const n = Number(settings[key]);
    if (!Number.isInteger(n) || n < 1 || n > MAX_GROUP_COLUMNS) {
      ctx.warn(file, key, `expected a whole number up to ${MAX_GROUP_COLUMNS}, ignored`);
      delete settings[key];
    } else settings[key] = n;
  }
  if (settings.blockHighlights !== undefined) {
    const levels = isPlainObject(settings.blockHighlights) && isPlainObject(settings.blockHighlights.levels) ? settings.blockHighlights.levels : null;
    if (!levels) ctx.warn(file, 'blockHighlights', `expected levels: { ${HIGHLIGHT_LEVELS.join(', ')} }, ignored`);
    settings.blockHighlights = { levels: {} };
    for (const [level, classes] of Object.entries(levels ?? {})) {
      if (HIGHLIGHT_LEVELS.includes(level) && typeof classes === 'string') settings.blockHighlights.levels[level] = classes;
      else ctx.warn(file, `blockHighlights.levels.${level}`, `expected ${HIGHLIGHT_LEVELS.join(', ')} with Tailwind classes, ignored`);
    }
  }
  settings.quicklaunch = normalizeQuicklaunch(settings.quicklaunch, file, ctx);
  if (settings.providers !== undefined && !isPlainObject(settings.providers)) {
    ctx.warn(file, 'providers', 'expected a map of provider name to a key or a map of options, ignored');
    delete settings.providers;
  }
  settings.background = normalizeBackground(settings.background, file, ctx);
  settings.cardBlur = blurPx(settings.cardBlur, file, 'cardBlur', ctx);
  // homepage also takes the layout block as a list (- Group: {...}), to set the order
  if (Array.isArray(settings.layout)) {
    const map = {};
    settings.layout.forEach((entry, i) => {
      if (isPlainObject(entry) && Object.keys(entry).length === 1) {
        const [name, value] = Object.entries(entry)[0];
        map[name] = isPlainObject(value) ? value : {};
      } else if (typeof entry === 'string') map[entry] = {};
      else ctx.warn(file, `layout[${i}]`, 'expected an entry like "- Group name:", ignored');
    });
    settings.layout = map;
  }
  if (!isPlainObject(settings.layout)) {
    ctx.error(file, 'layout', 'expected a map of group name to layout');
    settings.layout = {};
  }
  for (const [name, value] of Object.entries(settings.layout)) if (value === null) settings.layout[name] = {};
  settings.tabs = normalizeTabs(settings.tabs, file, ctx);
  if (settings.plugins === null) settings.plugins = []; // `plugins:` with every entry commented out
  if (!Array.isArray(settings.plugins)) {
    ctx.error(file, 'plugins', 'expected a list');
    settings.plugins = [];
  }
  settings.plugins = settings.plugins.filter((p, i) => {
    if (isPlainObject(p) && (typeof p.source === 'string' || typeof p.path === 'string')) return true;
    ctx.error(file, `plugins[${i}]`, 'expected "source: <git+url#ref | npm:name@version>" or "path: <folder>"');
    return false;
  });
  return settings;
}

/**
 * `tabs:`, the tab bar's order and each tab's icon and whether it opens first: a list of names, or
 * of maps with `name`, `icon` and `default`. Tabs that layout groups name without being listed here
 * come after these (layout.js). Returns [{ name, icon?, default? }].
 */
function normalizeTabs(raw, file, ctx) {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    ctx.warn(file, 'tabs', 'expected a list of tab names, or of maps with name, icon and default; ignored');
    return [];
  }
  const tabs = [];
  raw.forEach((entry, i) => {
    const at = `tabs[${i}]`;
    const tab = typeof entry === 'string' || typeof entry === 'number' ? { name: String(entry) } : isPlainObject(entry) ? { ...entry } : null;
    const name = typeof tab?.name === 'string' || typeof tab?.name === 'number' ? String(tab.name).trim() : '';
    if (!name) return ctx.warn(file, at, 'expected a tab name, or a map with name (and icon, default); ignored');
    if (tabs.some((t) => t.name === name)) return ctx.warn(file, at, `tab "${name}" is listed twice; the first one counts`);
    for (const key of Object.keys(tab)) if (!TAB_KEYS.includes(key)) ctx.warn(file, `${at}.${key}`, 'unknown key, ignored');
    const out = { name };
    if (tab.icon !== undefined && tab.icon !== null) {
      if (typeof tab.icon === 'string' && tab.icon.trim()) out.icon = tab.icon.trim();
      else ctx.warn(file, `${at}.icon`, 'expected an icon name or URL, ignored');
    }
    if (tab.default !== undefined) {
      if (typeof tab.default !== 'boolean') ctx.warn(file, `${at}.default`, 'expected true or false, ignored');
      else if (tab.default && tabs.some((t) => t.default)) ctx.warn(file, `${at}.default`, `"${tabs.find((t) => t.default).name}" opens first already; ignored`);
      else if (tab.default) out.default = true;
    }
    tabs.push(out);
  });
  return tabs;
}

/** homepage's `quicklaunch:` (the launcher that opens when typing on the page). */
function normalizeQuicklaunch(raw, file, ctx) {
  if (raw === undefined || raw === null) return {};
  if (!isPlainObject(raw)) {
    ctx.warn(file, 'quicklaunch', 'expected a map, ignored');
    return {};
  }
  const out = {};
  for (const key of ['searchDescriptions', 'hideInternetSearch', 'hideVisitURL', 'showSearchSuggestions']) {
    if (raw[key] === undefined) continue;
    if (typeof raw[key] === 'boolean') out[key] = raw[key];
    else ctx.warn(file, `quicklaunch.${key}`, 'expected true or false, ignored');
  }
  if (raw.provider !== undefined) {
    if (SEARCH_PROVIDERS.includes(raw.provider)) out.provider = raw.provider;
    else ctx.warn(file, 'quicklaunch.provider', `expected ${SEARCH_PROVIDERS.join(', ')}, ignored`);
  }
  for (const key of ['url', 'suggestionUrl']) if (typeof raw[key] === 'string') out[key] = raw[key];
  if (TARGETS.includes(raw.target)) out.target = raw.target;
  if (raw.mobileButtonPosition !== undefined) {
    if (BUTTON_POSITIONS.includes(raw.mobileButtonPosition)) out.mobileButtonPosition = raw.mobileButtonPosition;
    else ctx.warn(file, 'quicklaunch.mobileButtonPosition', `expected ${BUTTON_POSITIONS.join(', ')}, ignored`);
  }
  if (out.provider === 'custom' && !out.url) {
    ctx.warn(file, 'quicklaunch.url', 'provider custom needs a url, internet search is off');
    delete out.provider;
  }
  return out;
}

function blurPx(value, file, p, ctx) {
  if (value === undefined || value === null) return null;
  const px = BLUR_PX[String(value)];
  if (px === undefined) {
    ctx.warn(file, p, `unknown blur "${value}" (${Object.keys(BLUR_PX).filter(Boolean).join(', ')}), ignored`);
    return null;
  }
  return px;
}

/** `background: <url>` or homepage's `{ image, blur, saturate, brightness, opacity }`. */
function normalizeBackground(raw, file, ctx) {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'string') return { image: raw };
  if (!isPlainObject(raw) || typeof raw.image !== 'string') {
    ctx.warn(file, 'background', 'expected an image URL, or a map with image, blur, saturate, brightness, opacity; ignored');
    return null;
  }
  const background = { image: raw.image };
  const blur = blurPx(raw.blur, file, 'background.blur', ctx);
  if (blur !== null) background.blur = blur;
  for (const [key, max] of Object.entries(BACKGROUND_MAX)) {
    if (raw[key] === undefined || raw[key] === null) continue;
    const n = Number(raw[key]);
    if (!Number.isFinite(n) || n < 0 || n > max) ctx.warn(file, `background.${key}`, `expected a number from 0 to ${max}, ignored`);
    else background[key] = n;
  }
  return background;
}

/** homepage's `pwa:`: `icons` [{ src, type, sizes }] and `shortcuts` [{ name, url, description }]. */
function normalizePwa(raw, file, ctx) {
  if (raw === undefined || raw === null) return {};
  if (!isPlainObject(raw)) {
    ctx.warn(file, 'pwa', 'expected a map with icons and shortcuts, ignored');
    return {};
  }
  const list = (key, required, optional) => {
    if (raw[key] === undefined) return [];
    if (!Array.isArray(raw[key])) {
      ctx.warn(file, `pwa.${key}`, 'expected a list, ignored');
      return [];
    }
    return raw[key].flatMap((item, i) => {
      if (!isPlainObject(item) || required.some((k) => typeof item[k] !== 'string')) {
        ctx.warn(file, `pwa.${key}[${i}]`, `expected ${required.join(' and ')}, ignored`);
        return [];
      }
      return [Object.fromEntries([...required, ...optional].filter((k) => item[k] !== undefined).map((k) => [k, String(item[k])]))];
    });
  };
  return { icons: list('icons', ['src'], ['type', 'sizes', 'purpose']), shortcuts: list('shortcuts', ['name', 'url'], ['description']) };
}

function normalizeServices(raw, ctx) {
  const file = 'services.yaml';
  return singleKeyEntries(raw, file, '', ctx).map(([name, list, gi]) => normalizeGroup(name, list, file, `[${gi}].${name}`, ctx));
}

/**
 * A group: its services, and nested groups (homepage's format: an entry whose value is a list
 * instead of a map), in { name, services, groups }.
 */
function normalizeGroup(name, list, file, p, ctx) {
  const group = { name: String(name), services: [], groups: [] };
  for (const [itemName, def, i] of singleKeyEntries(list, file, p, ctx)) {
    if (Array.isArray(def)) group.groups.push(normalizeGroup(itemName, def, file, `${p}[${i}].${itemName}`, ctx));
    else {
      const service = normalizeService(itemName, def ?? {}, file, `${p}[${i}].${itemName}`, ctx);
      if (service) group.services.push(service);
    }
  }
  return group;
}

export function normalizeService(name, def, file, p, ctx) {
  if (!isPlainObject(def)) {
    ctx.error(file, p, 'expected a map with href, icon, widget, ...');
    return null;
  }
  for (const key of Object.keys(def)) {
    if (!(key in SERVICE_FIELDS) && key !== 'widget' && key !== 'widgets') ctx.warn(file, `${p}.${key}`, 'unknown key, ignored');
  }
  const service = { name: String(name) };
  for (const [key, kind] of Object.entries(SERVICE_FIELDS)) {
    const v = def[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(kind)) {
      if (kind.includes(v)) service[key] = v;
      else ctx.warn(file, `${p}.${key}`, `expected ${kind.join(', ')}, ignored`);
    } else if (kind === 'boolean') {
      if (typeof v === 'boolean') service[key] = v;
      else ctx.warn(file, `${p}.${key}`, 'expected true or false, ignored');
    } else if (kind === 'flag') {
      if (v === true || v === 'true') service[key] = true;
    } else if (kind === 'number') {
      if (Number.isFinite(Number(v))) service[key] = Number(v);
      else ctx.warn(file, `${p}.${key}`, 'expected a number, ignored');
    } else if (kind === 'filter') {
      try {
        if (typeof v !== 'string') throw new Error('expected an expression, such as widget.update == false');
        service.filter = parseFilter(v);
      } catch (err) {
        ctx.error(file, `${p}.filter`, `${err.message}; the service is shown unfiltered`);
      }
    } else service[key] = String(v);
  }
  const widgets = [];
  if (def.widget !== undefined) widgets.push([def.widget, `${p}.widget`]);
  if (def.widgets !== undefined) {
    if (Array.isArray(def.widgets)) def.widgets.forEach((w, i) => widgets.push([w, `${p}.widgets[${i}]`]));
    else ctx.error(file, `${p}.widgets`, 'expected a list');
  }
  service.widgets = [];
  for (const [w, wp] of widgets) {
    if (!isPlainObject(w) || typeof w.type !== 'string') {
      ctx.error(file, wp, 'a widget needs a "type"');
      continue;
    }
    const { type, ...options } = w;
    service.widgets.push({ type, options, path: wp });
  }
  return service;
}

function normalizeHeaderWidgets(raw, ctx) {
  const file = 'widgets.yaml';
  return singleKeyEntries(raw, file, '', ctx).map(([type, options, i]) => {
    if (options !== null && options !== undefined && !isPlainObject(options)) {
      ctx.error(file, `[${i}].${type}`, 'expected a map of options');
      options = {};
    }
    return { type, options: options ?? {}, path: `[${i}].${type}` };
  });
}

function normalizeBookmarks(raw, ctx) {
  const file = 'bookmarks.yaml';
  const groups = [];
  for (const [groupName, list, gi] of singleKeyEntries(raw, file, '', ctx)) {
    const group = { name: String(groupName), bookmarks: [] };
    for (const [name, def, bi] of singleKeyEntries(list, file, `[${gi}].${groupName}`, ctx)) {
      // homepage style is a one-item list (`- abbr: GH`), a plain map is accepted too.
      const body = Array.isArray(def) ? def[0] : def;
      if (!isPlainObject(body) || typeof body.href !== 'string') {
        ctx.error(file, `[${gi}].${groupName}[${bi}].${name}`, 'a bookmark needs an "href"');
        continue;
      }
      group.bookmarks.push({ name: String(name), ...Object.fromEntries(BOOKMARK_FIELDS.filter((k) => k === 'href' || body[k]).map((k) => [k, String(body[k])])) });
    }
    groups.push(group);
  }
  return groups;
}

/**
 * `allowVariables:` of a discovery source: the {{DASHBOARD_VAR_*}} / {{DASHBOARD_FILE_*}} names its
 * labels may use (`true`: all). Without it labels use none: whoever starts a container (or builds
 * its image) could otherwise send any secret of the dashboard to a server of their choice.
 */
function allowVariables(raw, file, p, ctx) {
  if (raw === undefined || raw === null || raw === false) return {};
  if (raw === true) return { allowVariables: true };
  const names = [];
  for (const item of Array.isArray(raw) ? raw : [raw]) {
    const name = String(item).trim().replace(/^\{\{\s*|\s*\}\}$/g, '');
    if (VARIABLE_NAME.test(name)) names.push(name);
    else ctx.warn(file, p, `"${item}" is not a variable name such as DASHBOARD_VAR_GRAFANA_PASSWORD, ignored`);
  }
  return names.length ? { allowVariables: names } : {};
}

function normalizeDocker(raw, ctx, configDir = '.') {
  const file = 'docker.yaml';
  if (raw === undefined || raw === null) return [];
  if (!isPlainObject(raw)) {
    ctx.error(file, '', 'expected a map of server name to { socket } or { host, port }');
    return [];
  }
  const servers = [];
  for (const [name, def] of Object.entries(raw)) {
    if (!isPlainObject(def)) {
      ctx.error(file, name, 'expected { socket } or { host, port }');
      continue;
    }
    const swarm = def.swarm === true ? { swarm: true } : {};
    const allow = allowVariables(def.allowVariables, file, `${name}.allowVariables`, ctx);
    if (def.socket) servers.push({ name, socket: String(def.socket), discover: def.discover !== false, ...swarm, ...allow });
    else if (def.host) {
      const tls = def.tls === undefined ? undefined : dockerTls(def.tls, `${name}.tls`, ctx, configDir);
      if (tls === null) continue;
      // tls means https, as in homepage
      const protocol = tls || def.protocol === 'https' ? 'https' : 'http';
      servers.push({ name, url: `${protocol}://${def.host}:${def.port ?? DOCKER_PORT}`, discover: def.discover !== false, ...swarm, ...allow, ...(tls ? { tls } : {}) });
    } else ctx.error(file, name, 'needs "socket" or "host"');
  }
  return servers;
}

/**
 * homepage's `tls: { caFile, certFile, keyFile }`: paths relative to the config folder, read
 * as PEM text. null when a file is missing (the server is left out with an error).
 */
function dockerTls(raw, p, ctx, configDir) {
  const file = 'docker.yaml';
  if (!isPlainObject(raw)) {
    ctx.error(file, p, 'expected { caFile, certFile, keyFile }');
    return null;
  }
  const out = {};
  for (const [key, name] of [['caFile', 'ca'], ['certFile', 'cert'], ['keyFile', 'key']]) {
    if (raw[key] === undefined || raw[key] === null || raw[key] === '') continue;
    try {
      out[name] = fs.readFileSync(path.resolve(configDir, String(raw[key])), 'utf8');
    } catch (err) {
      ctx.error(file, `${p}.${key}`, `cannot read ${raw[key]}: ${err.code || err.message}`);
      return null;
    }
  }
  if (!!out.cert !== !!out.key) {
    ctx.error(file, p, 'certFile and keyFile go together');
    return null;
  }
  return out;
}

/**
 * homepage's proxmox.yaml: a map of node name to { url, token, secret }, or one flat
 * { url, token, secret } for every node (its older form, kept under the name "").
 */
function normalizeProxmox(raw, ctx) {
  const file = 'proxmox.yaml';
  if (raw === undefined || raw === null) return {};
  if (!isPlainObject(raw)) {
    ctx.error(file, '', 'expected a map of node name to { url, token, secret }');
    return {};
  }
  const entries = raw.url !== undefined ? [['', raw]] : Object.entries(raw);
  const out = {};
  for (const [node, def] of entries) {
    const p = node || '';
    if (!isPlainObject(def) || !def.url || !def.token || !def.secret) {
      ctx.error(file, p, 'needs url, token and secret');
      continue;
    }
    out[node] = { url: String(def.url), token: String(def.token), secret: String(def.secret), ...(typeof def.insecure === 'boolean' ? { insecure: def.insecure } : {}) };
  }
  return out;
}

function normalizeKubernetes(raw, ctx, configDir = '.') {
  const file = 'kubernetes.yaml';
  const mode = DEFAULTS.kubernetesMode;
  if (raw === undefined || raw === null) return { mode };
  // default: a kubeconfig, as in homepage ($KUBECONFIG, ~/.kube/config, or `kubeconfig:`)
  if (!isPlainObject(raw) || !KUBERNETES_MODES.includes(raw.mode ?? mode)) {
    ctx.error(file, 'mode', 'expected "mode: cluster" (in the cluster), "mode: default" (a kubeconfig) or "mode: disabled"');
    return { mode };
  }
  const out = { mode: raw.mode ?? mode, ...allowVariables(raw.allowVariables, file, 'allowVariables', ctx) };
  if (raw.kubeconfig) out.kubeconfig = path.resolve(configDir, String(raw.kubeconfig));
  if (raw.context) out.context = String(raw.context);
  // what discovery lists, as in homepage: Ingresses (default on), Traefik IngressRoutes, Gateway API HTTPRoutes
  for (const key of ['ingress', 'traefik', 'gateway']) {
    if (raw[key] === undefined) continue;
    if (typeof raw[key] === 'boolean') out[key] = raw[key];
    else ctx.warn(file, key, 'expected true or false, ignored');
  }
  return out;
}
