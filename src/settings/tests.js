// Connection tests of the settings page, on the saved config: a Kubernetes API (its version
// and how many services discovery finds) and a Proxmox node (its version, with the API token).
// Errors never carry a secret (the caller scrubs them too).

import { k8sGet, discoverKubernetes, kubernetesOn } from '../discovery/kubernetes.js';
import { k8sConnection } from '../discovery/kubeconfig.js';
import { getJson } from '../http.js';

/** { ok, version, services } or { ok: false, error } for kubernetes.yaml's config. */
export async function testKubernetes(config, { configDir, env, connection = null, timeoutMs = 5000 } = {}) {
  if (!kubernetesOn(config)) return { ok: false, error: 'discovery is off (mode: disabled)' };
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
export async function testProxmox(node, { timeoutMs = 5000 } = {}) {
  let url;
  try {
    url = new URL(`${String(node.url).replace(/\/+$/, '')}/api2/json/version`);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('expected an http(s) URL');
  } catch (err) {
    return { ok: false, error: `url: ${err.message}` };
  }
  try {
    const out = await getJson({ url, headers: { authorization: `PVEAPIToken=${node.token}=${node.secret}` }, tls: node.insecure ? { rejectUnauthorized: false } : {}, timeoutMs, name: 'Proxmox' });
    return { ok: true, version: out?.data?.version ?? null };
  } catch (err) {
    if (err.status === 401) return { ok: false, error: 'the token or its secret is not accepted (401)' };
    return { ok: false, error: /self.signed|certificate/i.test(err.message) ? `${err.message} (tick "Accept a self-signed certificate")` : err.message };
  }
}
