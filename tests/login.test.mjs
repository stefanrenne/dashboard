import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SessionStore, SESSION_COOKIE, SESSIONS_FILE } from '../src/login.js';
import { tmpDir, silentLog } from './helpers.mjs';

const DAY = 86_400_000;
const req = (cookie) => ({ headers: cookie ? { cookie } : {}, socket: { remoteAddress: '192.168.1.20' } });
const tokenOf = (setCookie) => setCookie.split(';')[0];

test('SessionStore: checked on the server, moved on by a visit, kept through a restart, ended by a logout or a new password', () => {
  const dir = tmpDir('dash-login-');
  let clock = 1_000_000_000;
  const store = new SessionStore({ configDir: dir, now: () => clock, log: silentLog });
  const cookie = store.create(req(), 'pw-1', 7 * DAY);
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=[\\w-]{43}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax$`));
  const c = tokenOf(cookie);
  assert.equal(store.check(req(c), 'pw-1', 7 * DAY).ok, true);
  assert.equal(store.check(req(`${SESSION_COOKIE}=forged`), 'pw-1', 7 * DAY).ok, false, 'a token the server does not know');
  assert.equal(store.check(req(), 'pw-1', 7 * DAY).ok, false, 'no cookie');
  // only hashes of the tokens are stored, readable by the dashboard alone
  const file = path.join(dir, SESSIONS_FILE);
  assert.ok(!fs.readFileSync(file, 'utf8').includes(c.split('=')[1]));
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  // a visit within the week moves the end on; the cookie is renewed at most once an hour
  clock += 30 * 60_000;
  assert.deepEqual(store.check(req(c), 'pw-1', 7 * DAY).headers, {}, 'not renewed within the hour');
  clock += 6 * DAY;
  const renewed = store.check(req(c), 'pw-1', 7 * DAY);
  assert.equal(renewed.ok, true);
  assert.match(renewed.headers['set-cookie'], /Max-Age=604800/);
  clock += 6 * DAY;
  assert.equal(store.check(req(c), 'pw-1', 7 * DAY).ok, true, 'twelve days after the login, still in: each visit moves it on');
  // a restart reads the sessions back
  const again = new SessionStore({ configDir: dir, now: () => clock, log: silentLog });
  assert.equal(again.check(req(c), 'pw-1', 7 * DAY).ok, true, 'through a restart');
  // a week without a visit ends it
  clock += 8 * DAY;
  assert.equal(again.check(req(c), 'pw-1', 7 * DAY).ok, false, 'expired');
  // a logout ends it for good, also when the cookie is kept
  const other = tokenOf(again.create(req(), 'pw-1', 7 * DAY));
  assert.match(again.end(req(other)), /^dash_session=; Path=\/; Max-Age=0/);
  assert.equal(again.check(req(other), 'pw-1', 7 * DAY).ok, false, 'logged out');
  // a new admin password ends every session of the old one
  const third = tokenOf(again.create(req(), 'pw-1', 7 * DAY));
  assert.equal(again.check(req(third), 'pw-2', 7 * DAY).ok, false, 'another password');
  assert.equal(again.check(req(third), 'pw-1', 7 * DAY).ok, false, 'and it is gone');
});
