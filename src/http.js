// HTTP for every route: the security headers, sending JSON and files, reading a JSON body, and
// what a request tells about its client (address, local network, https, cookies).

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { realInside } from './util.js';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/**
 * The security headers; `frames` are the origins the page may frame (the iframe widget's src).
 * Scripts come from the dashboard itself; the page's one inline script carries `nonce`, so an
 * injected inline script or event handler does not run.
 */
export function securityHeaders(frames = [], nonce = null) {
  return {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy':
      "default-src 'self'; img-src * data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      `font-src 'self' https://fonts.gstatic.com; script-src 'self'${nonce ? ` 'nonce-${nonce}'` : ''}; connect-src 'self'; ` +
      `frame-src ${frames.length ? frames.join(' ') : "'none'"}; frame-ancestors 'self'`,
  };
}

export const SECURITY_HEADERS = securityHeaders();

export const BODY_LIMIT = 1024 * 1024;

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
function forwardedChain(req) {
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

export function isInternal(req) {
  const address = String(req.socket?.remoteAddress ?? '');
  const loopback = address === '::1' || address.startsWith('127.') || address.startsWith('::ffff:127.');
  return loopback && req.headers['x-forwarded-for'] === undefined && req.headers.forwarded === undefined;
}

/** The value of one cookie of a request, or null. */
export function cookieValue(req, name) {
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === name) return part.slice(at + 1).trim();
  }
  return null;
}

export const secureRequest = (req) => Boolean(req.socket?.encrypted) || String(req.headers['x-forwarded-proto'] ?? '').split(',')[0].trim() === 'https';

/** The address the request came from, as the server sees it (a proxy is one address). */
export const clientAddress = (req) => String(req.socket?.remoteAddress ?? 'unknown');

/** A random token for a cookie or a challenge. */
export const randomToken = () => crypto.randomBytes(32).toString('base64url');

/** A Set-Cookie value: HttpOnly, Secure over https; `maxAge` in seconds (0 clears it, null: a session cookie). */
export function cookie(req, name, value, { path: where = '/', maxAge = null, sameSite = 'Strict' } = {}) {
  return `${name}=${value}; Path=${where}${maxAge === null ? '' : `; Max-Age=${Math.round(maxAge)}`}; HttpOnly; SameSite=${sameSite}${secureRequest(req) ? '; Secure' : ''}`;
}

/** Sends `body` (JSON unless `type` says otherwise); never cached. */
export function send(res, status, body, type = 'application/json', headers = SECURITY_HEADERS) {
  const data = type === 'application/json' ? JSON.stringify(body) : body;
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...headers });
  res.end(data);
}

/** Sends a file; with `root`, only when its real path (symlinks resolved) is inside root. */
export async function sendFile(res, file, { cache = 'no-cache', root = null } = {}) {
  if (root && !(await realInside(root, file))) return send(res, 404, { error: 'not found' });
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { error: 'not found' });
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': cache,
      ...SECURITY_HEADERS,
    });
    res.end(data);
  });
}

// ---------------------------------------------------------------- the Host header (allowedHosts)

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

