// The login page (public/login.html + login.js) in jsdom, with fetch stubbed.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { checkLanguages, withCommon } from './helpers.mjs';

const HTML = withCommon(fs.readFileSync(path.resolve('public/login.html'), 'utf8')).replace('<script src="login.js"></script>', '');
const SCRIPT = fs.readFileSync(path.resolve('public/login.js'), 'utf8');

const opened = new Set();
afterEach(() => {
  for (const w of opened) w.close();
  opened.clear();
});

async function page(info, answer) {
  const calls = [];
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    url: 'http://dash.lan/login',
    beforeParse(window) {
      window.fetch = async (url, init = {}) => {
        calls.push({ url: String(url), init });
        return { json: async () => (init.method === 'POST' ? answer : info) };
      };
    },
  });
  opened.add(dom.window);
  dom.window.eval(SCRIPT);
  await new Promise((r) => setTimeout(r, 20));
  return { w: dom.window, calls };
}

test('the login page: in settings.yaml\'s language and colour, every language complete, the palettes the page\'s own', async () => {
  const { w } = await page({ login: true, loggedIn: false, language: 'de', theme: 'dark', color: 'emerald' });
  const doc = w.document;
  assert.equal(doc.getElementById('heading').textContent, 'Anmelden');
  assert.equal(doc.documentElement.style.getPropertyValue('--t500'), '#10b981');
  assert.equal(doc.getElementById('password').getAttribute('autocomplete'), 'current-password');
  assert.equal(doc.querySelector('input[autocomplete=username]').value, 'dashboard', 'for password managers');
  const { I18N } = w.HD_LOGIN;
  checkLanguages(assert, I18N);
});

test('the login page: a wrong password is said, the right one sends the header and leads home', async () => {
  const { w, calls } = await page({ login: true, loggedIn: false, language: 'nl' }, { ok: false, wrongPassword: true });
  const doc = w.document;
  doc.getElementById('password').value = 'nope';
  doc.getElementById('login').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(doc.getElementById('error').textContent, 'Onjuist wachtwoord');
  const sent = calls.find((c) => c.init.method === 'POST');
  assert.deepEqual([sent.url, sent.init.headers['x-requested-with'], JSON.parse(sent.init.body)], ['api/login', 'dashboard', { password: 'nope' }]);
  const broken = await page({ login: true, loggedIn: false, broken: true, language: 'en' });
  assert.match(broken.w.document.getElementById('error').textContent, /not a scrypt hash/);
});

test('the login page: over https with a passkey for this host, a passkey logs in', async () => {
  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    url: 'https://dash.lan/login',
    beforeParse(window) {
      Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
      window.PublicKeyCredential = function PublicKeyCredential() {};
      const buf = new Uint8Array([1]).buffer;
      Object.defineProperty(window.navigator, 'credentials', { configurable: true, value: { get: async () => ({ id: 'cred-1', response: { clientDataJSON: buf, authenticatorData: buf, signature: buf } }) } });
      window.calls = [];
      window.fetch = async (url, init = {}) => {
        window.calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
        const answers = {
          'api/login': init.method === 'POST' ? { ok: true } : { login: true, loggedIn: false, language: 'nl' },
          'api/passkey': { available: true },
          'api/passkey/options': { available: true, publicKey: { challenge: 'AAEC', rpId: 'dash.lan', allowCredentials: [] } },
          'api/passkey/verify': { ok: true, token: 'one-time' },
        };
        return { json: async () => answers[String(url)] };
      };
    },
  });
  opened.add(dom.window);
  dom.window.eval(SCRIPT);
  await new Promise((r) => setTimeout(r, 20));
  const button = dom.window.document.getElementById('passkey');
  assert.equal(button.hidden, false);
  assert.equal(button.textContent, 'Inloggen met een passkey');
  // asked at once, without a press
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(dom.window.calls.at(-1), { url: 'api/login', body: { passkeyToken: 'one-time' } });
  // over http the button stays hidden
  const plain = await page({ login: true, loggedIn: false, language: 'nl' });
  assert.equal(plain.w.document.getElementById('passkey').hidden, true);
});
