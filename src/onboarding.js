// The onboarding wizard of a first install. docker/start.sh writes the marker `.onboarding` into
// an empty config folder; while it is there, `/` leads to `/setup`, a wizard that writes
// settings.yaml, services.yaml and the other files and then removes the marker. It works for a
// visitor on the local network, and for anyone else after the one-time code from the log.

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { FailureLimiter, cookieValue, secureRequest } from './actionauth.js';

export const MARKER = '.onboarding';
export const COOKIE = 'dash_setup';
export const BODY_LIMIT = 1024 * 1024;
export const LANGUAGES = ['en', 'nl', 'fr', 'de', 'es', 'ca', 'he', 'hr', 'hu', 'it', 'nb-NO', 'pt', 'ru', 'sv', 'vi', 'zh-Hans', 'zh-Hant'];
export const THEMES = ['auto', 'dark', 'light'];
export const COLORS = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
// homepage's files the wizard can take over as they are
export const HOMEPAGE_FILES = ['services.yaml', 'settings.yaml', 'bookmarks.yaml', 'widgets.yaml', 'docker.yaml'];
const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L

/** A code such as K7QM-3XWD, for the log. */
export function newCode() {
  const bytes = crypto.randomBytes(8);
  const chars = [...bytes].map((b) => CODE_LETTERS[b % CODE_LETTERS.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/** A private, loopback or link-local address (IPv4, IPv6, or IPv4 mapped in IPv6). */
export function isPrivateAddress(address) {
  let a = String(address ?? '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (a.startsWith('::ffff:')) a = a.slice(7);
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(a);
  if (v4) {
    const [x, y] = [Number(v4[1]), Number(v4[2])];
    return x === 10 || x === 127 || (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168) || (x === 100 && y >= 64 && y <= 127) || (x === 169 && y === 254);
  }
  if (!a.includes(':')) return false;
  return a === '::1' || /^f[cd][0-9a-f]{2}:/.test(a) || /^fe[89ab][0-9a-f]:/.test(a);
}

/** The addresses a request passed through: X-Forwarded-For and Forwarded `for=`, in order. */
export function forwardedChain(req) {
  const out = [];
  for (const part of String(req.headers['x-forwarded-for'] ?? '').split(',')) if (part.trim()) out.push(part.trim());
  for (const m of String(req.headers.forwarded ?? '').matchAll(/for="?([^";,]+)"?/gi)) out.push(m[1].replace(/:\d+$/, '').trim());
  return out;
}

/**
 * The visitor is on the local network: the connection comes from a private address, and so does
 * every address a proxy passed on. A proxy appends the real address, so a private one an
 * internet visitor writes into X-Forwarded-For does not help.
 */
export function isLocal(req) {
  if (!isPrivateAddress(req.socket?.remoteAddress)) return false;
  return forwardedChain(req).every((a) => isPrivateAddress(a.replace(/^([\d.]+):\d+$/, '$1')));
}

/**
 * The request body as JSON: only `application/json`, at most `limit` bytes. Rejects with an
 * Error whose `status` is the answer to give (413, 415 or 400).
 */
export function readJson(req, limit = BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    const fail = (status, message) => Object.assign(new Error(message), { status });
    if (!/^application\/json\b/i.test(String(req.headers['content-type'] ?? ''))) return reject(fail(415, 'expected application/json'));
    if (Number(req.headers['content-length']) > limit) return reject(fail(413, 'too large'));
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(fail(413, 'too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'));
      } catch {
        reject(fail(400, 'broken JSON'));
      }
    });
    req.on('error', (err) => reject(fail(400, err.message)));
  });
}

/** `ghcr.io/hotio/sonarr:release@sha256:…` → `hotio/sonarr`; `nginx` → `library/nginx`. */
export function imageRepository(image) {
  let name = String(image ?? '').trim().toLowerCase().split('@')[0];
  const lastSlash = name.lastIndexOf('/');
  const colon = name.indexOf(':', lastSlash + 1);
  if (colon >= 0) name = name.slice(0, colon);
  const parts = name.split('/');
  // a first part with a dot or a port, or localhost, is a registry
  if (parts.length > 1 && (/[.:]/.test(parts[0]) || parts[0] === 'localhost')) parts.shift();
  if (parts.length === 1) parts.unshift('library');
  return parts.join('/');
}

const normal = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The widget for a container's image, or null: widget.yaml `images` first (a repository such as
 * plexinc/pms-docker, or its last part), then the image's name against the widget ids and aliases
 * (linuxserver/radarr → radarr). Only widgets with a `url` option, the ones a service card uses.
 */
export function matchWidget(image, widgets) {
  const repo = imageRepository(image);
  const last = repo.split('/').pop();
  const candidates = widgets.filter((w) => w.options?.url);
  for (const w of candidates) {
    for (const i of w.images ?? []) {
      const want = String(i).toLowerCase();
      if (want === repo || (!want.includes('/') && want === last)) return w.id;
    }
  }
  for (const w of candidates) {
    if ([w.id, ...(w.aliases ?? [])].some((n) => normal(n) === normal(last))) return w.id;
  }
  return null;
}

// a first guess of a group for the cards the wizard adds; the user can change it
const GROUPS = {
  Media: ['plex', 'jellyfin', 'emby', 'tautulli', 'jellystat', 'navidrome', 'audiobookshelf', 'kavita', 'komga', 'immich', 'photoprism', 'seerr', 'overseerr', 'jellyseerr', 'ombi', 'stash', 'tracearr', 'tubearchivist', 'romm', 'calibreweb', 'booklore', 'channelsdvrserver', 'dispatcharr', 'xteve', 'hdhomerun'],
  Downloads: ['radarr', 'sonarr', 'lidarr', 'readarr', 'prowlarr', 'bazarr', 'mylar', 'medusa', 'sportarr', 'jackett', 'autobrr', 'sabnzbd', 'nzbget', 'qbittorrent', 'qui', 'transmission', 'deluge', 'flood', 'rutorrent', 'pyload', 'jdownloader', 'slskd', 'unmanic', 'tdarr', 'fileflows'],
  Network: ['pihole', 'adguard', 'technitium', 'unifi', 'omada', 'traefik', 'npm', 'caddy', 'swagdashboard', 'cloudflared', 'gluetun', 'wgeasy', 'netbird', 'headscale', 'tailscale', 'opnsense', 'pfsense', 'openwrt', 'mikrotik', 'nextdns', 'crowdsec', 'pangolin'],
  Home: ['homeassistant', 'homebridge', 'esphome', 'frigate', 'evcc', 'opendtu', 'shelly', 'moonraker', 'octoprint', 'spoolman', 'mealie', 'tandoor', 'grocy', 'homebox', 'paperlessngx', 'vikunja', 'karakeep', 'linkwarden', 'freshrss', 'miniflux'],
  Infrastructure: ['portainer', 'dockhand', 'komodo', 'arcane', 'proxmox', 'proxmoxbackupserver', 'unraid', 'truenas', 'openmediavault', 'diskstation', 'qnap', 'scrutiny', 'glances', 'netdata', 'beszel', 'uptimekuma', 'gatus', 'healthchecks', 'whatsupdocker', 'watchtower', 'grafana', 'prometheus', 'backrest', 'kopia', 'duplicati', 'urbackup'],
};
export function groupFor(widget) {
  for (const [group, ids] of Object.entries(GROUPS)) if (ids.includes(widget)) return group;
  return 'Services';
}

/**
 * The running containers as the wizard shows them: each with its image, ports, the widget that
 * fits, and URLs (the container's name when it shares a network with the dashboard, else the
 * host the page was opened by and the published port). Labelled containers are discovered
 * already and say so.
 */
export async function scanContainers({ servers, widgets, host, get, selfId = os.hostname() }) {
  const out = [];
  const problems = [];
  for (const server of servers.filter((s) => !s.swarm)) {
    let containers;
    try {
      containers = await get(server, '/containers/json');
    } catch (err) {
      problems.push(`${server.name}: ${err.message}`);
      continue;
    }
    // network drivers: a macvlan or ipvlan address (Unraid's br0) is one the browser can reach
    let drivers = new Map();
    try {
      drivers = new Map((await get(server, '/networks')).map((n) => [n.Name, n.Driver]));
    } catch {
      // an older API or a proxy without NETWORKS=1: no links to own addresses
    }
    // the dashboard's own networks, when it runs in a container of this server
    let mine = new Set();
    try {
      mine = new Set(Object.keys((await get(server, `/containers/${encodeURIComponent(selfId)}/json`)).NetworkSettings?.Networks ?? {}));
    } catch {
      // not a container of this server
    }
    for (const c of containers) {
      const name = String(c.Names?.[0] ?? '').replace(/^\//, '');
      if (!name || c.Id?.startsWith(selfId)) continue;
      const labels = c.Labels ?? {};
      const ports = (c.Ports ?? []).filter((p) => p.Type !== 'udp');
      const priv = ports.find((p) => p.PrivatePort)?.PrivatePort ?? null;
      const pub = ports.find((p) => p.PublicPort)?.PublicPort ?? null;
      const networks = c.NetworkSettings?.Networks ?? {};
      const shared = Object.keys(networks).some((n) => mine.has(n));
      // an address of its own: the dashboard may reach it (url); the browser only on macvlan or ipvlan (href)
      const ownIp = Object.entries(networks).find(([n, v]) => v?.IPAddress && n !== 'host')?.[1].IPAddress ?? null;
      const lanIp = Object.entries(networks).find(([n, v]) => v?.IPAddress && ['macvlan', 'ipvlan'].includes(drivers.get(n)))?.[1].IPAddress ?? null;
      const widget = matchWidget(c.Image, widgets);
      const remote = server.url ? new URL(server.url).hostname : host;
      out.push({
        server: server.name,
        name,
        image: c.Image,
        widget,
        group: groupFor(widget),
        discovered: Boolean(labels['dashboard.name'] || labels['homepage.group']),
        url: shared && priv ? `http://${name}:${priv}` : pub ? `http://${remote}:${pub}` : ownIp && priv ? `http://${ownIp}:${priv}` : null,
        href: pub ? `http://${remote}:${pub}` : lanIp && priv ? `http://${lanIp}:${priv}` : null,
      });
    }
  }
  out.sort((a, b) => (a.widget ? 0 : 1) - (b.widget ? 0 : 1) || a.name.localeCompare(b.name));
  return { containers: out, problems };
}

/**
 * A Docker server the wizard was given: a socket path (/var/run/docker.sock) or the address of a
 * Docker API or socket proxy (http://docker-proxy:2375, tcp://10.0.0.5:2375, nas:2375).
 * { server } in the shape docker.yaml gives, or { error }.
 */
export function parseDockerAddress(address, name) {
  const a = String(address ?? '').trim();
  const id = String(name ?? '').trim();
  if (id && !/^[a-zA-Z0-9][\w-]{0,39}$/.test(id)) return { error: 'name: letters, digits, - and _' };
  if (a.startsWith('/')) {
    if (!/^\/[\w./-]+$/.test(a) || a.includes('..')) return { error: 'not a socket path' };
    return { server: { name: id || 'local', socket: a, discover: true } };
  }
  const m = /^(?:(https?|tcp):\/\/)?([a-zA-Z0-9.-]+|\[[0-9a-fA-F:]+\])(?::(\d{1,5}))?\/?$/.exec(a);
  if (!m || Number(m[3] ?? 2375) > 65535) return { error: 'expected /path/to/docker.sock or host:port' };
  const protocol = m[1] === 'https' ? 'https' : 'http';
  const host = m[2];
  const port = Number(m[3] ?? 2375);
  return { server: { name: id || host.replace(/[^\w-]/g, '-').slice(0, 40), url: `${protocol}://${host}:${port}`, discover: true, host, port, protocol } };
}

/**
 * Whether each Docker server answers: its version and number of containers, or the error, with
 * a hint for a socket the dashboard may not use.
 */
export async function checkDocker({ servers, get }) {
  return Promise.all(servers.map(async (s) => {
    const target = s.socket ?? s.url;
    try {
      const version = await get(s, '/version');
      const containers = await get(s, '/containers/json');
      return { name: s.name, target, ok: true, version: version?.Version ?? null, containers: Array.isArray(containers) ? containers.length : 0 };
    } catch (err) {
      return { name: s.name, target, ok: false, error: err.message, permission: /EACCES|EPERM/.test(String(err.code ?? err.message)) };
    }
  }));
}

/** docker.yaml for the servers the wizard was given (and the mounted socket, which listing others would turn off). */
export function dockerYaml(servers) {
  const map = {};
  for (const s of servers) map[s.name] = s.socket ? { socket: s.socket } : { host: s.host, port: s.port, ...(s.protocol === 'https' ? { protocol: 'https' } : {}) };
  return [
    '# Docker servers, written by the setup wizard: for "container:" status and the discovery of containers',
    '# with dashboard.* labels. See https://getdashboard.dev/configuration/docker.html',
    YAML.stringify(map, { lineWidth: 0 }).trimEnd(),
    '',
  ].join('\n');
}

/** The widgets a service card can use, for the wizard's form: their options, without secrets' values. */
export function widgetList(registry) {
  const seen = new Set();
  const out = [];
  for (const w of registry.values()) {
    if (seen.has(w.manifest.id) || !w.manifest.options?.url) continue;
    seen.add(w.manifest.id);
    out.push({
      id: w.manifest.id,
      name: w.manifest.name,
      description: w.manifest.description ?? '',
      aliases: w.manifest.aliases ?? [],
      images: Array.isArray(w.manifest.images) ? w.manifest.images : [],
      options: Object.fromEntries(Object.entries(w.manifest.options).map(([k, d]) => [k, {
        type: d.type, required: Boolean(d.required), secret: Boolean(d.secret),
        ...(d.default !== undefined ? { default: d.default } : {}),
        ...(Array.isArray(d.values) ? { values: d.values } : {}),
      }])),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

const yamlValue = (v) => YAML.stringify(v, { lineWidth: 0 }).trimEnd();

/** The security part of settings.yaml; also added below homepage's settings.yaml, which has none of it. */
export function securityYaml({ allowedHosts = [], adminPassword = null, login = false }) {
  return [
    '# Security. See https://getdashboard.dev/configuration/#admin-password',
    `allowedHosts: [${allowedHosts.map(yamlValue).join(', ')}]   # the names you open the dashboard by (IP addresses always work)`,
    ...(adminPassword ? [`adminPassword: ${yamlValue(adminPassword)}   # a scrypt hash: node src/hash-password.mjs makes a new one`] : []),
    `login: ${login ? 'true ' : 'false'}           # true: the page asks for the admin password; false: only presses that ask (user: root, confirm:)`,
    '',
  ].join('\n');
}

/**
 * settings.yaml for the wizard's basics and security: the allowed hosts, the admin password's
 * hash (never the password) and whether the page asks for it at the door.
 */
export function settingsYaml({ title, language, theme, color, allowedHosts = [], adminPassword = null, login = false }) {
  return [
    '# Dashboard settings. See https://getdashboard.dev/configuration/settings.html',
    `title: ${yamlValue(title)}`,
    `language: ${yamlValue(language)}          # ${LANGUAGES.join(', ')}`,
    `theme: ${yamlValue(theme)}           # auto, dark, light`,
    `color: ${yamlValue(color)}          # ${COLORS.join(', ')}`,
    'showTitle: true',
    'headerStyle: boxed    # boxed: header widgets in a box; clean: without',
    'target: _blank        # where service links open',
    '',
    securityYaml({ allowedHosts, adminPassword, login }),
    '# Widgets from outside the widgets collection. Pin a tag/commit (or #latest) or exact version.',
    'plugins: []',
    '',
  ].join('\n');
}

/**
 * services.yaml for the cards the wizard adds, by group in the order they come. A card is
 * { group, name, href?, icon?, description?, container?, server?, widget?: { type, ...options } }.
 */
export function servicesYaml(cards) {
  const groups = new Map();
  for (const c of cards) {
    const def = {};
    for (const k of ['href', 'icon', 'description', 'container', 'server']) if (c[k]) def[k] = c[k];
    if (c.widget?.type) def.widget = c.widget;
    if (!groups.has(c.group)) groups.set(c.group, []);
    groups.get(c.group).push({ [c.name]: def });
  }
  const header = [
    '# Groups of services, written by the setup wizard. See https://getdashboard.dev/configuration/services.html',
    '# Secrets (keys, passwords) are written here as you entered them. To keep them out of this file, put',
    '# "{{DASHBOARD_VAR_NAME}}" in their place and set DASHBOARD_VAR_NAME on the dashboard container.',
  ].join('\n');
  if (!groups.size) return `${header}\n[]\n`;
  return `${header}\n${YAML.stringify([...groups].map(([g, list]) => ({ [g]: list })), { lineWidth: 0 })}`;
}

export const WIDGETS_YAML = [
  '# Widgets in the header. See https://getdashboard.dev/configuration/header-widgets.html',
  '- datetime:',
  '    dateStyle: full',
  '    timeStyle: short',
  '- resources:',
  '    cpu: true',
  '    memory: true',
  '    disk: ["/"]',
  '- search:',
  '    provider: duckduckgo',
  '',
].join('\n');

export const BOOKMARKS_YAML = '# Bookmarks. See https://getdashboard.dev/configuration/bookmarks.html\n[]\n';

/** Whether a config folder is in onboarding mode, and its code; the code is made once per start. */
export class Onboarding {
  constructor({ configDir, log = console, now = Date.now }) {
    this.configDir = configDir;
    this.log = log;
    this.now = now;
    this.code = null;
    this.sessions = new Set();
    this.limiter = new FailureLimiter(now);
  }

  get marker() {
    return path.join(this.configDir, MARKER);
  }

  get active() {
    return fs.existsSync(this.marker);
  }

  /** At start: a code for this run, in the log with how to open the wizard. */
  announce(url) {
    if (!this.active) return;
    this.code = newCode();
    this.log.info(`first start: open ${url}/setup to set up the dashboard. From outside your local network it asks for this code: ${this.code}`);
  }

  /** May this request use the wizard? Local, or a session from the code. */
  allowed(req) {
    if (isLocal(req)) return true;
    const token = cookieValue(req, COOKIE);
    return Boolean(token && this.sessions.has(token));
  }

  /** Checks a code; { ok, headers } with a session cookie, or { ok: false, status, body }. */
  verify(req, given) {
    const address = String(req.socket?.remoteAddress ?? 'unknown');
    const retryAfter = this.limiter.waiting(address);
    if (retryAfter) return { ok: false, status: 429, body: { ok: false, retryAfter, error: 'too many wrong codes' } };
    const want = Buffer.from(String(this.code ?? ''));
    const got = Buffer.from(String(given ?? '').trim().toUpperCase());
    if (!this.code || want.length !== got.length || !crypto.timingSafeEqual(want, got)) {
      const wait = this.limiter.failed(address);
      this.log.warn(`wrong setup code from ${address}${wait ? `; next try in ${Math.round(wait / 1000)} s` : ''}`);
      return { ok: false, status: 401, body: { ok: false, wrongCode: true, error: 'wrong code' } };
    }
    this.limiter.succeeded(address);
    const token = crypto.randomBytes(32).toString('base64url');
    this.sessions.add(token);
    return { ok: true, headers: { 'set-cookie': `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict${secureRequest(req) ? '; Secure' : ''}` } };
  }

  /**
   * Writes the files (each to a temporary name, then renamed), refusing all of them when one
   * exists already, and removes the marker. { ok, written } or { ok: false, exists: [...] }.
   */
  finish(files) {
    const exists = Object.keys(files).filter((f) => fs.existsSync(path.join(this.configDir, f)));
    if (exists.length) return { ok: false, exists };
    for (const [name, text] of Object.entries(files)) {
      const target = path.join(this.configDir, name);
      const tmp = `${target}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, text);
      fs.renameSync(tmp, target);
    }
    fs.rmSync(this.marker, { force: true });
    this.sessions.clear();
    this.log.info(`setup done: wrote ${Object.keys(files).join(', ')}`);
    return { ok: true, written: Object.keys(files) };
  }
}

