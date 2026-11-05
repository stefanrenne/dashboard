// The setup wizard (public/setup.html + setup.js) in jsdom, with fetch stubbed.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const HTML = fs.readFileSync(path.resolve('public/setup.html'), 'utf8');
const SCRIPT = fs.readFileSync(path.resolve('public/setup.js'), 'utf8');
const INDEX = fs.readFileSync(path.resolve('public/index.html'), 'utf8');

const WIDGETS = [
  { id: 'radarr', name: 'Radarr', options: { url: { type: 'url', required: true, secret: false }, key: { type: 'string', required: true, secret: true }, enableQueue: { type: 'boolean', required: false, secret: false, default: false }, version: { type: 'enum', required: false, secret: false, values: [1, 2], default: 1 } } },
  { id: 'plex', name: 'Plex', options: { url: { type: 'url', required: true, secret: false }, key: { type: 'string', required: true, secret: true } } },
];
const CONTAINERS = [
  { server: 'local', name: 'radarr', image: 'linuxserver/radarr', widget: 'radarr', group: 'Downloads', discovered: false, url: 'http://radarr:7878', href: 'http://192.168.1.10:7878' },
  { server: 'local', name: 'postgres', image: 'postgres:16', widget: null, group: 'Services', discovered: false, url: null, href: null },
];

const opened = new Set();
afterEach(() => {
  for (const w of opened) w.close();
  opened.clear();
});

async function page({ allowed = true, answers = {} } = {}) {
  const calls = [];
  const html = HTML.replace('<script src="setup.js"></script>', '');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://192.168.1.10:3000/setup',
    beforeParse(window) {
      Object.defineProperty(window.navigator, 'language', { value: 'nl-NL', configurable: true });
      window.scrollTo = () => {};
      window.fetch = async (url, init = {}) => {
        const p = new URL(url, 'http://192.168.1.10:3000/').pathname.replace('/api/onboarding/', '');
        calls.push({ p, body: init.body ? JSON.parse(init.body) : undefined });
        const body = p === 'state' ? { active: true, allowed }
          : p === 'widgets' ? { widgets: WIDGETS }
            : p === 'containers' ? { containers: CONTAINERS, problems: [] }
              : p === 'status' ? { host: '192.168.1.10', allowedHosts: [], hostListed: false, actionPassword: false, docker: [{ name: 'local', socket: true, url: null }] }
                : answers[p] ?? { ok: true };
        return { json: async () => structuredClone(typeof body === 'function' ? body(init) : body) };
      };
    },
  });
  opened.add(dom.window);
  dom.window.eval(SCRIPT);
  await new Promise((r) => setTimeout(r, 30));
  return { w: dom.window, calls };
}
const tick = () => new Promise((r) => setTimeout(r, 30));
const next = (doc) => doc.querySelector('.actions button.primary').click();

test('the palettes are the page\'s own, and every language has every text with its placeholders', async () => {
  const { w } = await page();
  const block = /const PALETTES = (\{[\s\S]*?\n\});/.exec(INDEX)[1];
  assert.deepEqual(JSON.parse(JSON.stringify(w.HD_SETUP.PALETTES)), new Function(`return ${block}`)());
  const { I18N } = w.HD_SETUP;
  const languages = ['en', 'nl', 'fr', 'de', 'es', 'ca', 'he', 'hr', 'hu', 'it', 'nb-NO', 'pt', 'ru', 'sv', 'vi', 'zh-Hans', 'zh-Hant'];
  assert.deepEqual(Object.keys(I18N).sort(), [...languages].sort());
  const marks = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  for (const lang of languages) {
    assert.deepEqual(Object.keys(I18N[lang]).sort(), Object.keys(I18N.en).sort(), lang);
    for (const [k, v] of Object.entries(I18N.en)) assert.equal(marks(I18N[lang][k]), marks(v), `${lang}.${k}`);
  }
});

test('from outside the local network it asks for the code first', async () => {
  const { w, calls } = await page({ allowed: false, answers: { code: { ok: false, wrongCode: true } } });
  const doc = w.document;
  assert.ok(doc.getElementById('setup-code'), 'a field for the code');
  assert.equal(doc.querySelector('h2').textContent, 'Voer de setupcode in', 'in the browser\'s language');
  assert.equal(doc.getElementById('steps').hidden, true);
  doc.getElementById('setup-code').value = 'abcd-efgh';
  doc.querySelector('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await tick();
  assert.equal(doc.querySelector('[role=alert]').textContent, 'Onjuiste code');
  assert.deepEqual(calls.find((c) => c.p === 'code').body, { code: 'abcd-efgh' });
});

test('the steps: basics, containers with a generated form, test, security lines, and what finish sends', async () => {
  const { w, calls } = await page({ answers: { test: { ok: true, blocks: [{ label: 'wanted', value: 3, unit: null }] }, hash: { ok: true, hash: 'scrypt:1:2:3:abc:def' } } });
  const doc = w.document;
  // 1. basics, in the browser's language; the colour applies at once
  assert.equal(doc.getElementById('language').value, 'nl');
  doc.getElementById('title').value = 'Thuis';
  doc.getElementById('title').dispatchEvent(new w.Event('input'));
  doc.querySelector('.swatch[title=emerald]').click();
  assert.equal(doc.documentElement.style.getPropertyValue('--t500'), '#10b981');
  next(doc);
  await tick();
  // 2. services: the matched container ticked with its URL, the other not
  const cards = [...doc.querySelectorAll('.card')];
  assert.equal(cards.length, 2);
  assert.ok(cards[0].classList.contains('on'));
  assert.ok(!cards[1].classList.contains('on'), 'no widget: not ticked');
  assert.equal(doc.getElementById('opt-0-url').value, 'http://radarr:7878');
  assert.equal(doc.getElementById('opt-0-key').type, 'password', 'a secret option');
  assert.equal(doc.getElementById('opt-0-enableQueue').type, 'checkbox');
  assert.equal(doc.getElementById('opt-0-version').tagName, 'SELECT');
  assert.equal(doc.getElementById('href-0').value, 'http://192.168.1.10:7878');
  doc.getElementById('opt-0-key').value = 'abc123';
  doc.getElementById('opt-0-key').dispatchEvent(new w.Event('input'));
  [...cards[0].querySelectorAll('button')].find((b) => b.textContent === 'Testen').click();
  await tick();
  assert.equal(cards[0].querySelector('.result').textContent, 'Werkt: wanted 3');
  assert.deepEqual(calls.find((c) => c.p === 'test').body, { type: 'radarr', options: { url: 'http://radarr:7878', key: 'abc123', enableQueue: false, version: 1 } });
  next(doc);
  await tick();
  // 3. homepage: skipped
  next(doc);
  await tick();
  // 4. security: a hash, and the compose lines
  assert.match(doc.getElementById('panel').textContent, /Docker-socket is gekoppeld/);
  doc.getElementById('action-password').value = 'geheim';
  doc.getElementById('action-password').closest('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await tick();
  assert.match(doc.querySelector('pre').textContent, /DASHBOARD_ACTION_PASSWORD: "scrypt:1:2:3:abc:def"/);
  assert.ok(!doc.querySelector('pre').textContent.includes('DASHBOARD_ALLOWED_HOSTS'), 'opened by IP: no host to add');
  next(doc);
  await tick();
  // 5. done: what is sent
  assert.match(doc.getElementById('panel').textContent, /services\.yaml \(1 services\)/);
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Configuratie schrijven').click();
  await tick();
  const sent = calls.find((c) => c.p === 'finish').body;
  assert.deepEqual(sent.settings, { title: 'Thuis', language: 'nl', theme: 'auto', color: 'emerald' });
  assert.deepEqual(sent.services, [{ group: 'Downloads', name: 'Radarr', href: 'http://192.168.1.10:7878', container: 'radarr', server: 'local', icon: 'radarr.png', widget: { type: 'radarr', url: 'http://radarr:7878', key: 'abc123', enableQueue: false, version: 1 } }]);
});

test('skip: an empty dashboard, and a file that is there already is said', async () => {
  const { w, calls } = await page({ answers: { finish: { ok: false, exists: ['services.yaml'] } } });
  let alerted = '';
  w.alert = (m) => { alerted = m; };
  [...w.document.querySelectorAll('button')].find((b) => b.classList.contains('link')).click();
  await tick();
  assert.deepEqual(calls.find((c) => c.p === 'finish').body.services, []);
  assert.equal(alerted, 'Bestaat al: services.yaml. Er is niets geschreven.');
});
