// The settings page's routes: /settings, /settings.js and /api/settings/*. The admin password opens
// them (a login counts, and the browser stays unlocked as for a press); without one yet, only the
// local network, which must set one first. Every route is a row of ROUTES; one wrapper does what
// they all need: the access check, reading the JSON body (up to the row's limit) and answering a
// ConfigEditError with its status. X-Requested-With on writes is checked in app.js.

import path from 'node:path';
import { send, sendFile, readJson, isLocal, SECURITY_HEADERS, BODY_LIMIT } from '../http.js';
import { ConfigEditError, editableFiles, editableFile, configPath, readConfigFile, writeConfigFile, sameVersion, checkConfigText, listHistory, readHistory } from '../config/edit.js';
import { MIN_PASSWORD, SECURITY_KEYS, schemaForPage } from '../config/schema.js';
import { parseConfigYaml } from '../config/include.js';
import { checkPassword, hashPassword, passwordFingerprint } from '../actionauth.js';
import { rpContext } from '../passkeys.js';
import { tryWidget } from '../plugins/runtime.js';
import { checkDocker, dockerGet } from '../discovery/docker.js';
import { widgetCatalog } from '../plugins/loader.js';
import { homepageFiles, homepageDryRun, keepOwnSecurity } from '../homepage.js';
import { resolveIcon } from '../icons.js';
import { scrub } from '../util.js';
import { readSettings, checkSettings, writeSettings, writeAdminPassword, formForPage } from './form.js';
import { readLayout, checkLayout, writeLayout } from './layout.js';
import { readPlugins, checkPlugins, writePlugins } from './plugins.js';
import { readServices, writeServices } from './services.js';
import { readBookmarks, writeBookmarks } from './bookmarks.js';
import { readServers, writeServers } from './servers.js';
import { readHeader, writeHeader, optionsForTest, formCatalog } from './widgets.js';
import { maskConfigText, unmaskConfigText, secretsOf } from './secrets.js';
import { testKubernetes, testProxmox } from './tests.js';
import { iconSuggestions } from './icons.js';

const SMALL = 64 * 1024;

/**
 * The settings routes for the app: (req, res, { method, path, query, loggedIn }) → whether it
 * answered. `app` gives what they use of the running dashboard: configDir, env, log, publicDir,
 * runtime (tryWidget), defaultPlugins, gate, passkeys, sessions, state (config, layout, registry,
 * pluginResult) and reload().
 */
export function settingsRoutes(app) {
  const { configDir, env, log, gate, passkeys, sessions, state } = app;
  const schemaFor = (type) => state.registry?.get(type)?.manifest?.options ?? null;
  const knownSecrets = () => [...(state.config?.secrets ?? [])];
  const catalog = () => formCatalog(widgetCatalog(state.registry));

  // the groups the dashboard has now, discovered ones included, for the Groups section
  const groupInfo = () => ({
    services: (state.layout?.groups ?? []).map((g) => ({ name: g.name, nested: (g.groups ?? []).map((n) => n.name) })),
    bookmarks: (state.layout?.bookmarks ?? []).map((g) => g.name),
  });
  // the services the dashboard found by itself: shown, not edited (their labels are the source)
  const discovered = () => (state.layout?.groups ?? []).flatMap(function all(g, _, __, parent = '') {
    const name = parent ? `${parent} › ${g.name}` : g.name;
    return [...g.services.filter((x) => x.discovered).map((x) => ({ group: name, name: x.name, origin: x.discovered })), ...(g.groups ?? []).flatMap((n) => all(n, 0, 0, name))];
  });
  // the main answer: settings.yaml's fields and what the General, Security, Groups and Widgets sections show
  const answer = (req) => {
    const rp = rpContext(req);
    const r = state.pluginResult;
    return {
      ok: true, schema: schemaForPage(), form: formForPage(), ...readSettings(configDir), layout: readLayout(configDir, groupInfo()),
      plugins: { ...readPlugins(configDir, app.defaultPlugins), errors: r.errors ?? [], warnings: r.warnings ?? [], packages: r.packages ?? [] },
      noPassword: !gate.password,
      passkeys: { secure: Boolean(rp), host: rp?.rpId ?? null, list: rp ? passkeys.forHost(rp.rpId) : [] },
    };
  };
  const saved = async (out, what) => {
    if (out?.changed === false) return;
    log.info(`settings: ${what} saved from the settings page`);
    await app.reload();
  };
  // the config files as text: an included file is masked by the rules of the file it ends up in
  const whereOf = (file) => editableFile(configDir, file) ?? file;
  const masked = (file, text) => maskConfigText(whereOf(file), text, schemaFor, knownSecrets());

  // [method, path (a string, or a RegExp whose groups are passed on), handler(ctx, ...groups), body limit]
  const ROUTES = [
    ['GET', '', ({ req }) => answer(req)],
    ['POST', '/unlock', () => ({ ok: true })],
    ['POST', '', async ({ req, body }) => {
      const checked = checkSettings(body?.values);
      if (checked.error) throw new ConfigEditError(checked.error, 400);
      await saved(writeSettings(configDir, checked.values), Object.keys(checked.values).join(', '));
      return answer(req);
    }],
    ['POST', '/password', async ({ req, res, body }) => {
      if (typeof body?.next !== 'string' || body.next.length < MIN_PASSWORD) throw new ConfigEditError(`at least ${MIN_PASSWORD} characters`, 400);
      if (gate.password) {
        // the current password, every time: also when logged in or unlocked
        const tried = await gate.limiter.attempt(req, () => checkPassword(gate.password, typeof body.current === 'string' ? body.current : ''), { log, wrong: 'wrong current admin password on the settings page' });
        if (tried.retryAfter) return { status: 429, body: { ok: false, retryAfter: tried.retryAfter, error: 'too many wrong passwords' } };
        if (!tried.ok) return { status: 401, body: { ok: false, wrongPassword: true, error: 'the current password is not right' } };
      }
      writeAdminPassword(configDir, hashPassword(body.next));
      log.info('settings: a new admin password; every login session ends');
      await app.reload();
      // the sessions of the old password end; this browser keeps going with one of the new
      const login = state.config.settings.login;
      const renewed = login?.required && gate.password ? { 'set-cookie': sessions.create(req, passwordFingerprint(gate.password), login.rememberMs) } : {};
      return { body: answer(req), headers: { ...SECURITY_HEADERS, ...renewed } };
    }],
    ['POST', '/passkeys/options', ({ req }) => {
      const options = passkeys.registerOptions(req, state.config.settings.title);
      if (!options) throw new ConfigEditError('passkeys need the dashboard over https, by its host name', 400);
      return { ok: true, publicKey: options };
    }],
    ['POST', '/passkeys', ({ req, body }) => {
      const out = passkeys.register(req, body);
      if (!out.ok) return { status: 400, body: out };
      log.info(`settings: a passkey added (${out.passkey.name}, for ${rpContext(req).rpId})`);
      return answer(req);
    }],
    ['POST', '/passkeys/remove', ({ req, body }) => {
      if (!passkeys.remove(body?.id)) throw new ConfigEditError('no such passkey', 404);
      log.info('settings: a passkey removed');
      return answer(req);
    }],
    ['POST', '/layout', async ({ req, body }) => {
      const checked = checkLayout(body?.groups);
      if (checked.error) throw new ConfigEditError(checked.error, 400);
      await saved(writeLayout(configDir, checked.groups, readLayout(configDir, groupInfo())), 'the layout');
      return answer(req);
    }],
    ['POST', '/plugins', async ({ req, body }) => {
      const checked = checkPlugins(body?.entries);
      if (checked.error) throw new ConfigEditError(checked.error, 400);
      await saved(writePlugins(configDir, checked.entries), 'the plugins');
      return answer(req);
    }],

    // the forms of the other config files: GET reads, POST saves and answers as a read
    ['GET', '/services', () => ({ ok: true, ...readServices(configDir, schemaFor), widgets: catalog(), discovered: discovered() })],
    ['POST', '/services', async ({ body }) => {
      const out = writeServices(configDir, body?.items, body?.hash, { env }, schemaFor);
      await saved(out, 'services.yaml');
      return { ok: true, ...readServices(configDir, schemaFor), widgets: catalog(), discovered: discovered(), warnings: out.warnings };
    }, BODY_LIMIT],
    ['GET', '/header', () => ({ ok: true, ...readHeader(configDir, schemaFor), catalog: catalog() })],
    ['POST', '/header', async ({ body }) => {
      const out = writeHeader(configDir, body?.widgets, body?.hash, { env }, schemaFor);
      await saved(out, 'widgets.yaml');
      return { ok: true, ...readHeader(configDir, schemaFor), catalog: catalog(), warnings: out.warnings };
    }, BODY_LIMIT],
    ['GET', '/bookmarks', () => ({ ok: true, ...readBookmarks(configDir) })],
    ['POST', '/bookmarks', async ({ body }) => {
      const out = writeBookmarks(configDir, body?.items, body?.hash, { env });
      await saved(out, 'bookmarks.yaml');
      return { ok: true, ...readBookmarks(configDir), warnings: out.warnings };
    }, BODY_LIMIT],
    ['GET', /^\/servers\/([a-z]+\.yaml)$/, (ctx, file) => ({ ok: true, ...readServers(configDir, file) })],
    ['POST', /^\/servers\/([a-z]+\.yaml)$/, async ({ body }, file) => {
      const out = writeServers(configDir, file, body, body?.hash, { env });
      await saved(out, file);
      return { ok: true, ...readServers(configDir, file), warnings: out.warnings };
    }],

    // the config files as text
    ['GET', '/files', () => ({
      ok: true,
      files: editableFiles(configDir).map((e) => {
        const read = readConfigFile(configDir, e.file);
        return { file: e.file, root: e.root, from: e.from, at: e.at, exists: read.exists, hash: read.hash, size: read.text.length };
      }),
    })],
    ['GET', /^\/files\/(.+)\/history\/([^/]+)$/, (ctx, file, id) => ({ ok: true, file, id, text: masked(file, readHistory(configDir, file, id)).text })],
    // the path is decoded already: an included file's name has slashes (/files/groups/media.yaml)
    ['GET', /^\/files\/(.+)$/, (ctx, file) => {
      configPath(configDir, file);
      const read = readConfigFile(configDir, file);
      const out = masked(file, read.text);
      return { ok: true, file, exists: read.exists, hash: read.hash, text: out.text, secrets: out.secrets, history: listHistory(configDir, file) };
    }],
    ['POST', /^\/files\/(.+)$/, async ({ body }, file) => {
      if (typeof body?.text !== 'string' || typeof body?.hash !== 'string') throw new ConfigEditError('expected { text, hash }', 400);
      configPath(configDir, file);
      const where = whereOf(file);
      const current = readConfigFile(configDir, file);
      sameVersion(file, body.hash, current);
      const { text, warnings } = unmaskConfigText(where, body.text, current.text, schemaFor);
      // the admin password changes under Security, with the current one: never through a file
      const touchesPassword = where.root === 'settings.yaml' && (/^adminPassword(\.|\[|$)/.test(where.at)
        || (file === 'settings.yaml' && (parseConfigYaml(text)?.adminPassword ?? null) !== (parseConfigYaml(current.text)?.adminPassword ?? null)));
      if (touchesPassword) throw new ConfigEditError(`${file}: the admin password is changed under Security, with the current one`, 400);
      const out = writeConfigFile(configDir, file, text, { hash: body.hash, opts: { env } });
      await saved(out, file);
      return { ok: true, file, hash: out.hash, changed: out.changed, warnings: [...warnings, ...out.warnings] };
    }, BODY_LIMIT],

    // homepage's files: checked as the wizard does, then written all or none; this dashboard's
    // security (SECURITY_KEYS) stays as it is
    ['POST', /^\/import(\/check)?$/, async ({ body }, check) => {
      const given = homepageFiles(body?.files);
      if (!given) throw new ConfigEditError(`none of ${schemaForPage().homepageFiles.join(', ')}`, 400);
      if (given['settings.yaml'] !== undefined) given['settings.yaml'] = keepOwnSecurity(given['settings.yaml'], readConfigFile(configDir, 'settings.yaml').text);
      if (check) return { ...homepageDryRun(given, { registry: state.registry, env }), replaces: Object.keys(given).filter((k) => readConfigFile(configDir, k).exists) };
      const errors = Object.entries(given).flatMap(([name, text]) => checkConfigText(configDir, name, text, { env }).errors);
      if (errors.length) throw new ConfigEditError('not imported: fix these first', 400, { errors });
      for (const [name, text] of Object.entries(given)) writeConfigFile(configDir, name, text, { opts: { env } });
      log.info(`settings: imported homepage's ${Object.keys(given).join(', ')}`);
      await app.reload();
      return { ok: true, files: Object.keys(given) };
    }, BODY_LIMIT],

    // tests and lookups for the forms; their errors never carry a secret
    ['POST', '/widget-test', async ({ body }) => {
      const file = body?.file === 'widgets.yaml' ? 'widgets.yaml' : 'services.yaml';
      const { options, secrets } = optionsForTest(body?.type, body?.options, { known: secretsOf(file, readConfigFile(configDir, file).text, schemaFor), schemaFor, env });
      const out = await tryWidget(app.runtime, body?.type, options);
      return out.ok ? out : { ok: false, error: scrub(out.error, secrets) };
    }],
    ['POST', '/docker-test', async ({ body }) => {
      // a saved server, as the dashboard uses it (the mounted socket included)
      const servers = (state.config?.docker ?? []).filter((x) => x.name === body?.name);
      if (!servers.length) throw new ConfigEditError('no such server in docker.yaml; save it first', 404);
      const [result] = await checkDocker({ servers, get: dockerGet });
      return result;
    }],
    ['POST', '/kubernetes-test', async () => {
      const out = await testKubernetes(state.config?.kubernetes, { configDir, env });
      return out.ok ? out : { ok: false, error: scrub(out.error, knownSecrets()) };
    }],
    ['POST', '/proxmox-test', async ({ body }) => {
      const node = state.config?.proxmox?.[typeof body?.name === 'string' ? body.name : ''];
      if (!node) throw new ConfigEditError('no such node in proxmox.yaml; save it first', 404);
      const out = await testProxmox(node);
      return out.ok ? out : { ok: false, error: scrub(out.error, [node.secret, node.token, ...knownSecrets()]) };
    }],
    ['GET', '/icon', ({ query }) => {
      const name = String(query.get('name') ?? '').trim().slice(0, 300);
      // the address, and whether the page draws it as a mask in the text colour (mdi-, si-)
      const url = name ? resolveIcon(name) : null;
      return { ok: true, name, url: url?.split('#dash-mask')[0] ?? null, mask: Boolean(url?.includes('#dash-mask')) };
    }],
    ['GET', '/icons', () => ({ ok: true, ...iconSuggestions(configDir, state.config) })],
  ];

  const find = (method, route) => {
    for (const [m, p, handler, limit] of ROUTES) {
      if (m !== method) continue;
      if (typeof p === 'string' ? p === route : p.test(route)) return { handler, limit, groups: typeof p === 'string' ? [] : p.exec(route).slice(1) };
    }
    return null;
  };

  return async function handle(req, res, { method, path: p, query, loggedIn }) {
    if (method === 'GET' && p === '/settings') return sendFile(res, path.join(app.publicDir, 'settings.html'));
    if (method === 'GET' && p === '/settings.js') return sendFile(res, path.join(app.publicDir, 'settings.js'));
    const route = p.slice('/api/settings'.length);
    const noPassword = !gate.password;
    const allowed = noPassword
      ? isLocal(req) ? { ok: true, headers: {} } : { ok: false, status: 403, body: { ok: false, needsSetup: true, error: 'no admin password yet: set one from the local network first' } }
      : await gate.check(req, 'password', { what: 'the settings', loggedIn });
    if (!allowed.ok) return send(res, allowed.status, allowed.body);
    // without an admin password, setting one comes first: nothing else is saved
    if (noPassword && method === 'POST' && route !== '/password') return send(res, 403, { ok: false, needsSetup: true, error: 'set an admin password first' });
    const found = find(method, route);
    if (!found) return send(res, 404, { error: 'not found' });
    const headers = { ...SECURITY_HEADERS, ...allowed.headers };
    try {
      const body = method === 'POST' ? await readJson(req, found.limit ?? SMALL) : null;
      const out = await found.handler({ req, res, body, query }, ...found.groups);
      if (out && typeof out.status === 'number' && 'body' in out) return send(res, out.status, out.body, 'application/json', { ...headers, ...out.headers });
      if (out && out.headers && 'body' in out) return send(res, 200, out.body, 'application/json', { ...headers, ...out.headers });
      return send(res, 200, out, 'application/json', headers);
    } catch (err) {
      if (err instanceof ConfigEditError) return send(res, err.status, { ok: false, error: err.message, ...(err.errors ? { errors: err.errors, warnings: err.warnings } : {}) }, 'application/json', headers);
      if (typeof err.status === 'number') return send(res, err.status, { ok: false, error: err.message }, 'application/json', headers);
      throw err;
    }
  };
}
