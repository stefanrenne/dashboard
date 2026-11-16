// Known browsers: one that once gave the admin password (or a reset code) gets a cookie that
// marks it for a year. Wrong tries from it are counted by that cookie, not by its address, and the
// limit for all addresses together (src/actionauth.js) does not hold it up: whoever guesses
// passwords cannot lock the owner out. The cookie opens nothing; the config folder's
// `.known-browsers.json` keeps only hashes of the cookies, so they last through a restart.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cookie, cookieValue, randomToken } from './http.js';
import { writeAtomic } from './util.js';

export const KNOWN_COOKIE = 'dash_known';
export const KNOWN_FILE = '.known-browsers.json';
const KNOWN_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_KNOWN = 100;

const tokenHash = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

export class KnownBrowsers {
  /** `configDir` null: kept in memory only. */
  constructor({ configDir = null, now = Date.now, log = console } = {}) {
    this.file = configDir ? path.join(configDir, KNOWN_FILE) : null;
    this.now = now;
    this.log = log;
    this.browsers = this.#read(); // token hash -> { expires }
  }

  #read() {
    if (!this.file) return new Map();
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return new Map(Object.entries(data.browsers ?? {}).filter(([, b]) => Number.isFinite(b?.expires)));
    } catch {
      return new Map();
    }
  }

  #save() {
    if (!this.file) return;
    try {
      writeAtomic(this.file, JSON.stringify({ browsers: Object.fromEntries(this.browsers) }), { mode: 0o600 });
    } catch (err) {
      this.log.warn(`known browsers: cannot write ${this.file} (${err.code ?? err.message}); they are known until a restart`);
    }
  }

  /** This browser's id (a hash of its cookie), or null when it is not known. */
  id(req) {
    const token = cookieValue(req, KNOWN_COOKIE);
    if (!token) return null;
    const hash = tokenHash(token);
    return this.browsers.get(hash)?.expires > this.now() ? hash : null;
  }

  /** After a right password: the Set-Cookie header that makes this browser known, or null when it is already. */
  remember(req) {
    if (this.id(req)) return null;
    const token = randomToken();
    const now = this.now();
    for (const [k, b] of this.browsers) if (b.expires <= now) this.browsers.delete(k);
    this.browsers.set(tokenHash(token), { expires: now + KNOWN_MS });
    if (this.browsers.size > MAX_KNOWN) {
      const oldest = [...this.browsers].sort((a, b) => a[1].expires - b[1].expires).slice(0, this.browsers.size - MAX_KNOWN);
      for (const [k] of oldest) this.browsers.delete(k);
    }
    this.#save();
    return cookie(req, KNOWN_COOKIE, token, { maxAge: KNOWN_MS / 1000 });
  }
}
