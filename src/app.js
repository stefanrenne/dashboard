// The dashboard application: state (config, widgets, discovery) and the HTTP handler.
// src/server.js only parses arguments and listens; tests use createApp directly.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config/load.js';
import { watchConfig } from './config/watch.js';
import { loadRegistry } from './plugins/loader.js';
import { syncPlugins, withDefaultPlugins, pluginUpdates, defaultPluginsFor } from './plugins/installer.js';
import { WidgetRuntime, describeError } from './plugins/runtime.js';
import { WidgetSandbox } from './plugins/sandbox.js';
import { Discovery, mergeDiscovered } from './discovery/index.js';
import { withMountedSocket, DEFAULT_SOCKET } from './discovery/docker.js';
import { buildState } from './layout.js';
import { renderIndex, renderManifest, renderRobots } from './page.js';
import { UpdateCheck, RELEASES_URL, isNewer } from './update.js';
import { suggestUrl, fetchSuggestions } from './suggest.js';
import { ActionGate, checkPassword, passwordFingerprint } from './actionauth.js';
import { SessionStore, OPEN_PATHS } from './login.js';
import { Passkeys } from './passkeys.js';
import { Onboarding } from './onboarding/wizard.js';
import { CUSTOM_FILES } from './config/schema.js';
import { send, sendFile, readJson, fromThisPage, isInternal, securityHeaders, SECURITY_HEADERS, clientAddress, allowedHosts, hostName, hostAllowed, hostRefusedPage } from './http.js';
import { settingsRoutes } from './settings/routes.js';
import { onboardingRoutes } from './onboarding/routes.js';

export const ACTION_TIMEOUT_MS = 30_000;
// open /api/events streams, overall and per client address (behind a proxy: all of them)
const EVENT_STREAMS = { max: 500, perAddress: 50 };
import { safeJoin, scrub } from './util.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SHARED_FILES = ['common.js', 'theme.css'];
const REPO_URL = 'https://github.com/stefanrenne/dashboard';
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
  const sandbox = env.DASHBOARD_WIDGET_ISOLATION === 'off' ? null : new WidgetSandbox({ log, env, memoryMb: Number(env.DASHBOARD_WIDGET_MEMORY_MB) > 0 ? Number(env.DASHBOARD_WIDGET_MEMORY_MB) : undefined });
  const runtime = new WidgetRuntime({ registry: new Map(), log, timeoutMs, sandbox, configDir: path.resolve(configDir) });
  const state = { config: null, registry: new Map(), pluginResult: { errors: [], warnings: [] }, registryErrors: [], layout: null, actions: new Map(), frames: [], loginOn: false, hostsNoted: false, anyHostNoted: false };
  const updates = new UpdateCheck({ url: releasesUrl, log, onChange: () => state.config && rebuild() });
  const discovery = new Discovery({ log, env, onChange: () => state.config && rebuild(), ...discoveryOptions });
  let chain = Promise.resolve();
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
    const secrets = new Set([...state.config.secrets, ...discovery.secrets]);
    const pluginMessages = (list) =>
      list.map((e) => ({ file: 'settings.yaml', path: `plugins: ${e.source}`, message: e.message }));
    const { instances, layout, actions, frames } = buildState({
      config: state.config,
      registry: state.registry,
      groups: merged.groups,
      extraErrors: [...pluginMessages(state.pluginResult.errors), ...pluginMessages(state.registryErrors), ...discovery.errors],
      extraWarnings: [...pluginMessages(state.pluginResult.warnings), ...merged.warnings],
      secrets,
      actionsProtected: gate.protected,
    });
    runtime.setInstances(instances, state.registry, secrets);
    gate.rememberMs = state.config.settings.actionRememberMs;
    state.actions = actions;
    state.frames = frames;
    // the version is shown unless hideVersion: true, as in homepage
    const showVersion = state.config.settings.hideVersion !== true;
    const checkUpdates = showVersion && !state.config.settings.disableUpdateCheck;
    if (checkUpdates) updates.start();
    else updates.stop();
    const latest = checkUpdates ? updates.latest : null;
    const update = latest && isNewer(latest.version, VERSION) ? latest : null;
    const plugins = showVersion ? state.pluginResult.packages ?? [] : [];
    state.loginOn = Boolean(state.config.settings.login?.required && gate.password);
    const messages = state.config.settings.login?.required && !gate.password
      ? { ...layout.messages, warnings: [...layout.messages.warnings, { file: 'settings.yaml', path: 'login', message: 'needs an admin password (set one on the settings page); the page opens without a login now' }] }
      : layout.messages;
    state.layout = { ...layout, settings: { ...layout.settings, login: state.loginOn }, messages, version: VERSION, versionUrl: showVersion ? versionUrl(VERSION) : null, showVersion, update, plugins };
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
    pluginTimer = ms > 0 ? setInterval(() => checkPluginUpdates().catch((err) => log.warn(`plugins: the update check failed: ${err.message}`)), ms).unref() : null;
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
      await discovery.configure(config);
      rebuild();
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



  const onboardingRoute = onboardingRoutes({ configDir, env, log, publicDir, exampleDir: path.join(ROOT, 'config.example'), version: VERSION, dockerSocket: dockerSocket ?? DEFAULT_SOCKET, onboarding, state, reload, runtime });
  const settingsRoute = settingsRoutes({ configDir, env, log, publicDir, defaultPlugins, gate, passkeys, sessions, state, reload, runtime });

  async function handler(req, res) {
    const hosts = hostsNow();
    if (!hostAllowed(req.headers.host, hosts)) {
      log.warn(`refused a request for host "${String(req.headers.host ?? '').slice(0, 100)}" (not in allowedHosts)`);
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
    if (method !== 'GET' && !fromThisPage(req)) return send(res, 403, { error: 'missing X-Requested-With' });
    try {
      if (!state.config && p !== '/api/health') {
        return send(res, 503, 'The dashboard could not load its configuration; see its log.', 'text/plain; charset=utf-8');
      }
      if (method === 'GET' && SHARED_FILES.includes(p.slice(1))) return sendFile(res, path.join(publicDir, p.slice(1)));
      if (p === '/setup' || p === '/setup.js' || p.startsWith('/api/onboarding/')) return await onboardingRoute(req, res, { method, path: p });
      // a first install: the wizard first (docker/start.sh wrote the marker into the empty config folder)
      if (method === 'GET' && (p === '/' || p === '/index.html') && onboarding.active) {
        res.writeHead(302, { location: 'setup', 'cache-control': 'no-store', ...SECURITY_HEADERS });
        return res.end();
      }
      const login = state.config?.settings.login;
      const { loginOn } = state;
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
      if (p === '/settings' || p === '/settings.js' || p === '/api/settings' || p.startsWith('/api/settings/')) return await settingsRoute(req, res, { method, path: p, query: url.searchParams, loggedIn });
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
        const allowed = await gate.check(req, 'password', { what: 'the widget sync', loggedIn });
        if (!allowed.ok) return send(res, allowed.status, allowed.body);
        await reload({ update: url.searchParams.get('update') === '1' });
        return send(res, 200, { errors: state.pluginResult.errors, warnings: state.pluginResult.warnings }, 'application/json', { ...SECURITY_HEADERS, ...allowed.headers });
      }
      if (method === 'POST' && /^\/api\/widgets\/[^/]+\/action$/.test(p)) {
        const id = p.split('/')[3];
        const allowed = await gate.check(req, runtime.instances.get(id)?.confirm ?? null, { what: `widget ${runtime.instances.get(id)?.type ?? id}`, loggedIn });
        if (!allowed.ok) return send(res, allowed.status, allowed.body);
        const out = await runtime.action(id);
        return send(res, out.busy ? 409 : out.missing ? 404 : 200, out, 'application/json', { ...SECURITY_HEADERS, ...allowed.headers });
      }
      if (method === 'POST' && p.startsWith('/api/run/')) {
        const action = state.actions.get(p.slice('/api/run/'.length));
        if (!action) return send(res, 404, { error: 'no such action' });
        const allowed = await gate.check(req, action.confirm ?? null, { what: `the webhook of ${action.name}`, loggedIn });
        if (!allowed.ok) return send(res, allowed.status, allowed.body);
        return send(res, 200, await runAction(action), 'application/json', { ...SECURITY_HEADERS, ...allowed.headers });
      }
      // whether this browser is unlocked (the page's lock icon), and locking it again
      if (method === 'GET' && p === '/api/lock') return send(res, 200, { protected: gate.protected, unlocked: loggedIn || gate.unlocked(req), loggedIn });
      if (method === 'POST' && p === '/api/lock') {
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
   * Passkeys for whoever is not logged in yet (the login page, the password dialogs):
   * `GET /api/passkey` (whether one can be used here), `POST /api/passkey/options` (a challenge)
   * and `POST /api/passkey/verify` (the browser's answer; a one-time token that the login and
   * the x-dashboard-passkey header take in place of the password).
   */
  async function passkeyRoute(req, res, method, p) {
    const usable = Boolean(gate.password) && !gate.password.broken;
    if (method === 'GET' && p === '/api/passkey') return send(res, 200, { available: usable && passkeys.available(req) });
    if (method !== 'POST') return send(res, 404, { error: 'not found' });
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
    let out;
    const tried = await gate.limiter.attempt(req, () => (out = passkeys.verify(req, body)).ok, { log, wrong: 'a passkey refused' });
    if (tried.retryAfter) return send(res, 429, { ok: false, retryAfter: tried.retryAfter, error: 'too many wrong tries' });
    if (!tried.ok) return send(res, 401, { ok: false, error: out.error });
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
    if (method === 'POST' && p === '/api/logout') return send(res, 200, { ok: true }, 'application/json', { ...SECURITY_HEADERS, 'set-cookie': sessions.end(req) });
    if (method !== 'POST' || p !== '/api/login') return send(res, 404, { error: 'not found' });
    if (!loginOn) return send(res, 404, { error: 'no login page' });
    let body;
    try {
      body = await readJson(req, 4096);
    } catch (err) {
      return send(res, err.status ?? 400, { ok: false, error: err.message });
    }
    const tried = await gate.limiter.attempt(req, async () => (typeof body?.passkeyToken === 'string' && passkeys.consume(body.passkeyToken))
      || checkPassword(gate.password, typeof body?.password === 'string' ? body.password : ''), { log, wrong: 'wrong admin password at the login' });
    if (tried.retryAfter) return send(res, 429, { ok: false, retryAfter: tried.retryAfter, error: 'too many wrong passwords' });
    if (!tried.ok) return send(res, 401, { ok: false, wrongPassword: true, error: 'wrong password' });
    return send(res, 200, { ok: true }, 'application/json', { ...SECURITY_HEADERS, 'set-cookie': sessions.create(req, passwordFingerprint(gate.password), login.rememberMs) });
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

