// The setup wizard's routes: /setup, /setup.js and /api/onboarding/*, while the config folder is
// new (wizard.js: the marker, the one-time code). It shows the Docker servers and running
// containers, tries widgets, reads homepage's files, and at the end writes the config files.
// Everything but the page and its state needs the local network or the code from the log.

import fs from 'node:fs';
import path from 'node:path';
import { send, sendFile, readJson, hostName, hostIsAddress, SECURITY_HEADERS } from '../http.js';
import { DEFAULTS, MIN_PASSWORD } from '../config/schema.js';
import { hashPassword } from '../actionauth.js';
import { checkDocker, dockerGet } from '../discovery/docker.js';
import { widgetCatalog } from '../plugins/loader.js';
import { validateOptions } from '../plugins/options.js';
import { tryWidget } from '../plugins/runtime.js';
import { homepageFiles, homepageDryRun } from '../homepage.js';
import { checkSettings } from '../settings/form.js';
import { scanContainers, settingsYaml, securityYaml, servicesYaml, parseDockerAddress, dockerYaml, WIDGETS_YAML, BOOKMARKS_YAML } from './wizard.js';

/**
 * The wizard's routes for the app: (req, res, { method, path }). `app` gives what they use:
 * configDir, env, log, publicDir, exampleDir (the config.example folder), timeoutMs, version,
 * dockerSocket, onboarding (wizard.js), state (config, registry) and reload().
 */
export function onboardingRoutes(app) {
  const { onboarding, state } = app;
  // the widgets the wizard offers: the ones with an address to point at a service
  const widgets = () => widgetCatalog(state.registry).filter((w) => w.options.url);

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
    const checked = checkSettings({
      title: typeof s.title === 'string' ? s.title.slice(0, 100) : '', allowedHosts: Array.isArray(sec.allowedHosts) ? sec.allowedHosts : [],
      ...Object.fromEntries(['language', 'theme', 'color'].filter((k) => s[k] !== undefined).map((k) => [k, s[k]])),
    });
    if (checked.error) return { error: checked.error };
    const v = checked.values;
    const security = { allowedHosts: v.allowedHosts, adminPassword: hashPassword(sec.adminPassword), login: sec.login === true };
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
        const opts = Object.fromEntries(Object.entries(raw).filter(([k, x]) => k in widget.manifest.options && x !== '' && x !== null && x !== undefined));
        card.widget = { type: widget.manifest.id, ...opts };
      }
      cards.push(card);
    }
    const files = {
      'settings.yaml': settingsYaml({
        title: v.title || DEFAULTS.title, language: v.language ?? DEFAULTS.language, theme: v.theme ?? DEFAULTS.theme, color: v.color ?? DEFAULTS.color,
        ...security,
      }),
      'services.yaml': servicesYaml(cards),
      'widgets.yaml': WIDGETS_YAML,
      'bookmarks.yaml': BOOKMARKS_YAML,
    };
    for (const name of ['docker.yaml', 'kubernetes.yaml']) {
      const example = path.join(app.exampleDir, name);
      if (fs.existsSync(example)) files[name] = fs.readFileSync(example, 'utf8');
    }
    // servers added in the wizard: docker.yaml lists them, with the mounted socket (listing any turns the implicit one off)
    const docker = wizardDocker(body.docker);
    if (docker.errors.length) return { error: docker.errors.join('; ') };
    if (docker.added.length) files['docker.yaml'] = dockerYaml(docker.servers);
    const homepage = homepageFiles(body.homepage) ?? {};
    Object.assign(files, homepage);
    // homepage's settings.yaml as it is, with the security the wizard set below it
    if (homepage['settings.yaml'] !== undefined) files['settings.yaml'] = `${homepage['settings.yaml'].trimEnd()}\n\n${securityYaml(security)}`;
    return { files };
  }

  return async function handle(req, res, { method, path: p }) {
    if (!onboarding.active) return send(res, 404, { error: 'not found' });
    if (method === 'GET' && p === '/setup') return sendFile(res, path.join(app.publicDir, 'setup.html'));
    if (method === 'GET' && p === '/setup.js') return sendFile(res, path.join(app.publicDir, 'setup.js'));
    const route = p.slice('/api/onboarding/'.length);
    if (method === 'GET' && route === 'state') return send(res, 200, { active: true, allowed: onboarding.allowed(req), version: app.version });
    let body = null;
    if (method === 'POST') {
      try {
        body = await readJson(req);
      } catch (err) {
        return send(res, err.status ?? 400, { ok: false, error: err.message });
      }
    }
    if (method === 'POST' && route === 'code') {
      const out = await onboarding.verify(req, body?.code);
      return out.ok ? send(res, 200, { ok: true }, 'application/json', { ...SECURITY_HEADERS, ...out.headers }) : send(res, out.status, out.body);
    }
    if (!onboarding.allowed(req)) return send(res, 401, { ok: false, needsCode: true, error: 'the code from the log is needed' });
    if (method === 'GET' && route === 'widgets') return send(res, 200, { widgets: widgets() });
    if (route === 'docker' || route === 'containers') {
      const { servers, errors } = wizardDocker(body?.docker);
      if (route === 'docker') return send(res, 200, { socketMounted: fs.existsSync(app.dockerSocket), servers: await checkDocker({ servers, get: dockerGet }), errors });
      return send(res, 200, await scanContainers({ servers, widgets: widgets(), host: hostName(req.headers.host), get: dockerGet }));
    }
    // the name the wizard was opened by, and whether it is a name the dashboard would need to allow
    if (method === 'GET' && route === 'status') return send(res, 200, { host: hostName(req.headers.host), isAddress: hostIsAddress(req.headers.host), minPassword: MIN_PASSWORD });
    if (method === 'POST' && route === 'test') return send(res, 200, await tryWidget({ registry: state.registry, log: app.log, timeoutMs: app.timeoutMs, configDir: path.resolve(app.configDir) }, body?.type, body?.options));
    if (method === 'POST' && route === 'homepage') return send(res, 200, homepageDryRun(body?.files, { registry: state.registry, env: app.env }));
    if (method === 'POST' && route === 'finish') {
      const files = setupFiles(body ?? {});
      if (files.error) return send(res, 400, { ok: false, error: files.error });
      const out = onboarding.finish(files.files);
      if (!out.ok) return send(res, 409, { ok: false, exists: out.exists, error: `already there: ${out.exists.join(', ')}` });
      await app.reload();
      return send(res, 200, out);
    }
    return send(res, 404, { error: 'not found' });
  };
}
