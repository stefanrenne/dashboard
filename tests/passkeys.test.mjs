import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { Passkeys, PASSKEYS_FILE, rpContext, TOKEN_MS } from '../src/passkeys.js';
import { ActionGate, hashPassword } from '../src/actionauth.js';
import { createApp } from '../src/app.js';
import { tmpDir, silentLog } from './helpers.mjs';

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sha = (data) => crypto.createHash('sha256').update(data).digest();
const HTTPS = { host: 'dash.lan', 'x-forwarded-proto': 'https' };
const req = (headers = HTTPS) => ({ headers, socket: { remoteAddress: '192.168.1.20' } });

/** A software authenticator: what navigator.credentials.create/get hand over, base64url. */
function authenticator(kind = 'ec') {
  const { publicKey, privateKey } = kind === 'ed' ? crypto.generateKeyPairSync('ed25519') : crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const id = crypto.randomBytes(32);
  let count = 0;
  const authData = (rpId, flags, extra = Buffer.alloc(0)) => {
    const c = Buffer.alloc(4);
    c.writeUInt32BE(count);
    return Buffer.concat([sha(rpId), Buffer.from([flags]), c, extra]);
  };
  return {
    id: b64u(id),
    setCount(n) { count = n; },
    create(options, origin = 'https://dash.lan') {
      const length = Buffer.alloc(2);
      length.writeUInt16BE(id.length);
      const clientDataJSON = JSON.stringify({ type: 'webauthn.create', challenge: options.challenge, origin });
      return {
        id: b64u(id), clientDataJSON: b64u(clientDataJSON),
        authenticatorData: b64u(authData(options.rp.id, 0x45, Buffer.concat([Buffer.alloc(16), length, id, Buffer.from([0xa0])]))),
        publicKey: b64u(publicKey.export({ type: 'spki', format: 'der' })), alg: kind === 'ed' ? -8 : -7,
      };
    },
    get(options, { origin = 'https://dash.lan', flags = 0x05, rpId = options.rpId, step = 1 } = {}) {
      count += step;
      const clientDataJSON = Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge: options.challenge, origin }));
      const ad = authData(rpId, flags);
      const signature = crypto.sign(kind === 'ed' ? null : 'sha256', Buffer.concat([ad, sha(clientDataJSON)]), privateKey);
      return { id: b64u(id), clientDataJSON: b64u(clientDataJSON), authenticatorData: b64u(ad), signature: b64u(signature) };
    },
  };
}

test('rpContext: https by a host name only', () => {
  assert.deepEqual(rpContext(req()), { rpId: 'dash.lan', origin: 'https://dash.lan' });
  assert.deepEqual(rpContext(req({ host: 'Dash.LAN:8443', 'x-forwarded-proto': 'https' })), { rpId: 'dash.lan', origin: 'https://dash.lan:8443' });
  assert.deepEqual(rpContext(req({ host: 'dash.lan:443', 'x-forwarded-proto': 'https' })).origin, 'https://dash.lan');
  assert.equal(rpContext(req({ host: 'dash.lan' })), null, 'plain http');
  assert.equal(rpContext(req({ host: '192.168.1.5', 'x-forwarded-proto': 'https' })), null, 'an IP address has no rpId');
  assert.equal(rpContext(req({ host: '[::1]:3000', 'x-forwarded-proto': 'https' })), null);
});

test('Passkeys: register and sign in (P-256 and Ed25519); every wrong answer is refused; a token works once', () => {
  const dir = tmpDir('dash-passkeys-');
  let clock = 1_000_000_000;
  const store = new Passkeys({ configDir: dir, now: () => clock, log: silentLog });
  assert.equal(store.registerOptions(req({ host: 'dash.lan' })), null, 'no passkeys over http');
  assert.equal(store.loginOptions(req()), null, 'none yet');
  assert.equal(store.available(req()), false);

  const key = authenticator();
  const options = store.registerOptions(req(), 'Home');
  assert.equal(options.rp.id, 'dash.lan');
  assert.equal(options.authenticatorSelection.userVerification, 'required');
  assert.deepEqual(store.register(req(), { ...key.create(options, 'https://evil.example'), name: 'x' }).ok, false, 'another origin');
  assert.match(store.register(req(), { ...key.create(options), name: 'x' }).error, /no longer valid/, 'the challenge was used up by the refused try');
  const added = store.register(req(), { ...key.create(store.registerOptions(req())), name: 'MacBook' });
  assert.equal(added.ok, true, added.error);
  assert.deepEqual(store.forHost('dash.lan').map((p) => p.name), ['MacBook']);
  assert.deepEqual(store.forHost('other.lan'), []);
  assert.equal(fs.statSync(path.join(dir, PASSKEYS_FILE)).mode & 0o777, 0o600);
  assert.equal(store.available(req()), true);
  assert.equal(store.available(req({ host: 'other.lan', 'x-forwarded-proto': 'https' })), false, 'bound to the host it was made on');

  const ed = authenticator('ed');
  assert.equal(store.register(req(), { ...ed.create(store.registerOptions(req())), name: 'Phone' }).ok, true);

  const signIn = (k, opts = {}) => store.verify(req(), k.get(store.loginOptions(req()), opts));
  const ok = signIn(key);
  assert.equal(ok.ok, true, ok.error);
  assert.equal(store.consume(ok.token), true);
  assert.equal(store.consume(ok.token), false, 'once');
  assert.equal(signIn(ed).ok, true, 'Ed25519');
  assert.match(signIn(key, { origin: 'https://evil.example' }).error, /made for/);
  assert.match(signIn(key, { rpId: 'evil.example' }).error, /another host/);
  assert.match(signIn(key, { flags: 0x01 }).error, /did not verify you/, 'user verification is required');
  key.setCount(1); // what the dashboard saw last
  assert.match(signIn(key, { step: 0 }).error, /counter went back/, 'a cloned key');
  key.setCount(10);
  const options2 = store.loginOptions(req());
  const answer = key.get(options2);
  assert.equal(store.verify(req(), answer).ok, true);
  assert.equal(store.verify(req(), answer).ok, false, 'a replay: the challenge is used up');
  const forged = { ...key.get(store.loginOptions(req())), signature: b64u(crypto.randomBytes(70)) };
  assert.equal(store.verify(req(), forged).ok, false, 'a wrong signature');
  assert.equal(store.verify(req({ host: 'dash.lan' }), key.get(options2)).ok, false, 'not over http');

  // a token ages out
  const late = signIn(key);
  clock += TOKEN_MS + 1;
  assert.equal(store.consume(late.token), false);

  // through a restart; removed for good
  const again = new Passkeys({ configDir: dir, now: () => clock, log: silentLog });
  assert.equal(again.registerOptions(req()).user.id, store.registerOptions(req()).user.id, 'the same user handle');
  assert.equal(again.verify(req(), key.get(again.loginOptions(req()))).ok, true);
  assert.equal(again.remove(again.forHost('dash.lan')[0].id), true);
  assert.deepEqual(again.forHost('dash.lan').map((p) => p.name), ['Phone']);
  assert.ok(!fs.readFileSync(path.join(dir, PASSKEYS_FILE), 'utf8').includes('PRIVATE'));
});

test('ActionGate: a passkey token counts as the password, once', async () => {
  const store = { tokens: new Set(['good']), consume(t) { return this.tokens.delete(t); } };
  const gate = new ActionGate({ password: { value: 'Sesam-123', hashed: false }, passkeys: store, log: silentLog });
  const r = (headers) => ({ headers: { 'x-forwarded-for': '203.0.113.7', ...headers }, socket: { remoteAddress: '203.0.113.7' } });
  const ok = await gate.check(r({ 'x-dashboard-passkey': 'good' }), 'password');
  assert.equal(ok.ok, true);
  assert.match(ok.headers['set-cookie'], /^dash_unlock=/);
  assert.equal((await gate.check(r({ 'x-dashboard-passkey': 'good' }), 'always')).ok, false, 'used up');
  assert.equal((await gate.check(r({ 'x-dashboard-passkey': 'forged' }), 'password')).status, 401);
});

test('the routes: a passkey made in the settings logs in over https, and opens the settings', async () => {
  const configDir = tmpDir('hd-passkey-app-');
  fs.writeFileSync(path.join(configDir, 'settings.yaml'), `allowedHosts: [dash.lan]\nlogin: true\nadminPassword: "${hashPassword('Geheim-Admin-1', { N: 1024 })}"\n`);
  const app = await createApp({ configDir, env: {}, log: silentLog, defaultPlugins: [], dockerSocket: null, releasesUrl: null });
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const call = (method, p, body, headers = {}) => new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers: { ...HTTPS, 'x-forwarded-for': '203.0.113.7', 'x-requested-with': 'dashboard', ...(data ? { 'content-type': 'application/json' } : {}), ...headers } }, (res) => {
      let text = '';
      res.on('data', (c) => (text += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, json: text.startsWith('{') ? JSON.parse(text) : null }));
    });
    r.on('error', reject);
    r.end(data);
  });
  try {
    assert.deepEqual((await call('GET', '/api/passkey')).json, { available: false }, 'reachable before a login; none yet');
    assert.equal((await call('GET', '/api/passkey', undefined, { host: 'dash.lan', 'x-forwarded-proto': 'http' })).json.available, false);
    // log in with the password, add a passkey in the settings
    const login = await call('POST', '/api/login', { password: 'Geheim-Admin-1' });
    const session = login.headers['set-cookie'][0].split(';')[0];
    const settings = await call('GET', '/api/settings', undefined, { cookie: session });
    assert.deepEqual(settings.json.passkeys, { secure: true, host: 'dash.lan', list: [] });
    const key = authenticator();
    const options = await call('POST', '/api/settings/passkeys/options', {}, { cookie: session });
    const added = await call('POST', '/api/settings/passkeys', { ...key.create(options.json.publicKey), name: 'MacBook' }, { cookie: session });
    assert.equal(added.status, 200, added.json?.error);
    assert.deepEqual(added.json.passkeys.list.map((p) => p.name), ['MacBook']);
    // logged out: the passkey logs in
    assert.equal((await call('GET', '/api/passkey')).json.available, true);
    const challenge = await call('POST', '/api/passkey/options', {});
    const verified = await call('POST', '/api/passkey/verify', key.get(challenge.json.publicKey));
    assert.equal(verified.status, 200, verified.json?.error);
    const viaPasskey = await call('POST', '/api/login', { passkeyToken: verified.json.token });
    assert.equal(viaPasskey.status, 200);
    assert.match(viaPasskey.headers['set-cookie'][0], /^dash_session=/);
    assert.equal((await call('POST', '/api/login', { passkeyToken: verified.json.token })).status, 401, 'the token works once');
    // the settings take a passkey token where they take the password (the header)
    const session2 = viaPasskey.headers['set-cookie'][0].split(';')[0];
    const again = await call('POST', '/api/passkey/verify', key.get((await call('POST', '/api/passkey/options', {})).json.publicKey));
    const unlock = await call('POST', '/api/settings/unlock', {}, { cookie: session2, 'x-dashboard-passkey': again.json.token });
    assert.equal(unlock.status, 200);
    // a wrong answer is refused and counted
    const bad = await call('POST', '/api/passkey/verify', { ...key.get((await call('POST', '/api/passkey/options', {})).json.publicKey), signature: 'AAAA' });
    assert.equal(bad.status, 401);
    const removed = await call('POST', '/api/settings/passkeys/remove', { id: key.id }, { cookie: session2 });
    assert.deepEqual(removed.json.passkeys.list, []);
  } finally {
    app.close();
    await new Promise((r) => server.close(r));
  }
});
