// Connection tests of the settings page, on the saved config: a Kubernetes API (its version
// and how many services discovery finds) and a Proxmox node (its version, with the API token).
// Errors never carry a secret (the caller scrubs them too).

import http from 'node:http';
import https from 'node:https';
import { k8sGet, discoverKubernetes } from '../discovery/kubernetes.js';
import { k8sConnection } from '../discovery/kubeconfig.js';

/** { ok, version, services } or { ok: false, error } for kubernetes.yaml's config. */
export async function testKubernetes(config, { configDir, env, connection = null, timeoutMs = 5000 } = {}) {
  if (!['cluster', 'default'].includes(config?.mode)) return { ok: false, error: 'discovery is off (mode: disabled)' };
  try {
    const conn = connection ?? k8sConnection(config, { configDir, env });
    const version = await k8sGet('/version', { connection: conn, timeoutMs });
    const services = await discoverKubernetes({ config, connection: conn });
    return { ok: true, version: version?.gitVersion ?? null, services: services.length };
  } catch (err) {
    return { ok: false, error: err.code === 'ENOENT' ? `no ${err.path ?? 'file'} (no service account or kubeconfig here)` : err.message };
  }
}

/** { ok, version } or { ok: false, error } for one proxmox.yaml node { url, token, secret, insecure }. */
export function testProxmox(node, { timeoutMs = 5000 } = {}) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(`${String(node.url).replace(/\/+$/, '')}/api2/json/version`);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('expected an http(s) URL');
    } catch (err) {
      resolve({ ok: false, error: `url: ${err.message}` });
      return;
    }
    const secure = url.protocol === 'https:';
    const req = (secure ? https : http).request(url, {
      headers: { authorization: `PVEAPIToken=${node.token}=${node.secret}`, accept: 'application/json' },
      timeout: timeoutMs,
      ...(secure && node.insecure ? { rejectUnauthorized: false } : {}),
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode === 401) return resolve({ ok: false, error: 'the token or its secret is not accepted (401)' });
        if (res.statusCode !== 200) return resolve({ ok: false, error: `Proxmox answered ${res.statusCode}` });
        try {
          resolve({ ok: true, version: JSON.parse(Buffer.concat(chunks).toString())?.data?.version ?? null });
        } catch {
          resolve({ ok: false, error: 'not a Proxmox API answer' });
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error(`no answer within ${timeoutMs} ms`)));
    req.on('error', (err) => resolve({ ok: false, error: /self.signed|certificate/i.test(err.message) ? `${err.message} (tick "Accept a self-signed certificate")` : err.message }));
    req.end();
  });
}
