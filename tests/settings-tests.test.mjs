import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testKubernetes, testProxmox } from '../src/settings/tests.js';
import { serve } from './helpers.mjs';

test('testProxmox: the version with the API token; a refused token, a wrong URL, no answer', async () => {
  const pve = await serve((req, res) => {
    if (req.headers.authorization !== 'PVEAPIToken=api@pam!dash=s3cret') { res.statusCode = 401; return res.end(); }
    res.end(JSON.stringify({ data: { version: '8.2.4' } }));
  });
  try {
    assert.deepEqual(await testProxmox({ url: `${pve.url}/`, token: 'api@pam!dash', secret: 's3cret' }), { ok: true, version: '8.2.4' });
    const refused = await testProxmox({ url: pve.url, token: 'api@pam!dash', secret: 'wrong' });
    assert.equal(refused.ok, false);
    assert.match(refused.error, /401/);
    assert.ok(!refused.error.includes('wrong'));
    assert.match((await testProxmox({ url: 'ftp://pve.lan', token: 't', secret: 's' })).error, /http/);
  } finally {
    await pve.close();
  }
  assert.equal((await testProxmox({ url: 'http://127.0.0.1:9', token: 't', secret: 's' }, { timeoutMs: 500 })).ok, false);
});

test('testKubernetes: the version and the services discovery finds; off, and no connection', async () => {
  const api = await serve((req, res) => {
    if (req.headers.authorization !== 'Bearer tok') { res.statusCode = 401; return res.end(); }
    if (req.url === '/version') return res.end(JSON.stringify({ gitVersion: 'v1.30.2' }));
    if (req.url === '/apis/networking.k8s.io/v1/ingresses') {
      return res.end(JSON.stringify({ items: [{ metadata: { name: 'app', namespace: 'default', annotations: { 'getdashboard.dev/enabled': 'true', 'getdashboard.dev/name': 'App', 'getdashboard.dev/group': 'Apps' } }, spec: { rules: [{ host: 'app.lan' }] } }] }));
    }
    res.statusCode = 404;
    res.end();
  });
  try {
    const ok = await testKubernetes({ mode: 'cluster' }, { connection: { url: api.url, token: 'tok' } });
    assert.deepEqual(ok, { ok: true, version: 'v1.30.2', services: 1 });
    const refused = await testKubernetes({ mode: 'cluster' }, { connection: { url: api.url, token: 'nope' } });
    assert.match(refused.error, /401/);
  } finally {
    await api.close();
  }
  assert.match((await testKubernetes({ mode: 'disabled' })).error, /off/);
  assert.equal((await testKubernetes({ mode: 'default', kubeconfig: '/nonexistent/kubeconfig' }, { configDir: '/', env: {} })).ok, false);
});
