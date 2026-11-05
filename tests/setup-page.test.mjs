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
              : p === 'docker' ? (init) => ({ socketMounted: true, errors: [], servers: [{ name: 'local', target: '/var/run/docker.sock', ok: true, version: '27.3.1', containers: 32 }, ...JSON.parse(init.body).docker.map((d) => ({ name: d.name ?? 'nas', target: `http://${d.address}`, ok: false, error: 'connect ECONNREFUSED', permission: false }))] })
                : p === 'status' ? { host: '192.168.1.10', envHosts: ['env.lan'], envPassword: false }
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
  const test = (init) => (JSON.parse(init.body).options.key === 'bad' ? { ok: false, error: 'Radarr answered 401' } : { ok: true, blocks: [{ label: 'wanted', value: 3, unit: null }] });
  const { w, calls } = await page({ answers: { test, hash: { ok: true, hash: 'scrypt:1:2:3:abc:def' } } });
  const doc = w.document;
  // 1. basics, in the browser's language; the colour applies at once
  assert.equal(doc.getElementById('language').value, 'nl');
  doc.getElementById('title').value = 'Thuis';
  doc.getElementById('title').dispatchEvent(new w.Event('input'));
  doc.querySelector('.swatch[title=emerald]').click();
  assert.equal(doc.documentElement.style.getPropertyValue('--t500'), '#10b981');
  next(doc);
  await tick();
  // 2. Docker: what answers, and a server added here
  assert.match(doc.getElementById('panel').textContent, /local \(\/var\/run\/docker\.sock\): Docker 27\.3\.1, 32 containers/);
  doc.getElementById('docker-address').value = 'nas.lan:2375';
  doc.getElementById('docker-address').closest('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await tick();
  assert.deepEqual(calls.filter((c) => c.p === 'docker').at(-1).body, { docker: [{ address: 'nas.lan:2375' }] });
  assert.match(doc.getElementById('panel').textContent, /connect ECONNREFUSED/);
  assert.match(doc.getElementById('panel').textContent, /nas\.lan:2375/, 'listed as added here');
  next(doc);
  await tick();
  // 3. services: the matched container ticked with its URL, the other not
  const cards = [...doc.querySelectorAll('.card')];
  assert.equal(cards.length, 2);
  assert.ok(cards[0].classList.contains('on'));
  assert.ok(!cards[1].classList.contains('on'), 'no widget: not ticked');
  assert.equal(doc.getElementById('opt-0-url').value, 'http://radarr:7878');
  assert.equal(doc.getElementById('opt-0-key').type, 'password', 'a secret option');
  assert.equal(doc.getElementById('opt-0-enableQueue').type, 'checkbox');
  assert.equal(doc.getElementById('opt-0-version').tagName, 'SELECT');
  assert.equal(doc.getElementById('href-0').value, 'http://192.168.1.10:7878');
  const card = (i) => doc.querySelectorAll('.card')[i];
  // Next is held back while a ticked service is not ready: a key missing, a failing test, no link
  next(doc);
  await tick();
  assert.equal(doc.querySelector('h2').textContent, 'Services', 'still on this step');
  assert.equal(card(0).querySelector('.result').textContent, 'key is nodig.');
  assert.ok(card(0).classList.contains('invalid'));
  assert.equal(doc.querySelector('[role=alert]').textContent, 'Niet alle services zijn klaar: herstel de rood gemarkeerde, of vink ze uit.');
  doc.getElementById('opt-0-key').value = 'bad';
  doc.getElementById('opt-0-key').dispatchEvent(new w.Event('input'));
  next(doc);
  await tick();
  assert.equal(card(0).querySelector('.result').textContent, 'Radarr answered 401', 'tested on Next');
  assert.equal(doc.querySelector('h2').textContent, 'Services');
  doc.getElementById('on-1').click(); // postgres: no widget and no link
  await tick();
  doc.getElementById('opt-0-key').value = 'abc123';
  doc.getElementById('opt-0-key').dispatchEvent(new w.Event('input'));
  next(doc);
  await tick();
  assert.equal(card(1).querySelector('.result').textContent, 'Een link is nodig, beginnend met http:// of https://.');
  doc.getElementById('on-1').click();
  await tick();
  [...card(0).querySelectorAll('button')].find((b) => b.textContent === 'Testen').click();
  await tick();
  assert.equal(card(0).querySelector('.result').textContent, 'Werkt: wanted 3');
  assert.deepEqual(calls.filter((c) => c.p === 'test').at(-1).body, { type: 'radarr', options: { url: 'http://radarr:7878', key: 'abc123', enableQueue: false, version: 1 } });
  assert.deepEqual(calls.find((c) => c.p === 'containers').body, { docker: [{ address: 'nas.lan:2375' }] }, 'the scan includes the added server');
  // homepage: a button here, next to adding by hand
  assert.equal(doc.getElementById('homepage-files'), null);
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Overstappen van homepage').click();
  await tick();
  assert.ok(doc.getElementById('homepage-files'), 'its file chooser opens in this step');
  next(doc);
  await tick();
  // 4. security: the admin password is required; hosts and the login choice go into settings.yaml
  const panel = () => doc.getElementById('panel').textContent;
  assert.ok(!/Docker/.test(panel()), 'no Docker section here any more');
  assert.equal(doc.getElementById('allowed-hosts').value, '', 'opened by an IP address: no name to fill in');
  assert.match(panel(), /Ook uit de environment van de container: env\.lan/);
  assert.equal(doc.getElementById('login-actions').checked, true, 'only some actions, unless chosen otherwise');
  assert.match(doc.querySelector('label[for=login-page]').textContent, /Een loginpagina.*veiliger/, 'the login page is marked safer');
  assert.ok(doc.querySelector('label[for=login-page] strong') && doc.querySelector('label[for=login-page] .hint'), 'a title in bold, the explanation below it');
  doc.getElementById('login-page').click();
  const type = (id, value) => { doc.getElementById(id).value = value; doc.getElementById(id).dispatchEvent(new w.Event('input')); };
  next(doc);
  await tick();
  assert.equal(doc.querySelector('[role=alert]').textContent, 'Het admin wachtwoord moet minstens 8 tekens hebben.');
  type('admin-password', 'Geheim-Admin-1');
  type('admin-repeat', 'Geheim-Admin-2');
  next(doc);
  await tick();
  assert.equal(doc.querySelector('[role=alert]').textContent, 'De twee wachtwoorden zijn niet gelijk.');
  type('admin-repeat', 'Geheim-Admin-1');
  type('allowed-hosts', 'dash.lan, www.example.com');
  next(doc);
  await tick();
  // 5. done: what is sent
  assert.match(doc.getElementById('panel').textContent, /services\.yaml \(1 services\)/);
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Configuratie schrijven').click();
  await tick();
  const sent = calls.find((c) => c.p === 'finish').body;
  assert.deepEqual(sent.settings, { title: 'Thuis', language: 'nl', theme: 'auto', color: 'emerald' });
  assert.deepEqual(sent.docker, [{ address: 'nas.lan:2375' }]);
  assert.deepEqual(sent.security, { adminPassword: 'Geheim-Admin-1', allowedHosts: ['dash.lan', 'www.example.com'], login: true });
  assert.deepEqual(sent.services, [{ group: 'Downloads', name: 'Radarr', href: 'http://192.168.1.10:7878', container: 'radarr', server: 'local', icon: 'radarr.png', widget: { type: 'radarr', url: 'http://radarr:7878', key: 'abc123', enableQueue: false, version: 1 } }]);
});

test('skip: an empty dashboard, and a file that is there already is said', async () => {
  const { w, calls } = await page({ answers: { finish: { ok: false, exists: ['services.yaml'] } } });
  const doc = w.document;
  [...doc.querySelectorAll('button')].find((b) => b.classList.contains('link')).click();
  await tick();
  assert.equal(doc.querySelector('h2').textContent, 'Beveiliging', 'skipping still asks for the admin password');
  for (const id of ['admin-password', 'admin-repeat']) { doc.getElementById(id).value = 'Geheim-Admin-1'; doc.getElementById(id).dispatchEvent(new w.Event('input')); }
  next(doc);
  await tick();
  [...doc.querySelectorAll('button')].find((b) => b.textContent === 'Configuratie schrijven').click();
  await tick();
  const sent = calls.find((c) => c.p === 'finish').body;
  assert.deepEqual([sent.services, sent.security.login], [[], false]);
  assert.equal(doc.querySelector('#panel [role=status]').textContent, 'Bestaat al: services.yaml. Er is niets geschreven.');
});
