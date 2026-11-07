// Docker discovery: containers with a `dashboard.name` label become services. Containers
// labelled for homepage (`homepage.name` + `homepage.group`) work too, so an existing
// setup carries over. Only GET calls on the Docker API (hard rule 9).

import fs from 'node:fs';
import { serviceFromLabels } from './labels.js';
import { getJson } from '../http.js';

export const DEFAULT_SOCKET = '/var/run/docker.sock';
const LABEL_PREFIX = 'dashboard.';
export const HOMEPAGE_PREFIX = 'homepage.';

/**
 * With no servers in docker.yaml, a socket mounted at `socket` is used as the server `local`,
 * so mounting /var/run/docker.sock is all it takes. `socket: null` turns this off.
 */
export function withMountedSocket(servers, socket = DEFAULT_SOCKET, exists = fs.existsSync) {
  if (servers.length > 0 || !socket || !exists(socket)) return servers;
  return [{ name: 'local', socket, discover: true, implicit: true }];
}

export function dockerGet(server, path, { timeoutMs = 5000 } = {}) {
  return server.url
    ? getJson({ url: new URL(path, server.url), tls: server.tls ?? {}, timeoutMs, name: 'Docker API' })
    : getJson({ socketPath: server.socket || DEFAULT_SOCKET, path, timeoutMs, name: 'Docker API' });
}

/** Pure mapping from `GET /containers/json` output to discovered services. */
export function servicesFromContainers(containers, server) {
  const out = [];
  for (const c of containers) {
    const labels = c.Labels ?? {};
    // homepage only discovers containers that have both a name and a group.
    const svc = labels[LABEL_PREFIX + 'name']
      ? serviceFromLabels(labels, LABEL_PREFIX, server.instanceName)
      : labels[HOMEPAGE_PREFIX + 'group']
        ? serviceFromLabels(labels, HOMEPAGE_PREFIX, server.instanceName)
        : null;
    if (!svc) continue;
    const container = (c.Names?.[0] ?? '').replace(/^\//, '');
    svc.group ??= 'Docker';
    svc.def.container ??= container;
    svc.def.server ??= server.name;
    out.push(svc);
  }
  return out;
}

/**
 * A Swarm's services (`docker service ls`) in the shape of containers: the service labels
 * (compose `deploy.labels`) and the service name, as in homepage.
 */
function containersFromSwarmServices(services) {
  return services.map((s) => ({ Labels: s.Spec?.Labels ?? {}, Names: [s.Spec?.Name ?? ''] }));
}

export async function discoverDocker(server) {
  // Docker's label filter is AND-only, so both prefixes are matched here instead.
  if (server.swarm) return servicesFromContainers(containersFromSwarmServices(await dockerGet(server, '/services')), server);
  const containers = await dockerGet(server, '/containers/json?all=1');
  return servicesFromContainers(containers, server);
}

export async function checkDocker({ servers, get }) {
  return Promise.all(servers.map(async (s) => {
    const target = s.socket ?? s.url;
    try {
      const version = await get(s, '/version');
      const containers = await get(s, '/containers/json');
      return { name: s.name, target, ok: true, version: version?.Version ?? null, containers: Array.isArray(containers) ? containers.length : 0 };
    } catch (err) {
      return { name: s.name, target, ok: false, error: err.message, permission: /EACCES|EPERM/.test(String(err.code ?? err.message)) };
    }
  }));
}
