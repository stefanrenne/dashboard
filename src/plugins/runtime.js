// Runs the server part of widget instances: builds `ctx`, enforces the timeout,
// caches results per instance and keeps failures inside the widget (hard rule 4).

import http from 'node:http';
import https from 'node:https';
import { highlightBlocks } from '../highlight.js';
import { scrub } from '../util.js';
import { validateOptions } from './options.js';

const DEFAULT_TIMEOUT_MS = 10_000;
// the most an action may take; a widget keeps its own, shorter limit (the button's `timeout`)
export const ACTION_TIMEOUT_MS = 60 * 60 * 1000;
const ACTION_OUTPUT_MAX = 64 * 1024;
// After an action, the other instances on its card answer fresh for a while (the page asks right
// away, after 5 and after 30 seconds): their results are kept this short meanwhile.
const SETTLE_MS = 35_000;
const SETTLE_CACHE_MS = 4_000;
// Fresh runs with params a minute, per instance: a visitor who varies them (a weather widget's
// coordinates) cannot make unlimited calls on the user's API key.
export const PARAM_RUNS_PER_MINUTE = 30;
const BLOCK_STATUSES = ['ok', 'warn', 'error', 'unknown'];
const SERVICE_STATUSES = ['up', 'down', 'warn', 'unknown'];
const ROW_ICONS = ['play', 'pause'];

export class WidgetRuntime {
  /**
   * `sandbox` (a WidgetSandbox) runs installed widgets in a worker thread; null runs them here.
   * `configDir` reaches widgets as ctx.configDir.
   */
  constructor({ registry, timeoutMs = DEFAULT_TIMEOUT_MS, actionTimeoutMs = ACTION_TIMEOUT_MS, configDir = null, log = console, now = Date.now, sandbox = null }) {
    this.registry = registry;
    this.sandbox = sandbox;
    this.timeoutMs = timeoutMs;
    this.actionTimeoutMs = actionTimeoutMs;
    this.configDir = configDir;
    this.secrets = []; // every known secret value (config and discovery), scrubbed from action results
    this.running = new Set(); // instanceIds with an action under way
    this.log = log;
    this.now = now;
    this.instances = new Map(); // instanceId -> { type, options, secretValues, refreshMs }
    this.cache = new Map(); // instanceId -> { result, expires }
    this.pending = new Map(); // instanceId -> Promise
    this.settling = new Map(); // instanceId -> { round, until }: refreshed after an action on its card
    this.stores = new Map(); // instanceId -> Map for ctx.cache
    this.paramRuns = new Map(); // instanceId -> times of the fresh runs with params in the last minute
    this.attributeWarnings = new Set(); // widget types already warned about an attribute they did not declare
  }

  setInstances(instances, registry = this.registry, secrets = this.secrets) {
    this.registry = registry;
    this.instances = instances;
    this.secrets = [...secrets];
    this.cache.clear();
    this.settling.clear();
    this.paramRuns.clear();
    for (const id of this.stores.keys()) if (!instances.has(id)) this.stores.delete(id);
    this.sandbox?.keep(instances.keys());
  }

  /**
   * The result of an instance. `params` come from the page (a client.js asked for them): only
   * the names the widget declares in widget.yaml `params`, as short text; each set of params
   * has its own cached result.
   */
  async get(instanceId, params = {}) {
    const instance = this.instances.get(instanceId);
    if (!instance) return { ok: false, error: 'unknown widget instance' };
    const allowed = this.registry.get(instance.type)?.manifest.params ?? [];
    const clean = Object.fromEntries(allowed.filter((k) => typeof params[k] === 'string' && params[k] && params[k].length <= 100).sort().map((k) => [k, params[k]]));
    const key = Object.keys(clean).length ? `${instanceId}?${new URLSearchParams(clean)}` : instanceId;
    const cached = this.cache.get(key);
    if (cached && cached.expires > this.now()) return cached.result;
    if (this.pending.has(key)) return this.pending.get(key);
    if (key !== instanceId) {
      const since = this.now() - 60_000;
      const runs = (this.paramRuns.get(instanceId) ?? []).filter((t) => t > since);
      if (runs.length >= PARAM_RUNS_PER_MINUTE) return { ok: false, error: 'too many requests with other params; try again in a minute', fetchedAt: this.now() };
      runs.push(this.now());
      this.paramRuns.set(instanceId, runs);
    }
    const promise = this.#run(instanceId, instance, clean, key).finally(() => {
      if (this.pending.get(key) === promise) this.pending.delete(key);
    });
    this.pending.set(key, promise);
    return promise;
  }

  async #run(instanceId, instance, params = {}, key = instanceId) {
    const widget = this.registry.get(instance.type);
    const round = this.settling.get(instanceId)?.round ?? 0;
    let result;
    if (!widget) {
      result = { ok: false, error: `unknown widget type "${instance.type}"` };
    } else if (instance.errors?.length) {
      result = { ok: false, error: `invalid options: ${instance.errors.join('; ')}` };
    } else if (!widget.server) {
      result = { ok: true, data: null, fetchedAt: this.now() };
    } else {
      try {
        const data = await this.#call('fetch', instanceId, instance, widget, { params, timeoutMs: this.timeoutMs });
        const checked = checkData(data ?? {});
        const published = { ...blockAttributes(checked, widget.manifest.attributes), ...(checked.attributes ?? {}) };
        const { attributes, dropped } = selectAttributes(Object.keys(published).length ? published : checked.attributes, widget.manifest.attributes, instance.secretValues);
        if (dropped.length && !this.attributeWarnings.has(instance.type)) {
          this.attributeWarnings.add(instance.type);
          this.log.warn(`widget ${instance.type}: attributes not declared in widget.yaml, or of another type, are left out: ${dropped.join(', ')}`);
        }
        const selected = { ...selectFields(checked, instance.fields), attributes };
        if (attributes === undefined) delete selected.attributes;
        result = { ok: true, data: highlightBlocks(selected, instance.highlight, instance.type), fetchedAt: this.now() };
      } catch (err) {
        const message = scrub(describeError(err), instance.secretValues);
        this.log.warn(`widget ${instance.type} (${instanceId}): ${message}`);
        result = { ok: false, error: message, fetchedAt: this.now() };
      }
    }
    const settling = this.settling.get(instanceId);
    // a run that began before an action on the card ended may hold the old state: not kept
    if (this.instances.get(instanceId) === instance && (settling?.round ?? 0) === round) {
      if (this.cache.size > 500) for (const [k, v] of this.cache) if (v.expires <= this.now()) this.cache.delete(k);
      const keep = settling && settling.until > this.now() ? Math.min(instance.refreshMs, SETTLE_CACHE_MS) : instance.refreshMs;
      this.cache.set(key, { result, expires: this.now() + keep });
    }
    return result;
  }

  /**
   * Runs an instance's `action` (a button press): one at a time per instance, at most
   * actionTimeoutMs, every known secret scrubbed from what it returns. Never throws:
   * { ok: true, data: { status, output?, exitCode?, error? } } or { ok: false, error, busy?, missing? }.
   */
  async action(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) return { ok: false, missing: true, error: 'unknown widget instance' };
    const widget = this.registry.get(instance.type);
    if (!widget?.hasAction) return { ok: false, missing: true, error: 'this widget has no action' };
    if (instance.errors?.length) return { ok: false, error: `invalid options: ${instance.errors.join('; ')}` };
    if (this.running.has(instanceId)) return { ok: false, busy: true, error: 'already running' };
    this.running.add(instanceId);
    const secrets = [...instance.secretValues, ...this.secrets];
    try {
      const data = await this.#call('action', instanceId, instance, widget, { timeoutMs: this.actionTimeoutMs });
      return { ok: true, data: actionResult(data, secrets) };
    } catch (err) {
      const message = scrub(describeError(err), secrets);
      this.log.warn(`widget ${instance.type} (${instanceId}) action: ${message}`);
      return { ok: false, error: message };
    } finally {
      this.running.delete(instanceId);
      this.#settleCard(instanceId);
    }
  }

  /**
   * An action may have changed what the other instances on its card show (a button that
   * updates containers, next to the widget counting updates): their cached results go, and for
   * SETTLE_MS they are kept only SETTLE_CACHE_MS. Returns the ids of those instances.
   */
  #settleCard(instanceId) {
    const card = this.instances.get(instanceId)?.card;
    if (!card) return [];
    const now = this.now();
    const ids = [...this.instances].filter(([id, i]) => id !== instanceId && i.card === card).map(([id]) => id);
    for (const id of ids) {
      this.settling.set(id, { round: (this.settling.get(id)?.round ?? 0) + 1, until: now + SETTLE_MS });
      for (const k of [...this.cache.keys(), ...this.pending.keys()]) {
        if (k === id || k.startsWith(`${id}?`)) {
          this.cache.delete(k);
          this.pending.delete(k);
        }
      }
    }
    return ids;
  }

  #log(instance) {
    const prefix = `widget ${instance.type}:`;
    return {
      info: (...a) => this.log.info(prefix, ...a),
      warn: (...a) => this.log.warn(prefix, ...a),
      error: (...a) => this.log.error(prefix, ...a),
    };
  }

  async #call(kind, instanceId, instance, widget, { params = {}, timeoutMs }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`timed out after ${timeoutMs} ms`)), timeoutMs);
    const log = this.#log(instance);
    try {
      const isolated = this.sandbox && widget.source !== 'builtin' && widget.serverUrl;
      const call = isolated
        ? () => this.sandbox.run({ url: widget.serverUrl, instanceId, apiVersion: instance.apiVersion, options: structuredClone(instance.options), params, kind, configDir: this.configDir, signal: controller.signal, log })
        : () => {
          if (!this.stores.has(instanceId)) this.stores.set(instanceId, new Map());
          return widget.server[kind](widgetContext({ instanceId, apiVersion: instance.apiVersion, options: structuredClone(instance.options), params, signal: controller.signal, cache: this.stores.get(instanceId), configDir: this.configDir, log }));
        };
      return await Promise.race([
        Promise.resolve().then(call),
        new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason))),
      ]);
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
}

/** A widget's ctx (the widget API), the same in this process and in the worker. */
export function widgetContext({ instanceId, apiVersion, options, params = {}, signal, cache, configDir = null, log }) {
  return Object.freeze({
    apiVersion: apiVersion ?? 2,
    instanceId,
    options,
    params: Object.freeze({ ...params }),
    signal,
    cache,
    configDir,
    log,
    fetch: (input, init = {}) => widgetFetch(input, init, options.url, signal),
  });
}

/**
 * fetch() for widgets: relative URLs resolve against the `url` option, the call is
 * cancelled with the widget, and `socketPath` talks HTTP over a unix socket (Docker).
 */
export function widgetFetch(input, init, baseUrl, signal) {
  const merged = init.signal ? AbortSignal.any([signal, init.signal]) : signal;
  if (init.socketPath) return unixSocketFetch(String(input), { ...init, signal: merged });
  const url = baseUrl && !/^[a-z][a-z0-9+.-]*:/i.test(String(input)) ? new URL(String(input), baseUrl) : input;
  // insecure: true accepts a self-signed certificate for this request (an option the user sets);
  // tls: { ca, cert, key } (PEM text) trusts a CA and/or sends a client certificate (Docker over TLS)
  if ((init.insecure || init.tls) && new URL(String(url)).protocol === 'https:') return httpsFetch(new URL(String(url)), { ...init, signal: merged });
  const { insecure, tls, ...rest } = init;
  return fetch(url, { ...rest, signal: merged });
}

function httpsFetch(url, { method = 'GET', headers = {}, body, signal, insecure, tls }) {
  const { ca, cert, key } = tls ?? {};
  const certs = Object.fromEntries(Object.entries({ ca, cert, key }).filter(([, v]) => typeof v === 'string' && v));
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers: plainHeaders(headers), signal, ...certs, ...(insecure ? { rejectUnauthorized: false } : {}) }, (res) => resolve(collect(res)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function plainHeaders(headers) {
  return headers instanceof Headers ? Object.fromEntries(headers.entries()) : headers;
}

/** A Node response as a fetch Response; Set-Cookie stays a list (headers.getSetCookie()). */
function collect(res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      const status = res.statusCode ?? 500;
      const noBody = status === 204 || status === 304;
      resolve(new Response(noBody ? null : Buffer.concat(chunks), { status, headers: headerList(res.headers) }));
    });
    res.on('error', reject);
  });
}

function headerList(headers) {
  const out = [];
  for (const [k, v] of Object.entries(headers)) {
    if (v === undefined) continue;
    for (const one of Array.isArray(v) ? v : [v]) out.push([k, String(one)]);
  }
  return out;
}

function unixSocketFetch(pathAndQuery, { socketPath, method = 'GET', headers = {}, body, signal }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ socketPath, path: pathAndQuery, method, headers: { host: 'localhost', ...plainHeaders(headers) }, signal }, (res) => resolve(collect(res)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export function checkData(data) {
  if (typeof data !== 'object' || Array.isArray(data)) throw new Error('fetch() must return an object');
  if (data.status !== undefined && !SERVICE_STATUSES.includes(data.status)) {
    throw new Error(`status must be one of ${SERVICE_STATUSES.join(', ')}`);
  }
  if (data.statusText !== undefined && typeof data.statusText !== 'string') throw new Error('statusText must be text');
  if (data.rows !== undefined) {
    if (!Array.isArray(data.rows)) throw new Error('rows must be a list');
    data.rows.forEach((r, i) => {
      if (typeof r !== 'object' || r === null || typeof r.label !== 'string') throw new Error(`rows[${i}]: needs a "label"`);
      if (r.value !== undefined && r.value !== null && !['string', 'number'].includes(typeof r.value)) throw new Error(`rows[${i}]: value must be text, a number or null`);
      if (r.progress !== undefined && !(typeof r.progress === 'number' && r.progress >= 0 && r.progress <= 100)) throw new Error(`rows[${i}]: progress must be 0-100`);
      if (r.status !== undefined && !BLOCK_STATUSES.includes(r.status)) throw new Error(`rows[${i}]: unknown status "${r.status}"`);
      if (r.icon !== undefined && !ROW_ICONS.includes(r.icon)) throw new Error(`rows[${i}]: icon must be one of ${ROW_ICONS.join(', ')}`);
      checkVars(r.vars, `rows[${i}]`);
    });
  }
  if (data.blocks !== undefined) {
    if (!Array.isArray(data.blocks)) throw new Error('blocks must be a list');
    data.blocks.forEach((b, i) => {
      if (typeof b !== 'object' || b === null || typeof b.label !== 'string') throw new Error(`blocks[${i}]: needs a "label"`);
      if (b.value !== null && !['string', 'number'].includes(typeof b.value)) throw new Error(`blocks[${i}]: value must be text, a number or null`);
      if (b.status !== undefined && !BLOCK_STATUSES.includes(b.status)) throw new Error(`blocks[${i}]: unknown status "${b.status}"`);
      if (b.key !== undefined && typeof b.key !== 'string') throw new Error(`blocks[${i}]: key must be text`);
      checkVars(b.vars, `blocks[${i}]`);
    });
  }
  return data;
}

function checkVars(vars, where) {
  if (vars === undefined) return;
  if (typeof vars !== 'object' || vars === null || Array.isArray(vars)) throw new Error(`${where}: vars must be a map`);
  for (const [k, v] of Object.entries(vars)) {
    if (!['string', 'number'].includes(typeof v)) throw new Error(`${where}: vars.${k} must be text or a number`);
  }
}

/**
 * The attributes widget.yaml takes from the result itself (`from:`), before `fields` picks the
 * blocks: a block's value by its key (null when the widget left the block out), `@attention` (a
 * block or row marked warn or error), `@status` (the result's status) or `@rows` (how many rows).
 * What server.js returns in `attributes` wins.
 */
export function blockAttributes(data, schema) {
  const out = {};
  for (const [name, def] of Object.entries(schema ?? {})) {
    if (typeof def?.from !== 'string') continue;
    if (def.from === '@attention') {
      out[name] = [...(data.blocks ?? []), ...(data.rows ?? [])].some((x) => x?.status === 'warn' || x?.status === 'error');
    } else if (def.from === '@status') {
      out[name] = data.status ?? null;
    } else if (def.from === '@rows') {
      out[name] = Array.isArray(data.rows) ? data.rows.filter((r) => r?.label !== 'moreItems').length + (data.rows.find((r) => r?.label === 'moreItems')?.vars?.count ?? 0) : 0;
    } else {
      const block = (data.blocks ?? []).find((b) => (b.key ?? b.label) === def.from);
      out[name] = block ? block.value ?? null : null;
    }
  }
  return out;
}

/**
 * The attributes a result may publish: the names `schema` (widget.yaml `attributes:`) declares,
 * with a value of the declared type or null; strings with a secret value scrubbed. Returns
 * { attributes (undefined when none), dropped: names left out }.
 */
export function selectAttributes(attributes, schema, secretValues = []) {
  if (attributes === undefined || attributes === null) return { attributes: undefined, dropped: [] };
  if (typeof attributes !== 'object' || Array.isArray(attributes)) return { attributes: undefined, dropped: ['(not a map)'] };
  const out = {};
  const dropped = [];
  for (const [name, value] of Object.entries(attributes)) {
    const type = schema?.[name]?.type;
    if (!type || (value !== null && typeof value !== type) || (type === 'number' && value !== null && !Number.isFinite(value))) dropped.push(name);
    else out[name] = typeof value === 'string' ? scrub(value, secretValues) : value;
  }
  return { attributes: Object.keys(out).length ? out : undefined, dropped };
}

/** Keeps only the blocks named in `fields` (by `key`, else `label`), in the widget's order. */
function selectFields(data, fields) {
  if (!fields || !Array.isArray(data.blocks)) return data;
  return { ...data, blocks: data.blocks.filter((b) => fields.includes(b.key ?? b.label)) };
}

/**
 * The message of an error plus the low-level cause Node hides behind "fetch failed"
 * ("fetch failed (ECONNREFUSED)"), so the dashboard can tell "unreachable" from "wrong key".
 */
export function describeError(err) {
  const message = err?.message ?? String(err);
  const cause = err?.cause?.code ?? err?.cause?.errors?.[0]?.code ?? err?.cause?.message;
  return cause && !message.includes(cause) ? `${message} (${cause})` : message;
}

function actionResult(data, secrets = []) {
  const d = data && typeof data === 'object' ? data : {};
  const out = { status: d.status === 'ok' ? 'ok' : 'error' };
  if (d.output !== undefined && d.output !== null) {
    const text = scrub(String(d.output), secrets);
    out.output = text.length > ACTION_OUTPUT_MAX ? text.slice(-ACTION_OUTPUT_MAX) : text;
  }
  if (Number.isInteger(d.exitCode)) out.exitCode = d.exitCode;
  if (d.error !== undefined && d.error !== null) out.error = scrub(String(d.error), secrets).slice(0, 500);
  return out;
}


/**
 * Runs one widget of `runtime`'s registry once with `raw` options, as a test (the setup wizard,
 * the settings page): in a runtime of its own, so the dashboard's instances stay as they are, but
 * with the same sandbox (an installed widget runs in the worker, with its limits).
 * { ok, blocks (the first four) } or { ok: false, error }.
 */
export async function tryWidget(runtime, type, raw) {
  const widget = typeof type === 'string' ? runtime.registry.get(type) : null;
  if (!widget?.server) return { ok: false, error: `unknown widget "${String(type).slice(0, 40)}"` };
  const { options, errors } = validateOptions(widget.manifest.options, raw && typeof raw === 'object' ? raw : {}, new Set());
  if (errors.length) return { ok: false, error: errors.join('; ') };
  const secretValues = Object.entries(widget.manifest.options).filter(([k, d]) => d.secret && typeof options[k] === 'string' && options[k]).map(([k]) => options[k]);
  const rt = new WidgetRuntime({ registry: runtime.registry, log: runtime.log, timeoutMs: runtime.timeoutMs, configDir: runtime.configDir, sandbox: runtime.sandbox });
  // set, not setInstances: that would tell the worker to drop the dashboard's own instances
  const id = `try-${crypto.randomUUID()}`;
  rt.instances = new Map([[id, { type: widget.manifest.id, apiVersion: widget.manifest.apiVersion, options, secretValues, refreshMs: 1000, fields: null, highlight: null, errors: [] }]]);
  rt.secrets = secretValues;
  const r = await rt.get(id);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, blocks: (r.data?.blocks ?? []).slice(0, 4).map((b) => ({ label: b.label, value: b.value, unit: b.unit ?? null })) };
}
