// Passkeys next to the admin password (WebAuthn), over HTTPS only: a passkey belongs to the host
// name it was made on (its rpId), and browsers offer WebAuthn in a secure context only. Kept in the
// config folder's `.passkeys.json` (public keys only). No CBOR: the browser hands over the public
// key as SPKI (`getPublicKey()`), which node:crypto reads as it is.
//
// A passkey check that succeeds gives a one-time token; the login (`POST /api/login`) and
// everything behind the admin password (ActionGate, header x-dashboard-passkey) take that token
// where they take the password.

import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { secureRequest } from './http.js';

export const PASSKEYS_FILE = '.passkeys.json';
export { PASSKEY_HEADER } from './actionauth.js';
export const CHALLENGE_MS = 5 * 60 * 1000;
export const TOKEN_MS = 2 * 60 * 1000;
// ES256, Ed25519, RS256: what node:crypto verifies with a SPKI key
export const ALGORITHMS = { '-7': 'sha256', '-8': null, '-257': 'sha256' };
const MAX_PASSKEYS = 50;
const MAX_PENDING = 1000;
const FLAG_UP = 0x01;
const FLAG_UV = 0x04;

export const b64u = (buf) => Buffer.from(buf).toString('base64url');
const unb64u = (text) => (typeof text === 'string' && /^[A-Za-z0-9_-]*$/.test(text) ? Buffer.from(text, 'base64url') : null);
const sha256 = (data) => crypto.createHash('sha256').update(data).digest();

/** The host name a request came in by, without the port (Host is checked against allowedHosts before). */
function hostOf(req) {
  const host = String(req.headers.host ?? '').trim().toLowerCase();
  if (host.startsWith('[')) return host.slice(1, host.indexOf(']'));
  return host.replace(/:\d+$/, '');
}

/**
 * The WebAuthn relying party of a request: { rpId, origin }, or null when passkeys cannot work
 * there: plain http (they need a secure context) or an IP address (no valid rpId).
 */
export function rpContext(req) {
  if (!secureRequest(req)) return null;
  const rpId = hostOf(req);
  if (!rpId || net.isIP(rpId)) return null;
  return { rpId, origin: `https://${String(req.headers.host).trim().toLowerCase().replace(/:443$/, '')}` };
}

export class Passkeys {
  constructor({ configDir, now = Date.now, log = console }) {
    this.file = path.join(configDir, PASSKEYS_FILE);
    this.now = now;
    this.log = log;
    this.challenges = new Map(); // challenge -> { purpose, rpId, expires }
    this.tokens = new Map(); // token -> expires
    const data = this.#read();
    this.userId = data.userId;
    this.list = data.passkeys;
  }

  #read() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      const passkeys = Array.isArray(data.passkeys) ? data.passkeys.filter((p) => p && typeof p.id === 'string' && typeof p.publicKey === 'string' && typeof p.rpId === 'string') : [];
      return { userId: typeof data.userId === 'string' ? data.userId : b64u(crypto.randomBytes(16)), passkeys };
    } catch {
      return { userId: b64u(crypto.randomBytes(16)), passkeys: [] };
    }
  }

  #save() {
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ userId: this.userId, passkeys: this.list }, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }

  #challenge(purpose, rpId) {
    const now = this.now();
    for (const [c, v] of this.challenges) if (v.expires <= now) this.challenges.delete(c);
    if (this.challenges.size >= MAX_PENDING) this.challenges.delete(this.challenges.keys().next().value);
    const challenge = b64u(crypto.randomBytes(32));
    this.challenges.set(challenge, { purpose, rpId, expires: now + CHALLENGE_MS });
    return challenge;
  }

  /** Takes a challenge (once): whether it was handed out for this purpose and rpId, and is still fresh. */
  #takeChallenge(challenge, purpose, rpId) {
    const c = typeof challenge === 'string' ? this.challenges.get(challenge) : undefined;
    if (!c) return false;
    this.challenges.delete(challenge);
    return c.purpose === purpose && c.rpId === rpId && c.expires > this.now();
  }

  /** The passkeys of a host name, without their keys (for the settings page). */
  forHost(rpId) {
    return this.list.filter((p) => p.rpId === rpId).map(({ id, name, created, lastUsed }) => ({ id, name, created, lastUsed: lastUsed ?? null }));
  }

  /** Whether a passkey can be used on this request: https and at least one passkey for its host. */
  available(req) {
    const rp = rpContext(req);
    return Boolean(rp && this.list.some((p) => p.rpId === rp.rpId));
  }

  /** The options for navigator.credentials.create (binary fields base64url), or null without https. */
  registerOptions(req, displayName = 'Dashboard') {
    const rp = rpContext(req);
    if (!rp) return null;
    return {
      challenge: this.#challenge('register', rp.rpId),
      rp: { id: rp.rpId, name: String(displayName || 'Dashboard').slice(0, 100) },
      user: { id: this.userId, name: 'admin', displayName: `${String(displayName || 'Dashboard').slice(0, 80)} (admin)` },
      pubKeyCredParams: Object.keys(ALGORITHMS).map((alg) => ({ type: 'public-key', alg: Number(alg) })),
      excludeCredentials: this.list.filter((p) => p.rpId === rp.rpId).map((p) => ({ type: 'public-key', id: p.id })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
      attestation: 'none',
      timeout: CHALLENGE_MS,
    };
  }

  /**
   * Registers what navigator.credentials.create gave: { id, clientDataJSON, authenticatorData,
   * publicKey, alg } (base64url) and a name. { ok: true, passkey } or { ok: false, error }.
   */
  register(req, body) {
    const rp = rpContext(req);
    if (!rp) return { ok: false, error: 'passkeys need https' };
    const id = typeof body?.id === 'string' && /^[A-Za-z0-9_-]{16,1400}$/.test(body.id) ? body.id : null;
    const clientData = unb64u(body?.clientDataJSON);
    const authData = unb64u(body?.authenticatorData);
    const spki = unb64u(body?.publicKey);
    const alg = String(body?.alg);
    if (!id || !clientData || !authData || !spki || !(alg in ALGORITHMS)) return { ok: false, error: 'not a passkey' };
    const problem = this.#checkClient(clientData, 'webauthn.create', 'register', rp) ?? checkAuthData(authData, rp.rpId);
    if (problem) return { ok: false, error: problem };
    // the credential in the authenticator data is the one the browser named
    if (authData.length >= 55) {
      const length = authData.readUInt16BE(53);
      if (b64u(authData.subarray(55, 55 + length)) !== id) return { ok: false, error: 'the credential does not match' };
    }
    try {
      const key = crypto.createPublicKey({ key: spki, format: 'der', type: 'spki' });
      if (alg === '-8' ? key.asymmetricKeyType !== 'ed25519' : alg === '-7' ? key.asymmetricKeyType !== 'ec' : key.asymmetricKeyType !== 'rsa') throw new Error('type');
    } catch {
      return { ok: false, error: 'the passkey has a key this dashboard cannot read' };
    }
    if (this.list.some((p) => p.id === id)) return { ok: false, error: 'this passkey is already there' };
    if (this.list.length >= MAX_PASSKEYS) return { ok: false, error: `at most ${MAX_PASSKEYS} passkeys` };
    const name = String(body?.name ?? '').trim().slice(0, 60) || 'Passkey';
    const passkey = { id, name, rpId: rp.rpId, publicKey: spki.toString('base64'), alg: Number(alg), signCount: authData.readUInt32BE(33), created: new Date(this.now()).toISOString(), lastUsed: null };
    this.list.push(passkey);
    this.#save();
    return { ok: true, passkey: { id, name, created: passkey.created, lastUsed: null } };
  }

  /** Removes a passkey; whether there was one. */
  remove(id) {
    const before = this.list.length;
    this.list = this.list.filter((p) => p.id !== id);
    if (this.list.length === before) return false;
    this.#save();
    return true;
  }

  /** The options for navigator.credentials.get, or null when no passkey can be used here. */
  loginOptions(req) {
    const rp = rpContext(req);
    if (!rp) return null;
    const mine = this.list.filter((p) => p.rpId === rp.rpId);
    if (!mine.length) return null;
    return { challenge: this.#challenge('login', rp.rpId), rpId: rp.rpId, allowCredentials: mine.map((p) => ({ type: 'public-key', id: p.id })), userVerification: 'required', timeout: CHALLENGE_MS };
  }

  /**
   * Checks what navigator.credentials.get gave: { id, clientDataJSON, authenticatorData,
   * signature } (base64url). { ok: true, token } (a one-time token) or { ok: false, error }.
   */
  verify(req, body) {
    const rp = rpContext(req);
    if (!rp) return { ok: false, error: 'passkeys need https' };
    const passkey = this.list.find((p) => p.id === body?.id && p.rpId === rp.rpId);
    const clientData = unb64u(body?.clientDataJSON);
    const authData = unb64u(body?.authenticatorData);
    const signature = unb64u(body?.signature);
    if (!passkey || !clientData || !authData || !signature) return { ok: false, error: 'unknown passkey' };
    const problem = this.#checkClient(clientData, 'webauthn.get', 'login', rp) ?? checkAuthData(authData, rp.rpId);
    if (problem) return { ok: false, error: problem };
    let valid = false;
    try {
      const key = crypto.createPublicKey({ key: Buffer.from(passkey.publicKey, 'base64'), format: 'der', type: 'spki' });
      valid = crypto.verify(ALGORITHMS[String(passkey.alg)], Buffer.concat([authData, sha256(clientData)]), key, signature);
    } catch {
      valid = false;
    }
    if (!valid) return { ok: false, error: 'wrong signature' };
    // a counter that does not go up (when the authenticator keeps one) means a cloned key
    const count = authData.readUInt32BE(33);
    if ((count || passkey.signCount) && count <= passkey.signCount) return { ok: false, error: 'the signature counter went back' };
    passkey.signCount = count;
    passkey.lastUsed = new Date(this.now()).toISOString();
    try {
      this.#save();
    } catch (err) {
      this.log.warn(`passkeys: cannot write ${this.file} (${err.code ?? err.message})`);
    }
    const now = this.now();
    for (const [t, until] of this.tokens) if (until <= now) this.tokens.delete(t);
    const token = b64u(crypto.randomBytes(32));
    this.tokens.set(token, now + TOKEN_MS);
    return { ok: true, token, name: passkey.name };
  }

  /** Takes a one-time token from verify(): whether it was valid. */
  consume(token) {
    if (typeof token !== 'string' || !this.tokens.has(token)) return false;
    const until = this.tokens.get(token);
    this.tokens.delete(token);
    return until > this.now();
  }

  /** A problem with clientDataJSON, or null. */
  #checkClient(raw, type, purpose, rp) {
    let data;
    try {
      data = JSON.parse(raw.toString('utf8'));
    } catch {
      return 'not a passkey';
    }
    // the challenge is used up by any answer, also one refused below
    const fresh = this.#takeChallenge(data?.challenge, purpose, rp.rpId);
    if (data?.type !== type) return 'not a passkey';
    if (data.origin !== rp.origin) return `made for ${String(data.origin).slice(0, 100)}, not ${rp.origin}`;
    if (!fresh) return 'the request is no longer valid; try again';
    return null;
  }
}

/** A problem with the authenticator data (rpId hash, user present and verified), or null. */
function checkAuthData(authData, rpId) {
  if (authData.length < 37) return 'not a passkey';
  if (!authData.subarray(0, 32).equals(sha256(rpId))) return 'made for another host';
  const flags = authData[32];
  if (!(flags & FLAG_UP) || !(flags & FLAG_UV)) return 'the passkey did not verify you (no PIN, fingerprint or face)';
  return null;
}
