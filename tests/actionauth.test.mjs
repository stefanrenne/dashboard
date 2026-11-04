import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ActionGate, COOKIE, checkPassword, cookieValue, hashPassword, isInternal, loadPassword } from '../src/actionauth.js';
import { tmpDir, silentLog } from './helpers.mjs';

/** A request as http gives it: headers and the socket's address. */
const req = (headers = {}, remoteAddress = '192.168.1.20') => ({ headers, socket: { remoteAddress } });

test('loadPassword: the variable, or the file it names (trimmed); a hash checked for its form; nothing set is null', () => {
  assert.equal(loadPassword({}), null);
  assert.equal(loadPassword({ DASHBOARD_ACTION_PASSWORD: '  ' }), null);
  assert.deepEqual(loadPassword({ DASHBOARD_ACTION_PASSWORD: 'geheim' }), { value: 'geheim', hashed: false });
  const file = path.join(tmpDir('dash-pw-'), 'password');
  fs.writeFileSync(file, 'uit-een-bestand\n');
  assert.deepEqual(loadPassword({ DASHBOARD_ACTION_PASSWORD: 'x', DASHBOARD_ACTION_PASSWORD_FILE: file }), { value: 'uit-een-bestand', hashed: false }, 'the file wins');
  assert.throws(() => loadPassword({ DASHBOARD_ACTION_PASSWORD_FILE: `${file}.missing` }), /DASHBOARD_ACTION_PASSWORD_FILE: no such file/);
  assert.throws(() => loadPassword({ DASHBOARD_ACTION_PASSWORD: 'scrypt:1:2' }), /not of the form/);
  assert.equal(loadPassword({ DASHBOARD_ACTION_PASSWORD: hashPassword('x') }).hashed, true);
});

test('checkPassword: plain text and a scrypt hash; no $ in the hash (Docker Compose reads it as a variable)', async () => {
  const plain = loadPassword({ DASHBOARD_ACTION_PASSWORD: 'geheim' });
  assert.equal(await checkPassword(plain, 'geheim'), true);
  assert.equal(await checkPassword(plain, 'Geheim'), false);
  assert.equal(await checkPassword(plain, ''), false);
  const hash = hashPassword('geheim', { N: 1024 });
  assert.match(hash, /^scrypt:1024:8:1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  assert.ok(!hash.includes('$'));
  const hashed = loadPassword({ DASHBOARD_ACTION_PASSWORD: hash });
  assert.equal(await checkPassword(hashed, 'geheim'), true);
  assert.equal(await checkPassword(hashed, 'geheim2'), false);
  assert.notEqual(hashPassword('geheim', { N: 1024 }), hash, 'a salt of its own each time');
});

test('isInternal: a loopback connection without a proxy header; cookieValue', () => {
  assert.equal(isInternal(req({}, '127.0.0.1')), true);
  assert.equal(isInternal(req({}, '::1')), true);
  assert.equal(isInternal(req({}, '::ffff:127.0.0.1')), true);
  assert.equal(isInternal(req({ 'x-forwarded-for': '203.0.113.9' }, '127.0.0.1')), false, 'a proxy on the same machine');
  assert.equal(isInternal(req({ forwarded: 'for=203.0.113.9' }, '127.0.0.1')), false);
  assert.equal(isInternal(req({}, '172.18.0.5')), false);
  assert.equal(cookieValue(req({ cookie: 'a=1; dash_unlock=tok; b=2' }), COOKIE), 'tok');
  assert.equal(cookieValue(req({ cookie: 'xdash_unlock=tok' }), COOKIE), null);
});

test('ActionGate: asks, unlocks for `remember` with an HttpOnly cookie, always asks for always, slows down guessing', async () => {
  let clock = 1_000_000;
  const warned = [];
  const gate = new ActionGate({ password: loadPassword({ DASHBOARD_ACTION_PASSWORD: 'geheim' }), rememberMs: 60_000, now: () => clock, log: { ...silentLog, warn: (m) => warned.push(m) } });
  assert.equal((await gate.check(req(), null)).ok, true, 'nothing asked');
  assert.equal((await gate.check(req({}, '127.0.0.1'), 'always')).ok, true, 'a script in the container');
  const none = await gate.check(req(), 'password');
  assert.deepEqual([none.status, none.body.needsPassword, none.body.always], [401, true, false]);
  const ok = await gate.check(req({ 'x-dashboard-password': 'geheim' }), 'password');
  assert.equal(ok.ok, true);
  const cookie = ok.headers['set-cookie'];
  assert.match(cookie, /^dash_unlock=[\w-]{43}; Path=\/; Max-Age=60; HttpOnly; SameSite=Strict$/);
  assert.match((await gate.check(req({ 'x-dashboard-password': 'geheim', 'x-forwarded-proto': 'https' }), 'password')).headers['set-cookie'], /; Secure$/, 'Secure behind HTTPS');
  const token = cookie.split(';')[0];
  assert.equal((await gate.check(req({ cookie: token }), 'password')).ok, true, 'unlocked');
  assert.equal(gate.unlocked(req({ cookie: token })), true);
  const always = await gate.check(req({ cookie: token }), 'always');
  assert.deepEqual([always.status, always.body.always], [401, true], 'always: the cookie is not enough');
  const once = await gate.check(req({ 'x-dashboard-password': 'geheim' }), 'always');
  assert.deepEqual([once.ok, once.headers['set-cookie']], [true, undefined], 'and it unlocks nothing');
  clock += 61_000;
  assert.equal((await gate.check(req({ cookie: token }), 'password')).status, 401, 'expired');
  const again = (await gate.check(req({ 'x-dashboard-password': 'geheim' }), 'password')).headers['set-cookie'].split(';')[0];
  assert.deepEqual(gate.lock(req({ cookie: again })), { 'set-cookie': 'dash_unlock=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict' });
  assert.equal((await gate.check(req({ cookie: again }), 'password')).status, 401, 'locked again');
  // guessing: five free tries, then 30 s, doubled
  const wrong = () => gate.check(req({ 'x-dashboard-password': 'nope' }, '10.0.0.9'), 'password');
  for (let i = 0; i < 4; i++) assert.equal((await wrong()).body.wrongPassword, true);
  assert.equal((await wrong()).status, 401, 'the fifth is still answered');
  const waiting = await wrong();
  assert.deepEqual([waiting.status, waiting.body.retryAfter], [429, 30]);
  assert.equal((await gate.check(req({ 'x-dashboard-password': 'geheim' }, '10.0.0.9'), 'password')).status, 429, 'not even the right one meanwhile');
  assert.equal((await gate.check(req({ 'x-dashboard-password': 'geheim' }), 'password')).ok, true, 'another address is not held up');
  clock += 31_000;
  await wrong();
  assert.equal((await wrong()).body.retryAfter, 60, 'doubled');
  assert.ok(warned.length >= 6 && warned.every((m) => !m.includes('nope')), 'logged, never the password');
  clock += 61_000;
  assert.equal((await gate.check(req({ 'x-dashboard-password': 'geheim' }, '10.0.0.9'), 'password')).ok, true, 'and a right one resets it');
  const forever = new ActionGate({ password: loadPassword({ DASHBOARD_ACTION_PASSWORD: 'geheim' }), rememberMs: 0 });
  assert.equal((await forever.check(req({ 'x-dashboard-password': 'geheim' }), 'password')).headers['set-cookie'], undefined, 'remember: 0 asks every time');
  const open = new ActionGate({});
  assert.equal((await open.check(req(), 'always')).ok, true, 'no password: nothing is asked');
});
