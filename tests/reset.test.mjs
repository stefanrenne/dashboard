import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PasswordReset, RESET_MS } from '../src/reset.js';
import { silentLog } from './helpers.mjs';

const req = (address) => ({ headers: {}, socket: { remoteAddress: address } });

test('PasswordReset: a code on request, in the log, valid for a while, once, gone after too many wrong tries', async () => {
  let now = 1_000_000;
  const logged = [];
  const r = new PasswordReset({ log: { ...silentLog, warn: (m) => logged.push(m) }, now: () => now });
  r.request(req('192.168.1.5'));
  assert.match(logged[0], /^admin password reset asked for from 192\.168\.1\.5: this code sets a new admin password until \S+: [A-Z0-9]{4}-[A-Z0-9]{4}$/);
  const code = r.code;
  now += RESET_MS - 1;
  r.request(req('192.168.1.6'));
  assert.equal(logged.length, 1, 'no new code while one is valid');
  now += 2;
  assert.equal((await r.consume(req('192.168.1.5'), code)).status, 401, 'expired');
  r.request(req('192.168.1.5'));
  assert.notEqual(r.code, code, 'a new one after it expired');
  assert.equal((await r.consume(req('192.168.1.5'), r.code)).ok, true);
  assert.equal(r.code, null, 'used up');

  // wrong tries from many addresses (each slowed down on its own): the code goes after ten
  r.request(req('192.168.1.5'));
  const fresh = r.code;
  for (let i = 0; i < 10; i++) await r.consume(req(`10.0.0.${i}`), 'NOPE-NOPE');
  assert.equal(r.code, null);
  assert.equal((await r.consume(req('10.0.1.1'), fresh)).status, 401, 'not even the right one now');
  assert.ok(logged.some((m) => /too many wrong codes, this one no longer counts/.test(m)));
});
