// Docker discovery: containers with a `dashboard.name` label become services. Containers
// labelled for homepage (`homepage.name` + `homepage.group`) work too, so an existing
// setup carries over. Only GET calls on the Docker API (hard rule 9).

import fs from 'node:fs';
import { serviceFromLabels } from './labels.js';
import { getJson } from '../http.js';

export const DEFAULT_SOCKET = '/var/run/docker.sock';
const LABEL_PREFIX = 'dashboard.';
// the name of a server on a socket that has no name of its own
export const LOCAL_NAME = 'local';
export const HOMEPAGE_PREFIX = 'homepage.';

/**
 * With no servers in docker.yaml, a socket mounted at `socket` is used as the server `local`,
 * so mounting /var/run/docker.sock is all it takes. `socket: null` turns this off.
 */
export function withMountedSocket(servers, socket = DEFAULT_SOCKET, exists = fs.existsSync) {
  if (servers.length > 0 || !socket || !exists(socket)) return servers;
  return [{ name: LOCAL_NAME, socket, discover: true, implicit: true }];
}

export function dockerGet(server, path, { timeoutMs = 5000 } = {}) {
  return server.url
    ? getJson({ url: new URL(path, server.url), tls: server.tls ?? {}, timeoutMs, name: 'Docker API' })
    : getJson({ socketPath: server.socket || DEFAULT_SOCKET, path, timeoutMs, name: 'Docker API' });
}

/**
 * The label prefix a container is discovered by, or null: dashboard.name, or homepage's
 * homepage.group (homepage only discovers containers that have a group).
 */
export function discoveredBy(labels) {
  if (labels[LABEL_PREFIX + 'name']) return LABEL_PREFIX;
  return labels[HOMEPAGE_PREFIX + 'group'] ? HOMEPAGE_PREFIX : null;
}

/** Pure mapping from `GET /containers/json` output to discovered services. */
export function servicesFromContainers(containers, server) {
  const out = [];
  for (const c of containers) {
    const labels = c.Labels ?? {};
    const prefix = discoveredBy(labels);
    const svc = prefix ? serviceFromLabels(labels, prefix, server.instanceName) : null;
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
