// "Forgot the admin password": a one-time code in the log sets a new one. Whoever reads the
// container's log has the host already, as for the setup code (src/onboarding/wizard.js). The code
// is made only when asked for (a log is often shipped elsewhere: a standing code there would be a
// second password), lasts RESET_MS, is used once, and goes after MAX_WRONG wrong tries; wrong tries
// are slowed down per address, as passwords are.

import crypto from 'node:crypto';
import { newCode } from './onboarding/wizard.js';
import { FailureLimiter } from './actionauth.js';
import { clientAddress } from './http.js';

export const RESET_MS = 15 * 60 * 1000;
const MAX_WRONG = 10;

export class PasswordReset {
  constructor({ log = console, now = Date.now, known = null } = {}) {
    this.log = log;
    this.now = now;
    this.code = null;
    this.until = 0;
    this.wrong = 0;
    this.limiter = new FailureLimiter(now, { known, log });
  }

  get pending() {
    return Boolean(this.code) && this.until > this.now();
  }

  /** Asked for from the page: a code in the log, unless one is valid still (no new line then). { until } */
  request(req) {
    if (!this.pending) {
      this.code = newCode();
      this.until = this.now() + RESET_MS;
      this.wrong = 0;
      this.log.warn(`admin password reset asked for from ${clientAddress(req)}: this code sets a new admin password until ${new Date(this.until).toISOString()}: ${this.code}`);
    }
    return { until: this.until };
  }

  /** Checks a code and uses it up: { ok: true, headers } (they may make the browser known), or { ok: false, status, body }. */
  async consume(req, given) {
    const want = Buffer.from(String(this.code ?? ''));
    const got = Buffer.from(String(given ?? '').trim().toUpperCase());
    const tried = await this.limiter.attempt(req, () => this.pending && want.length === got.length && crypto.timingSafeEqual(want, got), { log: this.log, wrong: 'wrong admin password reset code' });
    if (tried.retryAfter) return { ok: false, status: 429, body: { ok: false, retryAfter: tried.retryAfter, error: 'too many wrong codes' } };
    if (!tried.ok) {
      if (this.pending && ++this.wrong >= MAX_WRONG) {
        this.code = null;
        this.log.warn('admin password reset: too many wrong codes, this one no longer counts');
      }
      return { ok: false, status: 401, body: { ok: false, wrongCode: true, error: 'wrong or expired code' } };
    }
    this.code = null;
    return { ok: true, headers: tried.headers };
  }
}
