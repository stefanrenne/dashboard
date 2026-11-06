// The settings page (public/settings.html + settings.js) in jsdom, with fetch stubbed.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { checkLanguages } from './helpers.mjs';

const HTML = fs.readFileSync(path.resolve('public/settings.html'), 'utf8').replace('<script src="settings.js"></script>', '');
const SCRIPT = fs.readFileSync(path.resolve('public/settings.js'), 'utf8');
const INDEX = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
const VALUES = {
  title: 'Lab', language: 'nl', theme: 'dark', color: 'slate', showTitle: true, headerStyle: 'boxed', target: '_blank', statusStyle: '',
  allowedHosts: ['dash.lan'], login: false, loginRemember: '7d', actionsRemember: '15m', hideVersion: false, disableUpdateCheck: false, disableIndexing: false,
};

const opened = new Set();
afterEach(() => {
  for (const w of opened) w.close();
  opened.clear();
});

async function page(answers, setup = () => {}) {
  const calls = [];
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    url: 'http://dash.lan/settings',
    beforeParse(window) {
      window.scrollTo = () => {};
      setup(window);
      window.fetch = async (url, init = {}) => {
        const p = new URL(url, 'http://dash.lan/').pathname;
        calls.push({ p, init, body: init.body ? JSON.parse(init.body) : undefined });
        const a = answers[`${init.method ?? 'GET'} ${p}`];
        return { json: async () => structuredClone(typeof a === 'function' ? a(init) : a) };
      };
    },
  });
  opened.add(dom.window);
  dom.window.eval(SCRIPT);
  await new Promise((r) => setTimeout(r, 20));
  return { w: dom.window, doc: dom.window.document, calls };
}
const tick = () => new Promise((r) => setTimeout(r, 20));
const data = (extra = {}) => ({ ok: true, values: VALUES, other: ['layout', 'plugins'], hasPassword: true, envHosts: [], envPassword: false, noPassword: false, ...extra });

test('settings page: every language complete, the palettes the page\'s own', async () => {
  const { w } = await page({ 'GET /api/settings': data() });
  const { I18N, PALETTES } = w.HD_SETTINGS;
  checkLanguages(assert, I18N);
  const block = /const PALETTES = (\{[\s\S]*?\n\});/.exec(INDEX)[1];
  assert.deepEqual(JSON.parse(JSON.stringify(PALETTES)), new Function(`return ${block}`)());
});

test('settings page: asks for the admin password, then shows settings.yaml and saves what changed', async () => {
  let unlocked = false;
  const { doc, w, calls } = await page({
    'GET /api/settings': () => (unlocked ? data() : { ok: false, needsPassword: true }),
    'POST /api/settings/unlock': (init) => { unlocked = init.headers['x-dashboard-password'] === 'Geheim-Admin-1'; return unlocked ? { ok: true } : { ok: false, wrongPassword: true }; },
    'POST /api/settings': (init) => data({ values: { ...VALUES, ...JSON.parse(init.body).values } }),
    'POST /api/settings/password': (init) => (JSON.parse(init.body).current === 'Geheim-Admin-1' ? data() : { ok: false, wrongPassword: true }),
  });
  assert.equal(doc.getElementById('admin-password').getAttribute('autocomplete'), 'current-password');
  doc.getElementById('admin-password').value = 'nope';
  doc.querySelector('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await tick();
  assert.equal(doc.querySelector('[role=alert]').textContent, 'Wrong password', 'in English until the settings are known');
  doc.getElementById('admin-password').value = 'Geheim-Admin-1';
  doc.querySelector('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await tick();
  // the form, in settings.yaml's language
  assert.equal(doc.getElementById('heading').textContent, 'Instellingen');
  assert.equal(doc.getElementById('title').value, 'Lab');
  assert.equal(doc.getElementById('allowedHosts').value, 'dash.lan');
  assert.equal(doc.getElementById('login-actions').checked, true);
  assert.match(doc.body.textContent, /Ook in settings\.yaml, blijven zoals ze zijn \(pas ze aan in het bestand\): layout, plugins/);
  doc.getElementById('title').value = 'Thuis';
  doc.getElementById('title').dispatchEvent(new w.Event('input'));
  doc.getElementById('login-page').click();
  await tick();
  assert.ok(doc.getElementById('loginRemember'), 'the login\'s duration shows once it is on');
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Opslaan').click();
  await tick();
  const sent = calls.filter((c) => c.p === '/api/settings' && c.init.method === 'POST').at(-1).body.values;
  assert.deepEqual([sent.title, sent.login, sent.allowedHosts], ['Thuis', true, ['dash.lan']]);
  assert.equal(doc.querySelector('.saved [role=status]').textContent, 'Opgeslagen.');
  // the admin password: the current one first
  doc.getElementById('pw-current').value = 'nope';
  doc.getElementById('pw-current').dispatchEvent(new w.Event('input'));
  for (const id of ['pw-next', 'pw-repeat']) { doc.getElementById(id).value = 'Ander-Wachtwoord-2'; doc.getElementById(id).dispatchEvent(new w.Event('input')); }
  doc.getElementById('pw-next').closest('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await tick();
  assert.equal(doc.querySelector('[role=alert]').textContent, 'Het huidige wachtwoord klopt niet.');
});

test('settings page: no admin password yet, setting one comes first', async () => {
  const { doc } = await page({ 'GET /api/settings': data({ noPassword: true, hasPassword: false }) });
  assert.equal(doc.getElementById('pw-current'), null, 'no current password to ask');
  assert.ok(doc.getElementById('pw-next'));
  assert.equal(doc.getElementById('title'), null, 'nothing else before it');
});

test('settings page: passkeys over https (add, list, remove), a notice over http, and a passkey opens the settings', async () => {
  const http = await page({ 'GET /api/settings': data({ passkeys: { secure: false, host: null, list: [] } }) });
  assert.match(http.doc.getElementById('panel').textContent, /Passkeys werken als het dashboard via https wordt geopend/);
  assert.equal(http.doc.querySelector('.item.passkey'), null);

  const buf = (bytes) => new Uint8Array(bytes).buffer;
  const created = [];
  const webauthn = (w) => {
    Object.defineProperty(w, 'isSecureContext', { value: true, configurable: true });
    w.PublicKeyCredential = function PublicKeyCredential() {};
    Object.defineProperty(w.navigator, 'credentials', { configurable: true, value: {
      create: async (o) => { created.push(o); return { id: 'cred-1', response: { clientDataJSON: buf([1]), getAuthenticatorData: () => buf([2]), getPublicKey: () => buf([3]), getPublicKeyAlgorithm: () => -7 } }; },
      get: async () => ({ id: 'cred-1', response: { clientDataJSON: buf([1]), authenticatorData: buf([2]), signature: buf([3]) } }),
    } });
  };
  const list = [];
  const pk = () => ({ secure: true, host: 'dash.lan', list: structuredClone(list) });
  const { doc, calls } = await page({
    'GET /api/settings': () => data({ passkeys: pk() }),
    'POST /api/settings/passkeys/options': { ok: true, publicKey: { challenge: 'AAEC', rp: { id: 'dash.lan', name: 'Lab' }, user: { id: 'BAUG', name: 'admin', displayName: 'Lab (admin)' }, pubKeyCredParams: [], excludeCredentials: [{ type: 'public-key', id: 'BwgJ' }] } },
    'POST /api/settings/passkeys': (init) => { list.push({ id: 'cred-1', name: JSON.parse(init.body).name, created: '2026-11-06T10:00:00Z', lastUsed: null }); return data({ passkeys: pk() }); },
    'POST /api/settings/passkeys/remove': () => { list.length = 0; return data({ passkeys: pk() }); },
  }, webauthn);
  assert.match(doc.getElementById('panel').textContent, /Nog geen passkeys voor dash\.lan/);
  doc.getElementById('passkey-name').value = 'MacBook';
  doc.getElementById('passkey-name').dispatchEvent(new doc.defaultView.Event('input'));
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Passkey toevoegen').click();
  await tick();
  assert.deepEqual([...new Uint8Array(created[0].publicKey.user.id)], [4, 5, 6], 'the user id as bytes');
  assert.deepEqual(calls.find((c) => c.p === '/api/settings/passkeys').body, { id: 'cred-1', clientDataJSON: 'AQ', authenticatorData: 'Ag', publicKey: 'Aw', alg: -7, name: 'MacBook' });
  assert.match(doc.querySelector('.item.passkey').textContent, /MacBook/);
  assert.match(doc.getElementById('panel').textContent, /De passkey is toegevoegd\./);
  [...doc.querySelectorAll('.item.passkey button')][0].click();
  await tick();
  assert.equal(doc.querySelector('.item.passkey'), null);

  // locked: the passkey is asked at once and opens the settings with its one-time token
  let unlocked = false;
  const door = await page({
    'GET /api/settings': () => (unlocked ? data() : { ok: false, needsPassword: true }),
    'GET /api/passkey': { available: true },
    'POST /api/passkey/options': { available: true, publicKey: { challenge: 'AAEC', rpId: 'dash.lan', allowCredentials: [] } },
    'POST /api/passkey/verify': { ok: true, token: 'one-time' },
    'POST /api/settings/unlock': (init) => { unlocked = init.headers['x-dashboard-passkey'] === 'one-time'; return { ok: unlocked }; },
  }, webauthn);
  // asked at once, without a press
  await tick();
  await tick();
  assert.equal(unlocked, true);
  assert.ok(door.doc.querySelector('.panel h2'), 'the settings show');
});
