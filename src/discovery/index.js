// Polls the discovery sources and merges what they find into the YAML services.

import { discoverDocker } from './docker.js';
import { discoverKubernetes, kubernetesOn } from './kubernetes.js';
import { normalizeService } from '../config/load.js';
import { substitute, variablesIn } from '../config/vars.js';
import { parseDuration } from '../util.js';

export class Discovery {
  constructor({ log = console, onChange = () => {}, docker = discoverDocker, kubernetes = discoverKubernetes, env = process.env } = {}) {
    this.log = log;
    this.env = env;
    this.secrets = new Set();
    this.onChange = onChange;
    this.sources = { docker, kubernetes };
    this.found = [];
    this.errors = [];
    this.timer = null;
    this.signature = '';
  }

  /** (Re)configures from the loaded config and runs a first poll. */
  async configure(config) {
    this.stop();
    this.config = config;
    this.intervalMs = parseDuration(config.settings.discovery?.interval, 30_000);
    await this.poll();
    if (this.#enabled()) this.timer = setInterval(() => this.poll().catch((err) => this.log.warn(`discovery: ${err.message}`)), this.intervalMs).unref();
  }

  #enabled() {
    return this.config.docker.some((s) => s.discover) || kubernetesOn(this.config.kubernetes);
  }

  async poll() {
    const found = [];
    const errors = [];
    for (const server of this.config.docker.filter((s) => s.discover)) {
      try {
        const withInstance = { ...server, instanceName: this.config.settings?.instanceName ?? null };
        const source = { file: 'docker.yaml', path: `${server.name}.allowVariables`, allow: server.allowVariables };
        found.push(...(await this.sources.docker(withInstance)).map((s) => ({ ...s, origin: `docker:${server.name}`, source })));
      } catch (err) {
        errors.push({ file: 'docker.yaml', path: server.implicit ? `${server.name} (the mounted ${server.socket})` : server.name, message: `discovery: ${err.message}` });
      }
    }
    if (kubernetesOn(this.config.kubernetes)) {
      try {
        const source = { file: 'kubernetes.yaml', path: 'allowVariables', allow: this.config.kubernetes.allowVariables };
        found.push(...(await this.sources.kubernetes({ config: this.config.kubernetes, instanceName: this.config.settings?.instanceName ?? null })).map((s) => ({ ...s, origin: 'kubernetes', source })));
      } catch (err) {
        errors.push({ file: 'kubernetes.yaml', path: 'mode', message: `discovery: ${err.message}` });
      }
    }
    // Labels may use {{DASHBOARD_VAR_*}} / {{HOMEPAGE_VAR_*}} only where the source's allowVariables
    // lists them: a label is written by whoever starts a container (or builds its image) and could
    // send the value anywhere. Substituted values are secrets (hard rule 1).
    const secrets = new Set();
    const kept = [];
    for (const { source, ...svc } of found) {
      const refused = variablesIn(svc.def).filter((name) => source.allow !== true && !(source.allow ?? []).includes(name));
      if (refused.length) {
        errors.push({ file: source.file, path: source.path, message: `discovery: "${svc.name}" is left out: its labels use ${refused.map((n) => `{{${n}}}`).join(', ')}, which allowVariables does not list` });
        continue;
      }
      const sub = substitute(svc.def, { env: this.env });
      svc.def = sub.value;
      for (const s of sub.secrets) secrets.add(s);
      kept.push(svc);
    }
    this.found = kept;
    this.errors = errors;
    this.secrets = secrets;
    const signature = JSON.stringify([kept, errors]);
    if (signature !== this.signature) {
      this.signature = signature;
      this.onChange();
    }
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }
}

/**
 * Merges discovered services into the YAML groups. YAML wins: a discovered service with
 * the same group and name as a YAML service is skipped. Within a group services are ordered
 * by weight, as in homepage: a YAML service weighs its `weight` or (its position + 1) × 100,
 * a discovered one its `weight` label or 0; ties go by name. Returns { groups, warnings }.
 */
export function mergeDiscovered(yamlGroups, found) {
  const weigh = (g) => ({
    ...g,
    services: g.services.map((s, i) => ({ ...s, weight: s.weight ?? (i + 1) * 100 })),
    groups: (g.groups ?? []).map(weigh),
  });
  const groups = yamlGroups.map(weigh);
  const warnings = [];
  const ctx = { error: (file, p, message) => warnings.push({ file, path: p, message }), warn: () => {} };
  for (const svc of found) {
    let group = groups.find((g) => g.name === svc.group);
    if (!group) {
      group = { name: svc.group, services: [], groups: [] };
      groups.push(group);
    }
    if (group.services.some((s) => s.name === svc.name)) continue;
    const service = normalizeService(svc.name, svc.def, svc.origin, svc.name, ctx);
    if (service) group.services.push({ ...service, weight: svc.weight ?? 0, discovered: svc.origin });
  }
  const order = (g) => {
    g.services.sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name));
    g.groups.forEach(order);
  };
  groups.forEach(order);
  return { groups, warnings };
}
