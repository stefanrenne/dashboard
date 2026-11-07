// The admin password: in front of the actions (buttons, hidden-iframe webhooks, the widget sync)
// and, with settings.yaml `login`, the whole page (src/login.js). It is settings.yaml
// `adminPassword`, a scrypt hash (as the settings page, the setup wizard and src/hash-password.mjs make). A correct
// password unlocks that browser for a while (a random token in an HttpOnly cookie, kept in
// memory); failures per address are slowed down.

import crypto from 'node:crypto';
import { SCRYPT_HASH } from './config/schema.js';
import { cookie, cookieValue, randomToken, clientAddress, isInternal } from './http.js';

export const COOKIE = 'dash_unlock';
export const PASSWORD_HEADER = 'x-dashboard-password';
export const PASSKEY_HEADER = 'x-dashboard-passkey'; // a one-time token from a passkey check (src/passkeys.js)
export const DEFAULT_REMEMBER_MS = 15 * 60 * 1000;
export const FREE_FAILURES = 5; // then a wait, doubled each time
export const FIRST_WAIT_MS = 30_000;
export const MAX_WAIT_MS = 15 * 60 * 1000;
const SCRYPT = SCRYPT_HASH;

/** scrypt:N:r:p:salt:hash (no $, which Docker Compose would read as a variable) for a password (base64 salt and hash), as src/hash-password.mjs prints. */
export function hashPassword(password, { N = 16384, r = 8, p = 1 } = {}) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return `scrypt:${N}:${r}:${p}:${salt.toString('base64')}:${hash.toString('base64')}`;
}

const digest = (text) => crypto.createHash('sha256').update(String(text)).digest();

/** True when `given` is the password; constant time for either form. */
export async function checkPassword(password, given) {
  // a password that could not be read (broken) never matches: what it guards stays locked
  if (!password?.value || password.broken || typeof given !== 'string' || !given) return false;
  if (!password.hashed) return crypto.timingSafeEqual(digest(password.value), digest(given));
  const [, N, r, p, salt, hash] = SCRYPT.exec(password.value);
  const expected = Buffer.from(hash, 'base64');
  const got = await new Promise((resolve, reject) => {
    crypto.scrypt(given, Buffer.from(salt, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)));
  });
  return crypto.timingSafeEqual(got, expected);
}

/** A loopback connection that no proxy passed on: a script inside the container (curl 127.0.0.1). */
/** A short fingerprint of a password (its stored form), so a new password ends the sessions of the old one. */
export function passwordFingerprint(password) {
  return password?.value ? crypto.createHash('sha256').update(`dash-session:${password.value}`).digest('hex').slice(0, 32) : '';
}



/**
 * Wrong tries per address: FREE_FAILURES free, then a wait of FIRST_WAIT_MS that doubles up to
 * MAX_WAIT_MS. Shared by the admin password and the onboarding code.
 */
export class FailureLimiter {
  constructor(now = Date.now) {
    this.now = now;
    this.failures = new Map(); // address -> { count, until }
  }

  /** Seconds this address must still wait, or 0. */
  waiting(address) {
    const f = this.failures.get(address);
    return f && f.until > this.now() ? Math.ceil((f.until - this.now()) / 1000) : 0;
  }

  /** Counts a wrong try; the wait it starts in ms (0 for a free one). */
  failed(address) {
    const count = (this.failures.get(address)?.count ?? 0) + 1;
    const wait = count >= FREE_FAILURES ? Math.min(MAX_WAIT_MS, FIRST_WAIT_MS * 2 ** (count - FREE_FAILURES)) : 0;
    if (this.failures.size > 1000) for (const [a, f] of this.failures) if (f.until <= this.now()) this.failures.delete(a);
    this.failures.set(address, { count, until: this.now() + wait });
    return wait;
  }

  succeeded(address) {
    this.failures.delete(address);
  }

  /**
   * One guarded try from the request's address: { ok: false, retryAfter } (seconds) while it must
   * wait; else `check()` decides, and its outcome is counted: { ok: true }, or { ok: false } with
   * "<wrong> from <address>" logged (and the wait it starts).
   */
  async attempt(req, check, { log, wrong }) {
    const address = clientAddress(req);
    const retryAfter = this.waiting(address);
    if (retryAfter) return { ok: false, retryAfter };
    if (await check()) {
      this.succeeded(address);
      return { ok: true };
    }
    const wait = this.failed(address);
    log.warn(`${wrong} from ${address}${wait ? `; next try in ${Math.round(wait / 1000)} s` : ''}`);
    return { ok: false };
  }
}


export class ActionGate {
  constructor({ password = null, rememberMs = DEFAULT_REMEMBER_MS, now = Date.now, log = console, passkeys = null } = {}) {
    this.password = password;
    this.passkeys = passkeys; // src/passkeys.js: its one-time tokens count as the password
    this.rememberMs = rememberMs;
    this.now = now;
    this.log = log;
    this.unlocks = new Map(); // token -> expiry
    this.limiter = new FailureLimiter(() => this.now());
  }

  get protected() {
    return Boolean(this.password);
  }

  #unlocked(req) {
    const token = cookieValue(req, COOKIE);
    const until = token ? this.unlocks.get(token) : undefined;
    if (until === undefined) return false;
    if (until > this.now()) return true;
    this.unlocks.delete(token);
    return false;
  }

  /** A Set-Cookie header that unlocks this browser, or null when nothing is remembered. */
  #unlockCookie(req, base) {
    if (!(this.rememberMs > 0)) return null;
    const now = this.now();
    for (const [t, until] of this.unlocks) if (until <= now) this.unlocks.delete(t);
    const token = randomToken();
    this.unlocks.set(token, now + this.rememberMs);
    return cookie(req, COOKIE, token, { path: base, maxAge: this.rememberMs / 1000 });
  }

  /**
   * May this request run something that asks `requirement` (null, 'password' or 'always')?
   * { ok: true, headers } (headers may set the unlock cookie) or { ok: false, status, body }.
   */
  async check(req, requirement, { what = 'an action', base = '/', loggedIn = false } = {}) {
    if (!this.password || !requirement || isInternal(req)) return { ok: true, headers: {} };
    // a login with the admin password counts as unlocked; `always` asks every time anyway
    if (requirement === 'password' && (loggedIn || this.#unlocked(req))) return { ok: true, headers: {} };
    const address = clientAddress(req);
    const retryAfter = this.limiter.waiting(address);
    if (retryAfter) return { ok: false, status: 429, body: { ok: false, needsPassword: true, retryAfter, error: 'too many wrong passwords' } };
    const passkeyToken = req.headers[PASSKEY_HEADER];
    if (passkeyToken !== undefined) {
      // a token from a passkey check that succeeded just before; single use
      if (!this.passkeys?.consume(String(passkeyToken))) return { ok: false, status: 401, body: { ok: false, needsPassword: true, always: requirement === 'always', error: 'the passkey check expired; try again' } };
      const cookie = requirement === 'password' ? this.#unlockCookie(req, base) : null;
      return { ok: true, headers: cookie ? { 'set-cookie': cookie } : {} };
    }
    const given = req.headers[PASSWORD_HEADER];
    if (given === undefined) return { ok: false, status: 401, body: { ok: false, needsPassword: true, always: requirement === 'always', error: 'password needed' } };
    if (!(await checkPassword(this.password, String(given)))) {
      const wait = this.limiter.failed(address);
      this.log.warn(`wrong admin password from ${address} for ${what}${wait ? `; next try in ${Math.round(wait / 1000)} s` : ''}`);
      return { ok: false, status: 401, body: { ok: false, needsPassword: true, wrongPassword: true, always: requirement === 'always', error: 'wrong password' } };
    }
    this.limiter.succeeded(address);
    const cookie = requirement === 'password' ? this.#unlockCookie(req, base) : null;
    return { ok: true, headers: cookie ? { 'set-cookie': cookie } : {} };
  }

  /** Forgets this browser's unlock; the Set-Cookie header that clears it. */
  lock(req, base = '/') {
    const token = cookieValue(req, COOKIE);
    if (token) this.unlocks.delete(token);
    return { 'set-cookie': cookie(req, COOKIE, '', { path: base, maxAge: 0 }) };
  }

  /** Whether this browser is unlocked now (for the page's lock icon). */
  unlocked(req) {
    return Boolean(this.password) && this.#unlocked(req);
  }
}
