// The dashboard application: state (config, widgets, discovery) and the HTTP handler.
// src/server.js only parses arguments and listens; tests use createApp directly.

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { loadConfig } from './config/load.js';
import { watchConfig } from './config/watch.js';
import { loadRegistry } from './plugins/loader.js';
import { syncPlugins, withDefaultPlugins, pluginUpdates, defaultPluginsFor } from './plugins/installer.js';
import { WidgetRuntime } from './plugins/runtime.js';
import { WidgetSandbox } from './plugins/sandbox.js';
import { Discovery, mergeDiscovered } from './discovery/index.js';
import { withMountedSocket, dockerGet, DEFAULT_SOCKET } from './discovery/docker.js';
import { buildState, resolveIcon } from './layout.js';
import { renderIndex, renderManifest, renderRobots } from './page.js';
import { UpdateCheck, RELEASES_URL, isNewer } from './update.js';
import { suggestUrl, fetchSuggestions } from './suggest.js';
import { describeError } from './plugins/runtime.js';
import { ActionGate, hashPassword, checkPassword, passwordFingerprint } from './actionauth.js';
import { SessionStore, OPEN_PATHS } from './login.js';
import { Passkeys, rpContext } from './passkeys.js';
import { readSettings, checkSettings, writeSettings, writeAdminPassword } from './settings/form.js';
import { readLayout, checkLayout, writeLayout } from './settings/layout.js';
import { readPlugins, checkPlugins, writePlugins } from './settings/plugins.js';
import { readServices, writeServices } from './settings/services.js';
import { widgetCatalog, readHeader, writeHeader } from './settings/widgets.js';
import { secretsOf } from './settings/secrets.js';
import { readBookmarks, writeBookmarks } from './settings/bookmarks.js';
import { readServers, writeServers, SPECS as SERVER_FILES } from './settings/servers.js';
import { testKubernetes, testProxmox } from './settings/tests.js';
import { substitute } from './config/vars.js';
import { checkConfigText, parseDocument, documentText, editableFiles, editableFile, configPath, ConfigEditError, readConfigFile, writeConfigFile, listHistory, readHistory } from './config/edit.js';
import { maskConfigText, unmaskConfigText } from './settings/secrets.js';
import { parseConfigYaml } from './config/include.js';
import { Onboarding, scanContainers, widgetList, settingsYaml, securityYaml, servicesYaml, parseDockerAddress, checkDocker, dockerYaml, WIDGETS_YAML, BOOKMARKS_YAML } from './onboarding.js';
import { LANGUAGES, THEMES, COLORS, HOMEPAGE_FILES, CUSTOM_FILES, MIN_PASSWORD } from './config/schema.js';
import { validateOptions } from './plugins/options.js';
import { send, sendFile, readJson, BODY_LIMIT, isLocal, isInternal, securityHeaders, SECURITY_HEADERS, clientAddress } from './http.js';

export const ACTION_TIMEOUT_MS = 30_000;
// open /api/events streams, overall and per client address (behind a proxy: all of them)
export const EVENT_STREAMS = { max: 500, perAddress: 50 };
import { safeJoin, realInside, scrub } from './util.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const REPO_URL = 'https://github.com/stefanrenne/dashboard';
/**
 * The version: the VERSION file the Docker build writes (1.2.3, or develop-<sha> / main-<sha>), else DASHBOARD_VERSION,
 * else package.json's. The file comes first because it is part of the image: a container
 * recreated with its old environment copied over (Portainer's Recreate) keeps an old DASHBOARD_VERSION.
 */
export function readVersion(root = ROOT, env = process.env) {
  try {
    const file = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
    if (file) return file;
  } catch {
    // not an image build
  }
  return env.DASHBOARD_VERSION || JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
}
export const VERSION = readVersion();



/**
 * settings.yaml `allowedHosts`: the host names the dashboard answers, against DNS rebinding. An
 * entry without a port allows every port. Loopback names and IP addresses are always answered: a
 * rebinding page always sends a host name of its own. None: only those ([]); `*`: every host (null).
 */
export function allowedHosts(list) {
  const own = (list ?? []).map((h) => String(h).trim().toLowerCase()).filter(Boolean);
  return own.includes('*') ? null : own;
}

const LOOPBACK = ['localhost', '127.0.0.1', '[::1]'];
/** A Host header's name without its port: "dash.lan", "192.168.1.10", "[fd00::1]". */
export function hostName(header) {
  const host = String(header ?? '').trim().toLowerCase();
  return host.startsWith('[') ? host.replace(/^(\[[^\]]*\]).*$/, '$1') : host.replace(/:\d*$/, '');
}
const isIp = (name) => /^\d{1,3}(\.\d{1,3}){3}$/.test(name) || /^\[[0-9a-f:.]+\]$/.test(name);
export function hostAllowed(header, list) {
  if (!list) return true;
  const host = String(header ?? '').trim().toLowerCase();
  const name = hostName(host);
  return LOOPBACK.includes(name) || isIp(name) || list.includes(host) || list.includes(name);
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** The page a refused host gets: what to set, with the name it was opened by. */
export function hostRefusedPage(header, list) {
  const name = escapeHtml(hostName(header).slice(0, 100) || '(none)');
  const all = list.length ? `[${list.join(', ')}, ${name}]` : `[${name}]`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Host not allowed</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;color:#0f172a}
code,pre{background:#f1f5f9;border-radius:4px;padding:.1rem .3rem}pre{padding:.75rem 1rem;overflow-x:auto}
@media (prefers-color-scheme:dark){body{background:#0f172a;color:#e2e8f0}code,pre{background:#1e293b}}</style></head><body>
<h1>Host not allowed</h1>
<p>This dashboard was opened as <code>${name}</code>, which is not one of its allowed hosts. It answers only
<code>localhost</code>, IP addresses and the names you allow, so that a web page cannot reach it under a name of its own (DNS rebinding).</p>
<p>Add it under Allowed hosts on the settings page (open the dashboard by its IP address to get there), or to <code>settings.yaml</code> in the config folder (the page follows once it is saved):</p>
<pre>allowedHosts: ${all}</pre>
<p><code>"*"</code> allows every host. See <a href="https://getdashboard.dev/configuration/#allowed-hosts">Allowed hosts</a>.</p>
</body></html>`;
}

/** The release (1.2.3) or commit (main-<sha>, develop-<sha>) page of this dashboard's version, or null. */
export function versionUrl(version) {
  if (/^\d+\.\d+\.\d+$/.test(version)) return `${REPO_URL}/releases/tag/v${version}`;
  const sha = /^(?:main|develop)-([0-9a-f]{7,40})$/.exec(version)?.[1];
  return sha ? `${REPO_URL}/commit/${sha}` : null;
}

export async function createApp({
  configDir,
  // every widget comes from a plugin (the widgets collection by default); a folder of widgets
  // loaded in-process, before the plugins, is for tests
  builtinDir = null,
  publicDir = PUBLIC_DIR,
  env = process.env,
  log = console,
  watch = false,
  discovery: discoveryOptions = {},
  timeoutMs,
  defaultPlugins = defaultPluginsFor(VERSION),
  dockerSocket = DEFAULT_SOCKET,
  releasesUrl = RELEASES_URL,
  eventStreams = EVENT_STREAMS,
} = {}) {
  const sseClients = new Set();
  // installed widgets run in a worker thread (src/plugins/sandbox.js) unless DASHBOARD_WIDGET_ISOLATION=off
  const sandbox = env.DASHBOARD_WIDGET_ISOLATION === 'off' ? null : new WidgetSandbox({ log, env, memoryMb: Number(env.DASHBOARD_WIDGET_MEMORY_MB) > 0 ? Number(env.DASHBOARD_WIDGET_MEMORY_MB) : undefined });
  const runtime = new WidgetRuntime({ registry: new Map(), log, timeoutMs, sandbox, configDir: path.resolve(configDir) });
  const state = { config: null, registry: new Map(), pluginResult: { errors: [], warnings: [] }, registryErrors: [], layout: null, actions: new Map(), frames: [] };
  const updates = new UpdateCheck({ url: releasesUrl, log, onChange: () => state.config && rebuild() });
  const discovery = new Discovery({ log, env, onChange: () => state.config && rebuild(), ...discoveryOptions });
  let chain = Promise.resolve();
  // the admin password is settings.yaml adminPassword only (a hash the settings page writes)
  if (['DASHBOARD_ADMIN_PASSWORD', 'DASHBOARD_ADMIN_PASSWORD_FILE', 'DASHBOARD_ACTION_PASSWORD', 'DASHBOARD_ACTION_PASSWORD_FILE'].some((k) => env[k] !== undefined)) {
    log.warn('DASHBOARD_ADMIN_PASSWORD (and _FILE, and the older DASHBOARD_ACTION_PASSWORD) are no longer read: the admin password is adminPassword in settings.yaml; set it on the settings page');
  }
  const passkeys = new Passkeys({ configDir, log });
  const gate = new ActionGate({ password: null, log, passkeys });
  const onboarding = new Onboarding({ configDir, log });
  const sessions = new SessionStore({ configDir, log });
  // the allowed hosts: settings.yaml allowedHosts (the settings page writes it); `*` allows every host
  const hostsNow = () => allowedHosts(state.config?.settings.allowedHosts);
  if (env.DASHBOARD_ALLOWED_HOSTS !== undefined || env.HOMEPAGE_ALLOWED_HOSTS !== undefined) {
    log.warn('DASHBOARD_ALLOWED_HOSTS (and HOMEPAGE_ALLOWED_HOSTS) are no longer read: put the host names under Allowed hosts on the settings page, or in allowedHosts in settings.yaml');
  }

  function rebuild() {
    gate.password = state.config.settings.adminPassword ?? null;
    const merged = mergeDiscovered(state.config.services, discovery.found);
    const pluginMessages = (list) =>
      list.map((e) => ({ file: 'settings.yaml', path: `plugins: ${e.source}`, message: e.message }));
    const { instances, layout, actions, frames } = buildState({
      config: state.config,
      registry: state.registry,
      groups: merged.groups,
      extraErrors: [...pluginMessages(state.pluginResult.errors), ...pluginMessages(state.registryErrors), ...discovery.errors],
      extraWarnings: [...pluginMessages(state.pluginResult.warnings), ...merged.warnings],
      secrets: new Set([...state.config.secrets, ...discovery.secrets]),
      actionsProtected: gate.protected,
    });
    runtime.setInstances(instances, state.registry, new Set([...state.config.secrets, ...discovery.secrets]));
    gate.rememberMs = state.config.settings.actionRememberMs;
    state.actions = actions;
    state.frames = frames;
    // the version is shown unless hideVersion: true, as in homepage
    const showVersion = state.config.settings.hideVersion !== true;
    if (showVersion && !state.config.settings.disableUpdateCheck) updates.start();
    else updates.stop();
    const latest = showVersion && !state.config.settings.disableUpdateCheck ? updates.latest : null;
    const update = latest && isNewer(latest.version, VERSION) ? latest : null;
    // the installed plugins (name and version) next to the version, behind the same setting
    const plugins = showVersion ? state.pluginResult.packages ?? [] : [];
    // the login page needs an admin password; without one the page stays open, and says so
    const loginOn = Boolean(state.config.settings.login?.required && gate.password);
    const messages = state.config.settings.login?.required && !gate.password
      ? { ...layout.messages, warnings: [...layout.messages.warnings, { file: 'settings.yaml', path: 'login', message: 'needs an admin password (set one on the settings page); the page opens without a login now' }] }
      : layout.messages;
    state.layout = { ...layout, settings: { ...layout.settings, login: loginOn }, messages, version: VERSION, versionUrl: showVersion ? versionUrl(VERSION) : null, showVersion, update, plugins };
    const hosts = hostsNow();
    if (hosts?.length === 0 && !state.hostsNoted) {
      state.hostsNoted = true;
      log.info('no allowed hosts set: answering localhost and IP addresses only; add the host names you open the dashboard by under Allowed hosts on the settings page (allowedHosts in settings.yaml)');
    }
    // `*`: a page that points a name of its own at the dashboard (DNS rebinding) is the same site to
    // the browser; no Origin check can tell it apart, so only the proxy in front can.
    if (hosts === null && !state.anyHostNoted) {
      state.anyHostNoted = true;
      log.warn('allowedHosts: "*" answers every host name, so a web page can reach this dashboard through a name of its own (DNS rebinding); keep it only behind a proxy that answers your own names');
    }
    broadcast('reload');
  }

  // pluginUpdateInterval: #latest and branch plugins are checked for a newer version, and only
  // a newer one is installed (and reloads the page)
  let pluginTimer = null;
  let pluginEvery = null;
  function schedulePluginChecks(ms) {
    if (ms === pluginEvery) return;
    pluginEvery = ms;
    clearInterval(pluginTimer);
    pluginTimer = ms > 0 ? setInterval(() => checkPluginUpdates().catch(() => {}), ms).unref() : null;
  }
  async function checkPluginUpdates() {
    if (!state.config) return [];
    const news = await pluginUpdates({ configDir, entries: withDefaultPlugins(state.config.settings.plugins, defaultPlugins) });
    if (news.length) {
      log.info(`plugins: a newer version of ${news.join(', ')}; updating`);
      await reload({ update: 'moving' });
    }
    return news;
  }

  /** Reloads everything; calls are queued so two reloads never interleave. */
  function reload({ update = false } = {}) {
    chain = chain.then(async () => {
      const config = loadConfig(configDir, { env });
      log.setLogPath?.(config.settings.logpath ? path.resolve(configDir, config.settings.logpath) : null);
      config.docker = withMountedSocket(config.docker, dockerSocket);
      schedulePluginChecks(config.settings.pluginUpdateMs);
      const entries = withDefaultPlugins(config.settings.plugins, defaultPlugins);
      const pluginResult = await syncPlugins({ configDir, entries, update, keepUnused: true, log });
      const { widgets, errors } = await loadRegistry({ builtinDir, external: pluginResult.installed });
      Object.assign(state, { config, registry: widgets, pluginResult, registryErrors: errors });
      for (const e of [...config.errors, ...pluginResult.errors, ...errors]) {
        log.warn(`config: ${e.file ?? e.source}${e.path ? ` ${e.path}` : ''}: ${e.message}`);
      }
      await discovery.configure(config); // its first poll calls rebuild() when something was found
      rebuild();
      // the new widgets are live: the old versions' folders can go now (a failure is a warning)
      const warnings = pluginResult.warnings.length;
      pluginResult.removeUnused();
      if (pluginResult.warnings.length !== warnings) rebuild();
    }).catch((err) => log.error(`reload failed: ${err.stack ?? err}`));
    return chain;
  }

  /**
   * Search suggestions for a search box: ?instance=<id> (a widget's own settings) or
   * ?for=quicklaunch (quicklaunch's settings, else the search widget's). Never fails: a
   * problem gives an empty list.
   */
  async function suggestions(params) {
    const q = (params.get('q') ?? '').trim().slice(0, 200);
    if (!q) return { suggestions: [] };
    const widgetOptions = (id) => runtime.instances.get(id)?.options ?? {};
    let source;
    if (params.get('for') === 'quicklaunch') {
      const ql = state.config.settings.quicklaunch ?? {};
      const searchWidget = (state.layout?.header ?? []).find((w) => w.type === 'search');
      const w = searchWidget ? widgetOptions(searchWidget.instanceId) : {};
      source = {
        showSearchSuggestions: ql.showSearchSuggestions ?? w.showSearchSuggestions,
        provider: ql.provider ?? w.provider,
        suggestionUrl: ql.provider ? ql.suggestionUrl : w.suggestionUrl,
      };
    } else source = widgetOptions(params.get('instance') ?? '');
    const base = suggestUrl(source);
    if (!base) return { suggestions: [] };
    try {
      return { suggestions: await fetchSuggestions(base, q) };
    } catch (err) {
      log.info(`suggestions: ${err.message}`);
      return { suggestions: [] };
    }
  }

  function broadcast(event) {
    for (const res of sseClients) res.write(`event: ${event}\ndata: {}\n\n`);
  }

  await reload();
  // DASHBOARD_WATCH_POLL: seconds between checks for changes, for network file systems
  const pollSeconds = Number(env.DASHBOARD_WATCH_POLL);
  if (env.DASHBOARD_WATCH_POLL !== undefined && !(pollSeconds > 0)) log.warn(`DASHBOARD_WATCH_POLL: "${env.DASHBOARD_WATCH_POLL}" is not a number of seconds; watching as usual`);
  const watcher = watch ? watchConfig(configDir, () => reload(), { log, pollMs: pollSeconds > 0 ? Math.max(1, pollSeconds) * 1000 : 0 }) : null;
  const heartbeat = setInterval(() => {
    for (const res of sseClients) res.write(': ping\n\n');
  }, 25_000).unref();



  async function handler(req, res) {
    const hosts = hostsNow();
    if (!hostAllowed(req.headers.host, hosts)) {
      log.warn(`refused a request for host "${String(req.headers.host ?? '').slice(0, 100)}" (not in allowedHosts)`);
      // a browser gets a page that says what to set; the API a short text
      if (/text\/html/.test(req.headers.accept ?? '')) return send(res, 403, hostRefusedPage(req.headers.host, hosts), 'text/html; charset=utf-8');
      return send(res, 403, `Host not allowed; add "${hostName(req.headers.host).slice(0, 100)}" to allowedHosts in settings.yaml`, 'text/plain; charset=utf-8');
    }
    // A request target that is no URL, or a path with a broken escape (/%E0%A4%A), is the
    // client's mistake: 400, never an exception outside the try below (it would end the process).
    let url;
    let p;
    try {
      url = new URL(req.url, 'http://localhost');
      p = decodeURIComponent(url.pathname);
    } catch {
      return send(res, 400, { error: 'bad request' });
    }
    // HEAD is answered like GET (status checks of this dashboard use it); Node drops the body.
    const method = req.method === 'HEAD' ? 'GET' : req.method;
    try {
      // a first load that failed (see the log) leaves no config: say so instead of failing each request
      if (!state.config && p !== '/api/health') {
        return send(res, 503, 'The dashboard could not load its configuration; see its log.', 'text/plain; charset=utf-8');
      }
      if (p === '/setup' || p === '/setup.js' || p.startsWith('/api/onboarding/')) return await onboardingRoute(req, res, method, p);
      // a first install: the wizard first (docker/start.sh wrote the marker into the empty config folder)
      if (method === 'GET' && (p === '/' || p === '/index.html') && onboarding.active) {
        res.writeHead(302, { location: 'setup', 'cache-control': 'no-store', ...SECURITY_HEADERS });
        return res.end();
      }
      // settings.yaml `login`: the admin password opens the page; a session is checked on the server
      const login = state.config?.settings.login;
      const loginOn = Boolean(login?.required && gate.password);
      let loggedIn = false;
      if (loginOn) {
        const s = gate.password.broken ? { ok: false, headers: {} } : sessions.check(req, passwordFingerprint(gate.password), login.rememberMs);
        loggedIn = s.ok;
        if (s.headers['set-cookie']) res.setHeader('set-cookie', s.headers['set-cookie']);
      }
      if (p === '/login' || p === '/login.js' || p === '/api/login' || p === '/api/logout') return await loginRoute(req, res, method, p, { loginOn, loggedIn, login });
      if (loginOn && !loggedIn && !isInternal(req) && !OPEN_PATHS.has(p)) {
        if (method === 'GET' && (p === '/' || p === '/index.html' || /text\/html/.test(req.headers.accept ?? ''))) {
          res.writeHead(302, { location: 'login', 'cache-control': 'no-store', ...SECURITY_HEADERS });
          return res.end();
        }
        return send(res, 401, { ok: false, needsLogin: true, error: 'log in first' });
      }
      if (p === '/api/passkey' || p.startsWith('/api/passkey/')) return await passkeyRoute(req, res, method, p);
      if (p === '/settings' || p === '/settings.js' || p === '/api/settings' || p.startsWith('/api/settings/')) return await settingsRoute(req, res, method, p, { loggedIn, login });
      if (method === 'GET' && (p === '/' || p === '/index.html')) {
        const html = await fs.promises.readFile(path.join(publicDir, 'index.html'), 'utf8');
        const custom = CUSTOM_FILES.filter((f) => fs.existsSync(path.join(configDir, f)));
        const nonce = crypto.randomBytes(16).toString('base64');
        return send(res, 200, renderIndex(html, state.config.settings, state.config.secrets, custom, nonce), 'text/html; charset=utf-8', securityHeaders(state.frames, nonce));
      }
      if (method === 'GET' && p === '/robots.txt') return send(res, 200, renderRobots(state.config.settings), 'text/plain; charset=utf-8');
      if (method === 'GET' && p === '/site.webmanifest') {
        return send(res, 200, JSON.stringify(renderManifest(state.config.settings, state.config.secrets)), 'application/manifest+json');
      }
      if (method === 'GET' && p === '/api/health') return send(res, 200, { ok: true, version: VERSION });
      if (method === 'GET' && p === '/api/layout') return send(res, 200, state.layout);
      if (method === 'GET' && p === '/api/suggest') return send(res, 200, await suggestions(url.searchParams));
      if (method === 'GET' && p.startsWith('/api/widgets/')) {
        return send(res, 200, await runtime.get(p.slice('/api/widgets/'.length), Object.fromEntries(url.searchParams)));
      }
      if (method === 'GET' && p === '/api/events') {
        // each open stream holds a socket: a cap overall and per address (a proxy is one address)
        const address = clientAddress(req);
        const fromHere = [...sseClients].filter((c) => c.address === address).length;
        if (sseClients.size >= eventStreams.max || fromHere >= eventStreams.perAddress) {
          return send(res, 503, { error: 'too many open event streams' }, 'application/json', { ...SECURITY_HEADERS, 'retry-after': '60' });
        }
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
        res.write(': connected\n\n');
        res.address = address;
        sseClients.add(res);
        req.on('close', () => sseClients.delete(res));
        return;
      }
      if (method === 'POST' && p === '/api/plugins/sync') {
        // A custom header cannot be sent cross-site without a CORS preflight, which we never allow.
        if (req.headers['x-requested-with'] !== 'dashboard') return send(res, 403, { error: 'missing X-Requested-With' });
        const allowed = await gate.check(req, 'password', { what: 'the widget sync', loggedIn });
        if (!allowed.ok) return send(res, allowed.status, allowed.body);
        await reload({ update: url.searchParams.get('update') === '1' });
        return send(res, 200, { errors: state.pluginResult.errors, warnings: state.pluginResult.warnings }, 'application/json', { ...SECURITY_HEADERS, ...allowed.headers });
      }
      if (method === 'POST' && /^\/api\/widgets\/[^/]+\/action$/.test(p)) {
        // A custom header cannot be sent cross-site without a CORS preflight, which we never allow.
        if (req.headers['x-requested-with'] !== 'dashboard') return send(res, 403, { error: 'missing X-Requested-With' });
        const id = p.split('/')[3];
        const allowed = await gate.check(req, runtime.instances.get(id)?.confirm ?? null, { what: `widget ${runtime.instances.get(id)?.type ?? id}`, loggedIn });
        if (!allowed.ok) return send(res, allowed.status, allowed.body);
        const out = await runtime.action(id);
        return send(res, out.busy ? 409 : out.missing ? 404 : 200, out, 'application/json', { ...SECURITY_HEADERS, ...allowed.headers });
      }
      if (method === 'POST' && p.startsWith('/api/run/')) {
        // A custom header cannot be sent cross-site without a CORS preflight, which we never allow.
        if (req.headers['x-requested-with'] !== 'dashboard') return send(res, 403, { error: 'missing X-Requested-With' });
        const action = state.actions.get(p.slice('/api/run/'.length));
        if (!action) return send(res, 404, { error: 'no such action' });
        const allowed = await gate.check(req, action.confirm ?? null, { what: `the webhook of ${action.name}`, loggedIn });
        if (!allowed.ok) return send(res, allowed.status, allowed.body);
        return send(res, 200, await runAction(action), 'application/json', { ...SECURITY_HEADERS, ...allowed.headers });
      }
      // whether this browser is unlocked (the page's lock icon), and locking it again
      if (method === 'GET' && p === '/api/lock') return send(res, 200, { protected: gate.protected, unlocked: loggedIn || gate.unlocked(req), loggedIn });
      if (method === 'POST' && p === '/api/lock') {
        if (req.headers['x-requested-with'] !== 'dashboard') return send(res, 403, { error: 'missing X-Requested-With' });
        return send(res, 200, { ok: true }, 'application/json', { ...SECURITY_HEADERS, ...gate.lock(req) });
      }
      if (method === 'GET' && p.startsWith('/widgets/')) {
        const [, , type, ...rest] = p.split('/');
        const widget = state.registry.get(type);
        // Only client.js and assets/ are public; checked on the resolved path, so
        // "assets/../server.js" is refused too.
        const full = widget ? safeJoin(widget.dir, rest.join('/')) : null;
        const allowed =
          full && (full === path.join(widget.dir, 'client.js') || full.startsWith(path.join(widget.dir, 'assets') + path.sep));
        return allowed ? sendFile(res, full, { cache: 'public, max-age=3600', root: full.startsWith(path.join(widget.dir, 'assets') + path.sep) ? path.join(widget.dir, 'assets') : widget.dir }) : send(res, 404, { error: 'not found' });
      }
      // homepage's custom.css / custom.js from the config folder (the user's own, so 'self' in the CSP)
      if (method === 'GET' && CUSTOM_FILES.includes(p.slice(1))) return sendFile(res, path.join(configDir, p.slice(1)));
      if (method === 'GET' && p.startsWith('/icons/')) {
        const icons = path.join(configDir, 'icons');
        const full = safeJoin(icons, p.slice('/icons/'.length));
        return full ? sendFile(res, full, { cache: 'public, max-age=86400', root: icons }) : send(res, 404, { error: 'not found' });
      }
      return send(res, 404, { error: 'not found' });
    } catch (err) {
      log.error(`${req.method} ${p}: ${err.stack ?? err}`);
      return send(res, 500, { error: 'internal error' });
    }
  }

  /**
   * The settings page and its API: the admin password opens it (a login counts, and the
   * browser stays unlocked as for a press); without one yet, only the local network, which must
   * set one first. A new admin password always needs the current one.
   */
  /**
   * The config files on the settings page: GET /files (the list), GET /files/<file> (its text,
   * secrets as tokens), POST /files/<file> { text, hash } (save), GET /files/<file>/history/<id>
   * (an earlier version, masked too). Access is checked by settingsRoute.
   */
  async function filesRoute(res, method, route, body, headers) {
    const schemaFor = (type) => state.registry?.get(type)?.manifest?.options ?? null;
    const known = () => [...(state.config?.secrets ?? [])];
    // the path is decoded already: an included file's name has slashes (/files/groups/media.yaml)
    const [, file = '', sub, id] = /^\/files(?:\/(.+?))?(?:\/(history)\/([^/]+))?$/.exec(route) ?? [];
    try {
      // an included file is masked by the rules of the config file it ends up in
      const where = file ? editableFile(configDir, file) ?? file : null;
      const masked = (text) => maskConfigText(where, text, schemaFor, known());
      if (file) configPath(configDir, file);
      if (method === 'GET' && !file) {
        const files = editableFiles(configDir).map((e) => {
          const read = readConfigFile(configDir, e.file);
          return { file: e.file, root: e.root, from: e.from, at: e.at, exists: read.exists, hash: read.hash, size: read.text.length };
        });
        return send(res, 200, { ok: true, files }, 'application/json', headers);
      }
      if (method === 'GET' && file && !sub) {
        const read = readConfigFile(configDir, file);
        const out = masked(read.text);
        return send(res, 200, { ok: true, file, exists: read.exists, hash: read.hash, text: out.text, secrets: out.secrets, history: listHistory(configDir, file) }, 'application/json', headers);
      }
      if (method === 'GET' && file && sub === 'history' && id) {
        return send(res, 200, { ok: true, file, id, text: masked(readHistory(configDir, file, id)).text }, 'application/json', headers);
      }
      if (method === 'POST' && file && !sub) {
        if (typeof body?.text !== 'string' || typeof body?.hash !== 'string') return send(res, 400, { ok: false, error: 'expected { text, hash }' });
        const current = readConfigFile(configDir, file);
        if (body.hash !== current.hash) throw new ConfigEditError(`${file} changed since it was opened: reload it and make your change again`, 409);
        if (where.root === 'settings.yaml' && /^adminPassword(\.|\[|$)/.test(where.at)) throw new ConfigEditError(`${file}: the admin password is changed under Security, with the current one`, 400);
        const { text, warnings: secretWarnings } = unmaskConfigText(where, body.text, current.text, schemaFor);
        if (file === 'settings.yaml') {
          const hashOf = (t) => {
            try {
              return parseConfigYaml(t)?.adminPassword ?? null;
            } catch {
              return undefined;
            }
          };
          const after = hashOf(text);
          if (after !== undefined && after !== hashOf(current.text)) throw new ConfigEditError('settings.yaml: the admin password is changed under Security, with the current one', 400);
        }
        const out = writeConfigFile(configDir, file, text, { hash: body.hash, opts: { env } });
        if (out.changed) {
          log.info(`settings: ${file} saved from the settings page`);
          // custom.css / custom.js: the open pages load them again
          await reload();
        }
        return send(res, 200, { ok: true, file, hash: out.hash, changed: out.changed, warnings: [...secretWarnings, ...out.warnings] }, 'application/json', headers);
      }
    } catch (err) {
      if (!(err instanceof ConfigEditError)) throw err;
      return send(res, err.status, { ok: false, error: err.message, ...(err.errors ? { errors: err.errors, warnings: err.warnings } : {}) }, 'application/json', headers);
    }
    return send(res, 404, { error: 'not found' });
  }

  async function settingsRoute(req, res, method, p, { loggedIn, login }) {
    if (method === 'GET' && p === '/settings') return sendFile(res, path.join(publicDir, 'settings.html'));
    if (method === 'GET' && p === '/settings.js') return sendFile(res, path.join(publicDir, 'settings.js'));
    if (method !== 'GET' && req.headers['x-requested-with'] !== 'dashboard') return send(res, 403, { error: 'missing X-Requested-With' });
    const route = p.slice('/api/settings'.length);
    const noPassword = !gate.password;
    const access = async () => {
      if (noPassword) return isLocal(req) ? { ok: true, headers: {} } : { ok: false, status: 403, body: { ok: false, needsSetup: true, error: 'no admin password yet: set one from the local network first' } };
      return gate.check(req, 'password', { what: 'the settings', loggedIn });
    };
    const allowed = await access();
    if (!allowed.ok) return send(res, allowed.status, allowed.body);
    // without an admin password, setting one comes first: nothing else is saved
    if (noPassword && method === 'POST' && route !== '/password') return send(res, 403, { ok: false, needsSetup: true, error: 'set an admin password first' });
    const headers = { ...SECURITY_HEADERS, ...allowed.headers };
    const rp = rpContext(req);
    // the groups the dashboard has now, discovered ones included, for the layout section
    const groupInfo = () => ({
      services: (state.layout?.groups ?? []).map((g) => ({ name: g.name, nested: (g.groups ?? []).map((n) => n.name) })),
      bookmarks: (state.layout?.bookmarks ?? []).map((g) => g.name),
    });
    const answer = () => ({ ok: true, ...readSettings(configDir), layout: readLayout(configDir, groupInfo()),
      plugins: { ...readPlugins(configDir, defaultPlugins), errors: state.pluginResult.errors ?? [], warnings: state.pluginResult.warnings ?? [], packages: state.pluginResult.packages ?? [] }, noPassword: !gate.password, loggedIn,
      passkeys: { secure: Boolean(rp), host: rp?.rpId ?? null, list: rp ? passkeys.forHost(rp.rpId) : [] } });
    if (method === 'GET' && route === '') return send(res, 200, answer(), 'application/json', headers);
    if (method === 'POST' && route === '/unlock') return send(res, 200, { ok: true }, 'application/json', headers);
    let body;
    try {
      body = method === 'POST' ? await readJson(req, route.startsWith('/files/') || ['/services', '/bookmarks', '/header', '/import', '/import/check'].includes(route) ? BODY_LIMIT : 64 * 1024) : null;
    } catch (err) {
      return send(res, err.status ?? 400, { ok: false, error: err.message });
    }
    if (method === 'POST' && route === '') {
      const checked = checkSettings(body?.values);
      if (checked.error) return send(res, 400, { ok: false, error: checked.error });
      try {
        writeSettings(configDir, checked.values);
      } catch (err) {
        return send(res, 409, { ok: false, error: err.message });
      }
      log.info(`settings: ${Object.keys(checked.values).join(', ')} saved from the settings page`);
      await reload();
      return send(res, 200, answer(), 'application/json', headers);
    }
    if (route === '/files' || route.startsWith('/files/')) return filesRoute(res, method, route, body, headers);
    const schemaOf = (type) => state.registry?.get(type)?.manifest?.options ?? null;
    if (method === 'POST' && route === '/widget-test') {
      // a widget from the form, tried as the dashboard would run it: hidden values and variables filled in
      const known = secretsOf(body?.file === 'widgets.yaml' ? 'widgets.yaml' : 'services.yaml', readConfigFile(configDir, body?.file === 'widgets.yaml' ? 'widgets.yaml' : 'services.yaml').text, schemaOf);
      const raw = Object.fromEntries(Object.entries(body?.options && typeof body.options === 'object' ? body.options : {})
        .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
        .map(([k, v]) => [k, v.replace(/__SECRET_[0-9a-f]{10}__/g, (tk) => String(known.get(tk)?.value ?? tk))]));
      const schema = schemaOf(body?.type) ?? {};
      for (const [k, d] of Object.entries(schema)) if (k in raw && d.type === 'number' && Number.isFinite(Number(raw[k]))) raw[k] = Number(raw[k]);
      for (const [k, d] of Object.entries(schema)) if (k in raw && d.type === 'boolean') raw[k] = raw[k] === 'true';
      const filled = substitute(raw, { env });
      const out = await testWidget(body?.type, filled.value);
      const secrets = [...[...known.values()].map((x) => String(x.value)), ...filled.secrets];
      return send(res, 200, out.ok ? out : { ok: false, error: scrub(String(out.error), secrets) }, 'application/json', headers);
    }
    const serverFile = /^\/servers\/([a-z]+\.yaml)$/.exec(route)?.[1];
    if (serverFile && SERVER_FILES[serverFile]) {
      try {
        if (method === 'POST') {
          const out = writeServers(configDir, serverFile, body, body?.hash, { env });
          if (out.changed) {
            log.info(`settings: ${serverFile} saved from its form`);
            await reload();
          }
          return send(res, 200, { ok: true, ...readServers(configDir, serverFile), warnings: out.warnings ?? [] }, 'application/json', headers);
        }
        return send(res, 200, { ok: true, ...readServers(configDir, serverFile) }, 'application/json', headers);
      } catch (err) {
        if (!(err instanceof ConfigEditError)) throw err;
        return send(res, err.status, { ok: false, error: err.message, ...(err.errors ? { errors: err.errors } : {}) }, 'application/json', headers);
      }
    }
    if (method === 'POST' && (route === '/import/check' || route === '/import')) {
      // homepage's files from the settings page: checked as the wizard does, then written all or none
      const given = Object.fromEntries(Object.entries(body?.files && typeof body.files === 'object' ? body.files : {}).filter(([k, v]) => HOMEPAGE_FILES.includes(k) && typeof v === 'string'));
      if (!Object.keys(given).length) return send(res, 400, { ok: false, error: `none of ${HOMEPAGE_FILES.join(', ')}` }, 'application/json', headers);
      // this dashboard's admin password, login and allowed hosts stay: an import does not undo the security
      if (given['settings.yaml'] !== undefined) {
        try {
          const doc = parseDocument(given['settings.yaml'], 'settings.yaml');
          const mine = parseDocument(readConfigFile(configDir, 'settings.yaml').text, 'settings.yaml');
          if (doc.contents === null) doc.contents = doc.createNode({});
          if (YAML.isMap(doc.contents) && YAML.isMap(mine.contents)) {
            for (const key of ['adminPassword', 'login', 'allowedHosts', 'actions']) {
              if (mine.contents.has(key)) doc.contents.set(key, mine.contents.get(key, true));
              else doc.contents.delete(key);
            }
          }
          given['settings.yaml'] = documentText(doc);
        } catch (err) {
          return send(res, 400, { ok: false, error: err.message }, 'application/json', headers);
        }
      }
      if (route === '/import/check') {
        const dry = homepageDryRun(given);
        return send(res, 200, { ...dry, replaces: Object.keys(given).filter((k) => readConfigFile(configDir, k).exists) }, 'application/json', headers);
      }
      const problems = Object.entries(given).flatMap(([name, text]) => checkConfigText(configDir, name, text, { env }).errors);
      if (problems.length) return send(res, 400, { ok: false, error: 'not imported: fix these first', errors: problems }, 'application/json', headers);
      for (const [name, text] of Object.entries(given)) writeConfigFile(configDir, name, text, { opts: { env } });
      log.info(`settings: imported homepage's ${Object.keys(given).join(', ')}`);
      await reload();
      return send(res, 200, { ok: true, files: Object.keys(given) }, 'application/json', headers);
    }
    if (method === 'GET' && route === '/icon') {
      // the address an icon name stands for, for the preview on the page
      const name = String(new URL(req.url, 'http://x').searchParams.get('name') ?? '').trim().slice(0, 300);
      return send(res, 200, { ok: true, name, url: name ? resolveIcon(name) : null }, 'application/json', headers);
    }
    if (method === 'GET' && route === '/icons') {
      // suggestions for the icon fields: the files in config/icons and the icons already in use
      const local = [];
      const dir = path.join(configDir, 'icons');
      const walk = (rel, depth) => {
        let names = [];
        try {
          names = fs.readdirSync(path.join(dir, rel), { withFileTypes: true });
        } catch {
          return;
        }
        for (const e of names) {
          if (local.length >= 500) return;
          const r = rel ? `${rel}/${e.name}` : e.name;
          if (e.isDirectory() && depth < 2 && !e.name.startsWith('.')) walk(r, depth + 1);
          else if (e.isFile() && /\.(svg|png|webp|jpe?g|gif|ico)$/i.test(e.name)) local.push(`/icons/${r}`);
        }
      };
      walk('', 0);
      const used = new Set();
      const add = (v) => { if (typeof v === 'string' && v.trim()) used.add(v.trim()); };
      const groups = (list) => (list ?? []).forEach((g) => { g.services?.forEach((x) => add(x.icon)); groups(g.groups); });
      groups(state.config?.services);
      (state.config?.bookmarks ?? []).forEach((g) => g.bookmarks.forEach((b) => add(b.icon)));
      Object.values(state.config?.settings?.layout ?? {}).forEach((l) => add(l?.icon));
      return send(res, 200, { ok: true, local: local.sort(), used: [...used].sort() }, 'application/json', headers);
    }
    if (method === 'POST' && route === '/kubernetes-test') {
      const out = await testKubernetes(state.config?.kubernetes, { configDir, env });
      return send(res, 200, out.ok ? out : { ok: false, error: scrub(String(out.error), [...(state.config?.secrets ?? [])]) }, 'application/json', headers);
    }
    if (method === 'POST' && route === '/proxmox-test') {
      const node = state.config?.proxmox?.[typeof body?.name === 'string' ? body.name : ''];
      if (!node) return send(res, 404, { ok: false, error: 'no such node in proxmox.yaml; save it first' }, 'application/json', headers);
      const out = await testProxmox(node);
      return send(res, 200, out.ok ? out : { ok: false, error: scrub(String(out.error), [node.secret, node.token, ...(state.config?.secrets ?? [])]) }, 'application/json', headers);
    }
    if (method === 'POST' && route === '/docker-test') {
      // a saved server, as the dashboard uses it (the mounted socket included)
      const servers = (state.config?.docker ?? []).filter((x) => x.name === body?.name);
      if (!servers.length) return send(res, 404, { ok: false, error: 'no such server in docker.yaml; save it first' }, 'application/json', headers);
      const [result] = await checkDocker({ servers, get: dockerGet });
      return send(res, 200, result, 'application/json', headers);
    }
    if (route === '/bookmarks') {
      try {
        if (method === 'POST') {
          const out = writeBookmarks(configDir, body?.items, body?.hash, { env });
          if (out.changed) {
            log.info('settings: bookmarks.yaml saved from the bookmarks form');
            await reload();
          }
          return send(res, 200, { ok: true, ...readBookmarks(configDir), warnings: out.warnings ?? [] }, 'application/json', headers);
        }
        return send(res, 200, { ok: true, ...readBookmarks(configDir) }, 'application/json', headers);
      } catch (err) {
        if (!(err instanceof ConfigEditError)) throw err;
        return send(res, err.status, { ok: false, error: err.message, ...(err.errors ? { errors: err.errors } : {}) }, 'application/json', headers);
      }
    }
    if (route === '/header') {
      try {
        if (method === 'POST') {
          const out = writeHeader(configDir, body?.widgets, body?.hash, { env }, schemaOf);
          if (out.changed) {
            log.info('settings: widgets.yaml saved from the header widgets form');
            await reload();
          }
          return send(res, 200, { ok: true, ...readHeader(configDir, schemaOf), catalog: widgetCatalog(state.registry), warnings: out.warnings ?? [] }, 'application/json', headers);
        }
        return send(res, 200, { ok: true, ...readHeader(configDir, schemaOf), catalog: widgetCatalog(state.registry) }, 'application/json', headers);
      } catch (err) {
        if (!(err instanceof ConfigEditError)) throw err;
        return send(res, err.status, { ok: false, error: err.message, ...(err.errors ? { errors: err.errors } : {}) }, 'application/json', headers);
      }
    }
    if (route === '/services') {
      // the services the dashboard found by itself: shown, not edited (their labels are the source)
      const discovered = () => (state.layout?.groups ?? []).flatMap(function all(g, _, __, parent = '') {
        const name = parent ? `${parent} › ${g.name}` : g.name;
        return [...g.services.filter((x) => x.discovered).map((x) => ({ group: name, name: x.name, origin: x.discovered })), ...(g.groups ?? []).flatMap((n) => all(n, 0, 0, name))];
      });
      try {
        if (method === 'POST') {
          const out = writeServices(configDir, body?.items, body?.hash, { env }, schemaOf);
          if (out.changed) {
            log.info('settings: services.yaml saved from the services form');
            await reload();
          }
          return send(res, 200, { ok: true, ...readServices(configDir, schemaOf), widgets: widgetCatalog(state.registry), discovered: discovered(), warnings: out.warnings ?? [] }, 'application/json', headers);
        }
        return send(res, 200, { ok: true, ...readServices(configDir, schemaOf), widgets: widgetCatalog(state.registry), discovered: discovered() }, 'application/json', headers);
      } catch (err) {
        if (!(err instanceof ConfigEditError)) throw err;
        return send(res, err.status, { ok: false, error: err.message, ...(err.errors ? { errors: err.errors } : {}) }, 'application/json', headers);
      }
    }
    if (method === 'POST' && route === '/plugins') {
      const checked = checkPlugins(body?.entries);
      if (checked.error) return send(res, 400, { ok: false, error: checked.error });
      try {
        writePlugins(configDir, checked.entries);
      } catch (err) {
        return send(res, 409, { ok: false, error: err.message });
      }
      log.info('settings: the plugins saved from the settings page');
      await reload();
      return send(res, 200, answer(), 'application/json', headers);
    }
    if (method === 'POST' && route === '/layout') {
      const checked = checkLayout(body?.groups);
      if (checked.error) return send(res, 400, { ok: false, error: checked.error });
      try {
        writeLayout(configDir, checked.groups, readLayout(configDir, groupInfo()));
      } catch (err) {
        return send(res, 409, { ok: false, error: err.message });
      }
      log.info('settings: the layout saved from the settings page');
      await reload();
      return send(res, 200, answer(), 'application/json', headers);
    }
    if (method === 'POST' && route === '/passkeys/options') {
      const options = passkeys.registerOptions(req, state.config.settings.title);
      if (!options) return send(res, 400, { ok: false, error: 'passkeys need the dashboard over https, by its host name' });
      return send(res, 200, { ok: true, publicKey: options }, 'application/json', headers);
    }
    if (method === 'POST' && route === '/passkeys') {
      let out;
      try {
        out = passkeys.register(req, body);
      } catch (err) {
        return send(res, 409, { ok: false, error: `cannot write the passkeys (${err.code ?? err.message})` });
      }
      if (!out.ok) return send(res, 400, out);
      log.info(`settings: a passkey added (${out.passkey.name}, for ${rp.rpId})`);
      return send(res, 200, answer(), 'application/json', headers);
    }
    if (method === 'POST' && route === '/passkeys/remove') {
      try {
        if (!passkeys.remove(body?.id)) return send(res, 404, { ok: false, error: 'no such passkey' });
      } catch (err) {
        return send(res, 409, { ok: false, error: `cannot write the passkeys (${err.code ?? err.message})` });
      }
      log.info('settings: a passkey removed');
      return send(res, 200, answer(), 'application/json', headers);
    }
    if (method === 'POST' && route === '/password') {
      if (typeof body?.next !== 'string' || body.next.length < MIN_PASSWORD) return send(res, 400, { ok: false, error: `at least ${MIN_PASSWORD} characters` });
      if (gate.password) {
        // the current password, every time: also when logged in or unlocked
        const address = clientAddress(req);
        const retryAfter = gate.limiter.waiting(address);
        if (retryAfter) return send(res, 429, { ok: false, retryAfter, error: 'too many wrong passwords' });
        if (!(await checkPassword(gate.password, typeof body.current === 'string' ? body.current : ''))) {
          gate.limiter.failed(address);
          log.warn(`wrong current admin password from ${address} on the settings page`);
          return send(res, 401, { ok: false, wrongPassword: true, error: 'the current password is not right' });
        }
        gate.limiter.succeeded(address);
      }
      try {
        writeAdminPassword(configDir, hashPassword(body.next));
      } catch (err) {
        return send(res, 409, { ok: false, error: err.message });
      }
      log.info('settings: a new admin password; every login session ends');
      await reload();
      // the sessions of the old password end; this browser keeps going with one of the new
      const login2 = state.config.settings.login;
      const renewed = login2?.required && gate.password ? { 'set-cookie': sessions.create(req, passwordFingerprint(gate.password), login2.rememberMs) } : {};
      return send(res, 200, answer(), 'application/json', { ...SECURITY_HEADERS, ...renewed });
    }
    return send(res, 404, { error: 'not found' });
  }

  /**
   * Passkeys for whoever is not logged in yet (the login page, the password dialogs):
   * `GET /api/passkey` (whether one can be used here), `POST /api/passkey/options` (a challenge)
   * and `POST /api/passkey/verify` (the browser's answer; a one-time token that the login and
   * the x-dashboard-passkey header take in place of the password).
   */
  async function passkeyRoute(req, res, method, p) {
    const usable = Boolean(gate.password) && !gate.password.broken;
    if (method === 'GET' && p === '/api/passkey') return send(res, 200, { available: usable && passkeys.available(req) });
    if (method !== 'POST') return send(res, 404, { error: 'not found' });
    if (req.headers['x-requested-with'] !== 'dashboard') return send(res, 403, { error: 'missing X-Requested-With' });
    if (p === '/api/passkey/options') {
      const options = usable ? passkeys.loginOptions(req) : null;
      return send(res, 200, options ? { available: true, publicKey: options } : { available: false });
    }
    if (p !== '/api/passkey/verify') return send(res, 404, { error: 'not found' });
    if (!usable) return send(res, 404, { ok: false, error: 'no admin password' });
    let body;
    try {
      body = await readJson(req, 16 * 1024);
    } catch (err) {
      return send(res, err.status ?? 400, { ok: false, error: err.message });
    }
    const address = clientAddress(req);
    const retryAfter = gate.limiter.waiting(address);
    if (retryAfter) return send(res, 429, { ok: false, retryAfter, error: 'too many wrong tries' });
    const out = passkeys.verify(req, body);
    if (!out.ok) {
      const wait = gate.limiter.failed(address);
      log.warn(`a passkey refused from ${address}: ${out.error}${wait ? `; next try in ${Math.round(wait / 1000)} s` : ''}`);
      return send(res, 401, { ok: false, error: out.error });
    }
    gate.limiter.succeeded(address);
    return send(res, 200, { ok: true, token: out.token });
  }

  /**
   * The login page and its API: the page and its script, `GET /api/login` (how the page looks,
   * never what is behind it), `POST /api/login` with { password } and `POST /api/logout`.
   */
  async function loginRoute(req, res, method, p, { loginOn, loggedIn, login }) {
    if (method === 'GET' && p === '/login') {
      if (!loginOn || loggedIn) {
        res.writeHead(302, { location: './', 'cache-control': 'no-store', ...SECURITY_HEADERS });
        return res.end();
      }
      return sendFile(res, path.join(publicDir, 'login.html'));
    }
    if (method === 'GET' && p === '/login.js') return sendFile(res, path.join(publicDir, 'login.js'));
    const s = state.config.settings;
    if (method === 'GET' && p === '/api/login') {
      return send(res, 200, { login: loginOn, loggedIn, broken: Boolean(gate.password?.broken), language: s.language, theme: s.theme, color: s.color });
    }
    if (req.headers['x-requested-with'] !== 'dashboard') return send(res, 403, { error: 'missing X-Requested-With' });
    if (method === 'POST' && p === '/api/logout') return send(res, 200, { ok: true }, 'application/json', { ...SECURITY_HEADERS, 'set-cookie': sessions.end(req) });
    if (method !== 'POST' || p !== '/api/login') return send(res, 404, { error: 'not found' });
    if (!loginOn) return send(res, 404, { error: 'no login page' });
    let body;
    try {
      body = await readJson(req, 4096);
    } catch (err) {
      return send(res, err.status ?? 400, { ok: false, error: err.message });
    }
    const address = clientAddress(req);
    const retryAfter = gate.limiter.waiting(address);
    if (retryAfter) return send(res, 429, { ok: false, retryAfter, error: 'too many wrong passwords' });
    const viaPasskey = typeof body?.passkeyToken === 'string' && passkeys.consume(body.passkeyToken);
    if (!viaPasskey && !(await checkPassword(gate.password, typeof body?.password === 'string' ? body.password : ''))) {
      const wait = gate.limiter.failed(address);
      log.warn(`wrong admin password from ${address} at the login${wait ? `; next try in ${Math.round(wait / 1000)} s` : ''}`);
      return send(res, 401, { ok: false, wrongPassword: true, error: 'wrong password' });
    }
    gate.limiter.succeeded(address);
    return send(res, 200, { ok: true }, 'application/json', { ...SECURITY_HEADERS, 'set-cookie': sessions.create(req, passwordFingerprint(gate.password), login.rememberMs) });
  }

  /**
   * The setup wizard and its API (src/onboarding.js), only while the config folder has the
   * onboarding marker. Everything but the page and its state needs a visitor on the local
   * network or the code from the log; what writes also needs the X-Requested-With header.
   */
  async function onboardingRoute(req, res, method, p) {
    if (!onboarding.active) return send(res, 404, { error: 'not found' });
    if (method === 'GET' && p === '/setup') return sendFile(res, path.join(publicDir, 'setup.html'));
    if (method === 'GET' && p === '/setup.js') return sendFile(res, path.join(publicDir, 'setup.js'));
    const route = p.slice('/api/onboarding/'.length);
    if (method === 'GET' && route === 'state') return send(res, 200, { active: true, allowed: onboarding.allowed(req), version: VERSION });
    if (method !== 'GET' && req.headers['x-requested-with'] !== 'dashboard') return send(res, 403, { error: 'missing X-Requested-With' });
    let body = null;
    if (method === 'POST') {
      try {
        body = await readJson(req);
      } catch (err) {
        return send(res, err.status ?? 400, { ok: false, error: err.message });
      }
    }
    if (method === 'POST' && route === 'code') {
      const out = onboarding.verify(req, body?.code);
      return out.ok ? send(res, 200, { ok: true }, 'application/json', { ...SECURITY_HEADERS, ...out.headers }) : send(res, out.status, out.body);
    }
    if (!onboarding.allowed(req)) return send(res, 401, { ok: false, needsCode: true, error: 'the code from the log is needed' });
    if (method === 'GET' && route === 'widgets') return send(res, 200, { widgets: widgetList(state.registry) });
    if (route === 'docker' || route === 'containers') {
      const { servers, errors } = wizardDocker(body?.docker);
      if (route === 'docker') {
        return send(res, 200, { socketMounted: fs.existsSync(dockerSocket ?? DEFAULT_SOCKET), servers: await checkDocker({ servers, get: dockerGet }), errors });
      }
      return send(res, 200, await scanContainers({ servers, widgets: widgetList(state.registry), host: hostName(req.headers.host), get: dockerGet }));
    }
    if (method === 'GET' && route === 'status') {
      // what the environment sets already: those win over what the wizard writes
      return send(res, 200, { host: hostName(req.headers.host) });
    }
    if (method === 'POST' && route === 'test') return send(res, 200, await testWidget(body?.type, body?.options));
    if (method === 'POST' && route === 'homepage') return send(res, 200, homepageDryRun(body?.files));
    if (method === 'POST' && route === 'finish') {
      const files = setupFiles(body ?? {});
      if (files.error) return send(res, 400, { ok: false, error: files.error });
      const out = onboarding.finish(files.files);
      if (!out.ok) return send(res, 409, { ok: false, exists: out.exists, error: `already there: ${out.exists.join(', ')}` });
      await reload();
      return send(res, 200, out);
    }
    return send(res, 404, { error: 'not found' });
  }

  /**
   * The Docker servers of the wizard: the ones the dashboard has (docker.yaml or the mounted
   * socket) and the ones added in the wizard ([{ address, name? }]), each name once.
   */
  function wizardDocker(given) {
    const servers = [...state.config.docker];
    const added = [];
    const errors = [];
    for (const [i, g] of (Array.isArray(given) ? given : []).slice(0, 10).entries()) {
      const out = parseDockerAddress(g?.address, g?.name);
      if (out.error) errors.push(`docker[${i}]: ${out.error}`);
      else if (servers.some((s) => s.name === out.server.name)) errors.push(`docker[${i}]: the name "${out.server.name}" is taken`);
      else {
        servers.push(out.server);
        added.push(out.server);
      }
    }
    return { servers, added, errors };
  }

  /** One run of a widget with the options the wizard has, to show that they work. */
  async function testWidget(type, raw) {
    const widget = typeof type === 'string' ? state.registry.get(type) : null;
    if (!widget?.server) return { ok: false, error: `unknown widget "${String(type).slice(0, 40)}"` };
    const { options, errors } = validateOptions(widget.manifest.options, raw && typeof raw === 'object' ? raw : {}, new Set());
    if (errors.length) return { ok: false, error: errors.join('; ') };
    const secretValues = Object.entries(widget.manifest.options).filter(([k, d]) => d.secret && typeof options[k] === 'string' && options[k]).map(([k]) => options[k]);
    // a runtime of its own, in this process: the dashboard's instances and their worker stay as they are
    const rt = new WidgetRuntime({ registry: state.registry, log, timeoutMs, configDir: path.resolve(configDir) });
    rt.setInstances(new Map([['setup-test', { type: widget.manifest.id, apiVersion: widget.manifest.apiVersion, options, secretValues, refreshMs: 1000, fields: null, highlight: null, errors: [] }]]), state.registry, secretValues);
    const r = await rt.get('setup-test');
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, blocks: (r.data?.blocks ?? []).slice(0, 4).map((b) => ({ label: b.label, value: b.value, unit: b.unit ?? null })) };
  }

  /** homepage's files loaded as the dashboard would, without writing them: what carries over. */
  function homepageDryRun(files) {
    const given = Object.fromEntries(Object.entries(files && typeof files === 'object' ? files : {}).filter(([k, v]) => HOMEPAGE_FILES.includes(k) && typeof v === 'string'));
    if (!Object.keys(given).length) return { ok: false, error: `none of ${HOMEPAGE_FILES.join(', ')}` };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-import-'));
    try {
      for (const [name, text] of Object.entries(given)) fs.writeFileSync(path.join(dir, name), text);
      const config = loadConfig(dir, { env });
      const { layout } = buildState({ config, registry: state.registry, groups: mergeDiscovered(config.services, []).groups, secrets: config.secrets });
      const services = [];
      const walk = (groups) => {
        for (const g of groups) {
          for (const s of g.services ?? []) services.push({ group: g.name, name: s.name, widgets: s.widgets.map((w) => w.type), unknown: s.widgets.filter((w) => !w.known).map((w) => w.type) });
          walk(g.groups ?? []);
        }
      };
      walk(layout.groups);
      const scrubbed = (list) => list.map((m) => `${m.file}${m.path ? ` ${m.path}` : ''}: ${m.message}`);
      return { ok: true, files: Object.keys(given), services, bookmarks: layout.bookmarks.reduce((n, g) => n + g.bookmarks.length, 0), header: layout.header.length, errors: scrubbed(layout.messages.errors), warnings: scrubbed(layout.messages.warnings) };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  /**
   * The files the wizard writes: settings, services, header widgets and bookmarks from its
   * steps, homepage's files as they are in their place, and the commented docker.yaml and
   * kubernetes.yaml of the example config. { files } or { error }.
   */
  function setupFiles(body) {
    const s = body.settings ?? {};
    const sec = body.security ?? {};
    // the admin password: required; only its hash is written
    if (typeof sec.adminPassword !== 'string' || sec.adminPassword.length < MIN_PASSWORD) {
      return { error: `security.adminPassword: at least ${MIN_PASSWORD} characters` };
    }
    const hosts = Array.isArray(sec.allowedHosts) ? sec.allowedHosts.map((h) => String(h).trim().toLowerCase()).filter(Boolean) : [];
    if (hosts.some((h) => h !== '*' && !/^[a-z0-9.-]+(:\d{1,5})?$|^\[[0-9a-f:]+\](:\d{1,5})?$/.test(h)) || hosts.length > 20) return { error: 'security.allowedHosts: host names such as dash.lan' };
    const security = { allowedHosts: [...new Set(hosts)], adminPassword: hashPassword(sec.adminPassword), login: sec.login === true };
    const title = typeof s.title === 'string' && s.title.trim() ? s.title.trim().slice(0, 100) : 'Homelab';
    if (s.language !== undefined && !LANGUAGES.includes(s.language)) return { error: 'settings.language: not a known language' };
    if (s.theme !== undefined && !THEMES.includes(s.theme)) return { error: 'settings.theme: auto, dark or light' };
    if (s.color !== undefined && !COLORS.includes(s.color)) return { error: 'settings.color: not a known colour' };
    const cards = [];
    for (const [i, c] of (Array.isArray(body.services) ? body.services : []).entries()) {
      const name = typeof c?.name === 'string' ? c.name.trim().slice(0, 100) : '';
      if (!name) return { error: `services[${i}]: a name is needed` };
      const card = { group: typeof c.group === 'string' && c.group.trim() ? c.group.trim().slice(0, 100) : 'Services', name };
      for (const k of ['href', 'icon', 'description', 'container', 'server']) if (typeof c[k] === 'string' && c[k].trim()) card[k] = c[k].trim().slice(0, 500);
      if (card.href && !/^https?:\/\//.test(card.href)) return { error: `${name}: the link must start with http:// or https://` };
      if (c.widget?.type) {
        const widget = state.registry.get(c.widget.type);
        if (!widget) return { error: `${name}: unknown widget "${String(c.widget.type).slice(0, 40)}"` };
        const { type, ...raw } = c.widget;
        const { errors } = validateOptions(widget.manifest.options, raw, new Set());
        if (errors.length) return { error: `${name}: ${errors.join('; ')}` };
        const opts = Object.fromEntries(Object.entries(raw).filter(([k, v]) => k in widget.manifest.options && v !== '' && v !== null && v !== undefined));
        card.widget = { type: widget.manifest.id, ...opts };
      }
      cards.push(card);
    }
    const files = {
      'settings.yaml': settingsYaml({
        title, language: s.language ?? 'en', theme: s.theme ?? 'auto', color: s.color ?? 'slate',
        ...security,
      }),
      'services.yaml': servicesYaml(cards),
      'widgets.yaml': WIDGETS_YAML,
      'bookmarks.yaml': BOOKMARKS_YAML,
    };
    for (const name of ['docker.yaml', 'kubernetes.yaml']) {
      try {
        files[name] = fs.readFileSync(path.join(ROOT, 'config.example', name), 'utf8');
      } catch {
        // not in this install
      }
    }
    // servers added in the wizard: docker.yaml lists them, with the mounted socket (listing any turns the implicit one off)
    const docker = wizardDocker(body.docker);
    if (docker.errors.length) return { error: docker.errors.join('; ') };
    if (docker.added.length) files['docker.yaml'] = dockerYaml(docker.servers);
    const homepage = body.homepage && typeof body.homepage === 'object' ? body.homepage : {};
    for (const [name, text] of Object.entries(homepage)) if (HOMEPAGE_FILES.includes(name) && typeof text === 'string') files[name] = text;
    // homepage's settings.yaml as it is, with the security the wizard set below it
    if (typeof homepage['settings.yaml'] === 'string') files['settings.yaml'] = `${homepage['settings.yaml'].trimEnd()}\n\n${securityYaml(security)}`;
    return { files };
  }

  /** Calls a `target: hidden-iframe` URL (configured, never from the request) and reports the outcome. */
  async function runAction(action) {
    const secrets = [...(state.config?.secrets ?? [])];
    try {
      const res = await fetch(action.href, { signal: AbortSignal.timeout(ACTION_TIMEOUT_MS), redirect: 'follow' });
      await res.body?.cancel();
      log.info(`action ${action.name}: ${res.status}`);
      return { ok: res.ok, status: res.status };
    } catch (err) {
      const error = scrub(describeError(err), secrets);
      log.warn(`action ${action.name}: ${error}`);
      return { ok: false, error };
    }
  }

  return {
    handler,
    reload,
    onboarding,
    get layout() {
      return state.layout;
    },
    runtime,
    checkPluginUpdates,
    close() {
      clearInterval(pluginTimer);
      updates.stop();
      watcher?.close();
      discovery.stop();
      clearInterval(heartbeat);
      sandbox?.close();
      for (const res of sseClients) res.end();
    },
  };
}
