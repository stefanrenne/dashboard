// The login page of settings.yaml `login`: the admin password opens the dashboard for a while
// (`remember`, 7 days by default). Each visit moves the end of the session on. Sessions live on
// the server, in the config folder's `.sessions.json` (only hashes of the tokens), so they last
// through a restart, a logout ends one for good, and a new admin password ends them all.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cookie, cookieValue, randomToken } from './http.js';
import { writeAtomic } from './util.js';

export const SESSION_COOKIE = 'dash_session';
export const SESSIONS_FILE = '.sessions.json';
// a visit moves the session's end on; the file and the cookie are written at most this often
const TOUCH_EVERY_MS = 60 * 60 * 1000;
const MAX_SESSIONS = 200;

const tokenHash = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

export class SessionStore {
  constructor({ configDir, now = Date.now, log = console }) {
    this.file = path.join(configDir, SESSIONS_FILE);
    this.now = now;
    this.log = log;
    this.sessions = this.#read(); // token hash -> { expires, touched, password }
  }

  #read() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return new Map(Object.entries(data.sessions ?? {}).filter(([, s]) => Number.isFinite(s?.expires)));
    } catch {
      return new Map();
    }
  }

  #save() {
    const now = this.now();
    for (const [k, s] of this.sessions) if (s.expires <= now) this.sessions.delete(k);
    try {
      writeAtomic(this.file, JSON.stringify({ sessions: Object.fromEntries(this.sessions) }), { mode: 0o600 });
    } catch (err) {
      this.log.warn(`login sessions: cannot write ${this.file} (${err.code ?? err.message}); they last until a restart`);
    }
  }

  /** A new session for `password` (its fingerprint); the Set-Cookie header. */
  create(req, password, rememberMs) {
    const token = randomToken();
    const now = this.now();
    this.sessions.set(tokenHash(token), { expires: now + rememberMs, touched: now, password });
    // the oldest go when there are many (each login from another browser makes one)
    if (this.sessions.size > MAX_SESSIONS) {
      const oldest = [...this.sessions].sort((a, b) => a[1].touched - b[1].touched).slice(0, this.sessions.size - MAX_SESSIONS);
      for (const [k] of oldest) this.sessions.delete(k);
    }
    this.#save();
    return sessionCookie(req, token, rememberMs);
  }

  /**
   * Whether the request has a valid session for `password`; checked here on the server, never
   * from the cookie alone. A visit moves its end on (`rememberMs` from now): then `headers`
   * renews the cookie. { ok, headers }.
   */
  check(req, password, rememberMs) {
    const token = cookieValue(req, SESSION_COOKIE);
    const key = token ? tokenHash(token) : null;
    const s = key ? this.sessions.get(key) : null;
    const now = this.now();
    if (!s || s.expires <= now || s.password !== password) {
      if (s) {
        this.sessions.delete(key);
        this.#save();
      }
      return { ok: false, headers: {} };
    }
    if (now - s.touched < TOUCH_EVERY_MS) return { ok: true, headers: {} };
    s.expires = now + rememberMs;
    s.touched = now;
    this.#save();
    return { ok: true, headers: { 'set-cookie': sessionCookie(req, token, rememberMs) } };
  }

  /** Ends the request's session; the Set-Cookie header that clears it. */
  end(req) {
    const token = cookieValue(req, SESSION_COOKIE);
    if (token && this.sessions.delete(tokenHash(token))) this.#save();
    return sessionCookie(req, '', 0);
  }
}

// Lax, not Strict: a link to the dashboard from elsewhere (a bookmark bar, another page) opens it
// logged in; the POST endpoints keep needing X-Requested-With, which no other site can send.
const sessionCookie = (req, token, rememberMs) => cookie(req, SESSION_COOKIE, token, { maxAge: rememberMs / 1000, sameSite: 'Lax' });

// what a visitor who is not logged in may still reach: the login page, its script and API, and
// the passkey check of the login page, and what tools ask without a browser (the image's health check, robots.txt)
export const OPEN_PATHS = new Set(['/login', '/login.js', '/common.js', '/theme.css', '/api/login', '/api/health', '/robots.txt', '/api/passkey', '/api/passkey/options', '/api/passkey/verify']);
