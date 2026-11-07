import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readServers, writeServers } from '../src/settings/servers.js';
import { loadConfig } from '../src/config/load.js';
import { tmpDir } from './helpers.mjs';

function setup(files) {
  const dir = tmpDir('dash-servers-');
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
  return dir;
}
const file = (dir, name) => fs.readFileSync(path.join(dir, name), 'utf8');

test('docker.yaml: servers read, renamed, added, reordered, TLS made and removed; comments and allowVariables kept', () => {
  const text = '# Docker servers\n# local:\n#   socket: /var/run/docker.sock\nnas:   # the NAS\n  host: 192.168.1.20\n  port: 2375\n  discover: false\n  allowVariables: [DASHBOARD_VAR_X]\n';
  const dir = setup({ 'docker.yaml': text });
  fs.mkdirSync(path.join(dir, 'certs'));
  fs.writeFileSync(path.join(dir, 'certs', 'ca.pem'), 'CA');
  const read = readServers(dir, 'docker.yaml');
  assert.deepEqual(read.entries.map((e) => [e.id, e.fields.host, e.fields.port, e.fields.discover, e.fields.swarm, e.other]), [['nas', '192.168.1.20', '2375', false, false, ['allowVariables']]]);
  assert.equal(writeServers(dir, 'docker.yaml', { entries: read.entries }, read.hash).changed, false);
  const [nas] = read.entries;
  nas.name = 'storage';
  nas.fields.discover = true;
  nas.fields.caFile = 'certs/ca.pem';
  writeServers(dir, 'docker.yaml', { entries: [{ id: null, name: 'local', fields: { socket: '/var/run/docker.sock' } }, nas] }, read.hash);
  let out = file(dir, 'docker.yaml');
  assert.match(out, /^# Docker servers\n/);
  assert.match(out, /^storage:\s+# the NAS/m);
  assert.match(out, /allowVariables: \[ DASHBOARD_VAR_X \]|allowVariables: \[DASHBOARD_VAR_X\]/);
  assert.match(out, /tls:\n +caFile: certs\/ca\.pem/);
  assert.doesNotMatch(out, /discover/, 'the default left out');
  assert.match(out, /^local:\n {2}socket: \/var\/run\/docker\.sock\nstorage:/m);
  const again = readServers(dir, 'docker.yaml');
  again.entries[1].fields.caFile = '';
  writeServers(dir, 'docker.yaml', { entries: again.entries }, again.hash);
  out = file(dir, 'docker.yaml');
  assert.doesNotMatch(out, /tls/);
  const config = loadConfig(dir);
  assert.deepEqual(config.errors, []);
  assert.deepEqual(config.docker.map((s) => [s.name, s.socket ?? s.url]), [['local', '/var/run/docker.sock'], ['storage', 'http://192.168.1.20:2375']]);
  for (const bad of [{ entries: [{ name: 'a b', fields: {} }] }, { entries: [{ name: 'a', fields: { port: 'x' } }] }, { entries: [{ name: 'a', fields: {} }, { name: 'a', fields: {} }] }]) {
    const r = readServers(dir, 'docker.yaml');
    assert.throws(() => writeServers(dir, 'docker.yaml', bad, r.hash), (err) => err.status === 400, JSON.stringify(bad));
  }
});

test('proxmox.yaml: the secret as a token, kept unless typed again; the flat form too', () => {
  const dir = setup({ 'proxmox.yaml': 'pve:\n  url: https://pve.lan:8006\n  token: api@pam!dash\n  secret: 1234-abcd\n' });
  const read = readServers(dir, 'proxmox.yaml');
  assert.match(read.entries[0].fields.secret, /^__SECRET_[0-9a-f]{10}__$/);
  assert.ok(!JSON.stringify(read).includes('1234-abcd'));
  read.entries[0].fields.insecure = true;
  assert.deepEqual(writeServers(dir, 'proxmox.yaml', { entries: read.entries }, read.hash).warnings, []);
  assert.match(file(dir, 'proxmox.yaml'), /secret: 1234-abcd\n {2}insecure: true/);
  const typed = readServers(dir, 'proxmox.yaml');
  typed.entries[0].fields.secret = 'new-secret';
  assert.deepEqual(writeServers(dir, 'proxmox.yaml', { entries: typed.entries }, typed.hash).warnings.map((w) => w.path), ['pve.secret']);
  const flat = setup({ 'proxmox.yaml': 'url: https://pve.lan\ntoken: t\nsecret: flat-secret\n' });
  const f = readServers(flat, 'proxmox.yaml');
  assert.equal(f.flat, true);
  f.entries[0].fields.url = 'https://pve2.lan';
  writeServers(flat, 'proxmox.yaml', { entries: f.entries }, f.hash);
  assert.equal(file(flat, 'proxmox.yaml'), 'url: https://pve2.lan\ntoken: t\nsecret: flat-secret\n');
});

test('kubernetes.yaml: one map of fields', () => {
  const dir = setup({ 'kubernetes.yaml': '# discovery\nmode: disabled   # or cluster\n' });
  const read = readServers(dir, 'kubernetes.yaml');
  assert.deepEqual(read.fields, { mode: 'disabled', kubeconfig: '', context: '', ingress: '', traefik: '', gateway: '' });
  writeServers(dir, 'kubernetes.yaml', { fields: { ...read.fields, mode: 'cluster', traefik: 'true' } }, read.hash);
  assert.match(file(dir, 'kubernetes.yaml'), /^# discovery\nmode: cluster +# or cluster\ntraefik: true\n$/);
  assert.deepEqual(loadConfig(dir).kubernetes, { mode: 'cluster', traefik: true });
  const r = readServers(dir, 'kubernetes.yaml');
  assert.throws(() => writeServers(dir, 'kubernetes.yaml', { fields: { mode: 'nope' } }, r.hash), (err) => err.status === 400);
});

test('kubernetes.yaml without a mode: the form shows it as the dashboard reads it, and a save of another field leaves it out', () => {
  const dir = setup({ 'kubernetes.yaml': 'context: lab\n' });
  const read = readServers(dir, 'kubernetes.yaml');
  assert.equal(read.fields.mode, loadConfig(dir).kubernetes.mode);
  writeServers(dir, 'kubernetes.yaml', { fields: { ...read.fields, context: 'home' } }, read.hash);
  assert.equal(file(dir, 'kubernetes.yaml'), 'context: home\n');
});
