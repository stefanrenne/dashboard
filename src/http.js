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
