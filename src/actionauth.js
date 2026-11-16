// The admin password: in front of the actions (buttons, hidden-iframe webhooks, the widget sync)
// and, with settings.yaml `login`, the whole page (src/login.js). It is settings.yaml
// `adminPassword`, a scrypt hash (as the settings page, the setup wizard and src/hash-password.mjs make). A correct
// password unlocks that browser for a while (a random token in an HttpOnly cookie, kept in
// memory); wrong tries are slowed down (FailureLimiter).

import crypto from 'node:crypto';
import { SCRYPT_HASH } from './config/schema.js';
import { cookie, cookieValue, randomToken, clientAddress, limitKey, isInternal } from './http.js';

export const COOKIE = 'dash_unlock';
const PASSWORD_HEADER = 'x-dashboard-password';
const PASSKEY_HEADER = 'x-dashboard-passkey'; // a one-time token from a passkey check (src/passkeys.js)
const DEFAULT_REMEMBER_MS = 15 * 60 * 1000;
const FREE_FAILURES = 5;
const FIRST_WAIT_MS = 30_000;
const MAX_WAIT_MS = 15 * 60 * 1000;
const FORGET_MS = 24 * 60 * 60 * 1000; // a day without a wrong try: the count starts over
const ALL_FAILURES = 30; // wrong tries from all addresses together per ALL_WINDOW_MS ...
const ALL_WINDOW_MS = 60 * 60 * 1000; // ... before every browser that is not known waits
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

/** A short fingerprint of a password (its stored form), so a new password ends the sessions of the old one. */
export function passwordFingerprint(password) {
  return password?.value ? crypto.createHash('sha256').update(`dash-session:${password.value}`).digest('hex').slice(0, 32) : '';
}



/**
 * Wrong tries, slowed down: the admin password (and passkeys), the setup code and the reset code
 * each have one. Counted per visitor: a known browser (src/known.js) by its cookie, any other by its
 * address (src/http.js visitorAddress; an IPv6 one by its /64). Five are free, then a wait of 30 s
 * that doubles with each wrong try, to 15 minutes; a day without one and the count starts over.
 * Every browser that is not known also waits once ALL_FAILURES wrong tries came in within the
 * hour from all addresses together: many addresses, or ones written into X-Forwarded-For, gain
 * nothing, and a known browser is not held up by them.
 */
export class FailureLimiter {
  constructor(now = Date.now, { known = null, log = console } = {}) {
    this.now = now;
    this.known = known;
    this.log = log;
    this.failures = new Map(); // key -> { count, until, last }
    this.all = []; // times of the wrong tries of browsers that are not known, within ALL_WINDOW_MS
  }

  #who(req) {
    const id = this.known?.id(req);
    const address = clientAddress(req);
    return id ? { key: `browser ${id}`, address, known: true } : { key: limitKey(address), address, known: false };
  }

  #allWait() {
    const now = this.now();
    while (this.all.length && this.all[0] <= now - ALL_WINDOW_MS) this.all.shift();
    return this.all.length >= ALL_FAILURES ? this.all[this.all.length - ALL_FAILURES] + ALL_WINDOW_MS - now : 0;
  }

  /** Seconds this visitor must still wait, or 0. */
  waiting(req) {
    const who = this.#who(req);
    const f = this.failures.get(who.key);
    const wait = Math.max(f && f.until > this.now() ? f.until - this.now() : 0, who.known ? 0 : this.#allWait());
    return wait > 0 ? Math.ceil(wait / 1000) : 0;
  }

  /** Counts a wrong try; the wait it starts in ms (0 for a free one). */
  failed(req) {
    const who = this.#who(req);
    const now = this.now();
    const before = this.failures.get(who.key);
    const count = (before && before.last > now - FORGET_MS ? before.count : 0) + 1;
    const wait = count >= FREE_FAILURES ? Math.min(MAX_WAIT_MS, FIRST_WAIT_MS * 2 ** (count - FREE_FAILURES)) : 0;
    if (this.failures.size > 10_000) for (const [k, f] of this.failures) if (f.last <= now - FORGET_MS || f.until <= now) this.failures.delete(k);
    this.failures.set(who.key, { count, until: now + wait, last: now });
    if (!who.known) {
      const was = this.#allWait();
      this.all.push(now);
      if (!was && this.#allWait()) this.log.warn(`${ALL_FAILURES} wrong tries within the hour from all addresses together: browsers that are not known wait until ${new Date(now + this.#allWait()).toISOString()}`);
    }
    return wait;
  }

  /** A right one: this visitor's count ends; the Set-Cookie header that makes the browser known, or null. */
  succeeded(req) {
    const who = this.#who(req);
    this.failures.delete(who.key);
    return this.known?.remember(req) ?? null;
  }

  /**
   * One guarded try: { ok: false, retryAfter } (seconds) while this visitor must wait; else
   * `check()` decides, and its outcome is counted: { ok: true, headers } (headers may make the
   * browser known), or { ok: false } with "<wrong> from <address>" logged (and the wait it starts).
   */
  async attempt(req, check, { log = this.log, wrong }) {
    const retryAfter = this.waiting(req);
    if (retryAfter) return { ok: false, retryAfter };
    if (await check()) return { ok: true, headers: setCookies(this.succeeded(req)) };
    const wait = this.failed(req);
    log.warn(`${wrong} from ${clientAddress(req)}${wait ? `; next try in ${Math.round(wait / 1000)} s` : ''}`);
    return { ok: false };
  }
}

/** Headers that set these cookies (nulls left out): {} for none. */
export function setCookies(...list) {
  const all = list.flat().filter(Boolean);
  return all.length ? { 'set-cookie': all.length === 1 ? all[0] : all } : {};
}

export class ActionGate {
  constructor({ password = null, rememberMs = DEFAULT_REMEMBER_MS, now = Date.now, log = console, passkeys = null, known = null } = {}) {
    this.password = password;
    this.passkeys = passkeys; // src/passkeys.js: its one-time tokens count as the password
    this.rememberMs = rememberMs;
    this.now = now;
    this.log = log;
    this.unlocks = new Map(); // token -> expiry
    this.limiter = new FailureLimiter(() => this.now(), { known, log });
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
    const retryAfter = this.limiter.waiting(req);
    if (retryAfter) return { ok: false, status: 429, body: { ok: false, needsPassword: true, retryAfter, error: 'too many wrong passwords' } };
    const passkeyToken = req.headers[PASSKEY_HEADER];
    if (passkeyToken !== undefined) {
      if (!this.passkeys?.consume(String(passkeyToken))) return { ok: false, status: 401, body: { ok: false, needsPassword: true, always: requirement === 'always', error: 'the passkey check expired; try again' } };
      const cookie = requirement === 'password' ? this.#unlockCookie(req, base) : null;
      return { ok: true, headers: setCookies(cookie) };
    }
    const given = req.headers[PASSWORD_HEADER];
    if (given === undefined) return { ok: false, status: 401, body: { ok: false, needsPassword: true, always: requirement === 'always', error: 'password needed' } };
    if (!(await checkPassword(this.password, String(given)))) {
      const wait = this.limiter.failed(req);
      this.log.warn(`wrong admin password from ${clientAddress(req)} for ${what}${wait ? `; next try in ${Math.round(wait / 1000)} s` : ''}`);
      return { ok: false, status: 401, body: { ok: false, needsPassword: true, wrongPassword: true, always: requirement === 'always', error: 'wrong password' } };
    }
    const known = this.limiter.succeeded(req);
    const cookie = requirement === 'password' ? this.#unlockCookie(req, base) : null;
    return { ok: true, headers: setCookies(cookie, known) };
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
