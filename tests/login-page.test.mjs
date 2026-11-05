// The login page (public/login.html + login.js) in jsdom, with fetch stubbed.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { checkLanguages } from './helpers.mjs';

const HTML = fs.readFileSync(path.resolve('public/login.html'), 'utf8').replace('<script src="login.js"></script>', '');
const SCRIPT = fs.readFileSync(path.resolve('public/login.js'), 'utf8');
const INDEX = fs.readFileSync(path.resolve('public/index.html'), 'utf8');

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
  const block = /const PALETTES = (\{[\s\S]*?\n\});/.exec(INDEX)[1];
  assert.deepEqual(JSON.parse(JSON.stringify(w.HD_LOGIN.PALETTES)), new Function(`return ${block}`)());
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
