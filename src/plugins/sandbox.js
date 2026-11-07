// Installed widgets' server.js runs in one worker thread with a memory limit, not in the
// dashboard's own event loop: a widget that loops forever or eats memory stops the worker, not
// the dashboard (hard rule 4). A call that does not end within a second after its timeout gets
// the worker restarted; the widgets in it lose their ctx.cache, nothing else. Built-in widgets
// run in the dashboard process. DASHBOARD_WIDGET_ISOLATION=off runs installed widgets there too.

import { Worker } from 'node:worker_threads';
import { isConfigVariable } from '../config/vars.js';

const WORKER_FILE = new URL('./worker.js', import.meta.url);
const DEFAULT_MEMORY_MB = 256;
const GRACE_MS = 1000;

// What the worker's process.env leaves out: the values behind {{DASHBOARD_VAR_*}} and
// {{DASHBOARD_FILE_*}} (and their paths). A widget gets those through ctx.options, for the
// instances the config gives them to, never all of them.
function workerEnv(env = process.env) {
  return Object.fromEntries(Object.entries(env).filter(([name]) => !isConfigVariable(name)));
}

export class WidgetSandbox {
  #worker = null;
  #calls = new Map(); // id -> { resolve, reject, log, timer }
  #seq = 0;

  constructor({ log = console, memoryMb = DEFAULT_MEMORY_MB, graceMs = GRACE_MS, file = WORKER_FILE, env = process.env } = {}) {
    this.log = log;
    this.env = workerEnv(env);
    this.memoryMb = memoryMb;
    this.graceMs = graceMs;
    this.file = file;
    this.restarts = 0;
  }

  #spawn() {
    const worker = new Worker(this.file, { env: this.env, resourceLimits: { maxOldGenerationSizeMb: this.memoryMb } });
    worker.unref();
    worker.on('message', (m) => {
      const call = this.#calls.get(m.id);
      if (m.type === 'log') return call?.log[m.level]?.(m.text);
      if (!call) return undefined;
      this.#settle(m.id);
      if (m.type === 'result') call.resolve(m.data);
      else call.reject(new Error(m.error));
      return undefined;
    });
    const gone = (why) => {
      if (this.#worker !== worker) return;
      this.#worker = null;
      for (const id of [...this.#calls.keys()]) {
        const call = this.#calls.get(id);
        this.#settle(id);
        call.reject(new Error(`the widget worker stopped (${why})`));
      }
    };
    worker.on('error', (err) => {
      this.log.warn(`widget worker: ${err.message}`);
      gone(err.code === 'ERR_WORKER_OUT_OF_MEMORY' ? `out of memory, the limit is ${this.memoryMb} MB` : err.message);
    });
    worker.on('exit', (code) => gone(`exit ${code}`));
    return worker;
  }

  #settle(id) {
    clearTimeout(this.#calls.get(id)?.timer);
    this.#calls.delete(id);
  }

  run({ url, instanceId, apiVersion = 2, options, params = {}, kind = 'fetch', configDir = null, signal, log }) {
    this.#worker ??= this.#spawn();
    const worker = this.#worker;
    const id = ++this.#seq;
    return new Promise((resolve, reject) => {
      this.#calls.set(id, { resolve, reject, log });
      const onAbort = () => {
        if (!this.#calls.has(id)) return;
        worker.postMessage({ type: 'abort', id, reason: signal.reason?.message ?? 'aborted' });
        // still busy after the grace time: stuck in a loop, so the worker goes
        this.#calls.get(id).timer = setTimeout(() => {
          if (!this.#calls.has(id)) return;
          this.log.warn(`widget worker: a widget did not stop after its timeout; restarting the worker`);
          this.restart('a widget did not stop after its timeout');
        }, this.graceMs);
      };
      if (signal?.aborted) onAbort();
      else signal?.addEventListener('abort', onAbort, { once: true });
      try {
        worker.postMessage({ type: 'run', id, url, instanceId, apiVersion, options, params, kind, configDir });
      } catch (err) {
        this.#settle(id);
        reject(new Error(`options cannot reach the widget worker (${err.message})`));
      }
    });
  }

  keep(ids) {
    this.#worker?.postMessage({ type: 'keep', ids: [...ids] });
  }

  restart(reason = 'restarted') {
    const worker = this.#worker;
    if (!worker) return;
    this.restarts++;
    for (const id of [...this.#calls.keys()]) {
      const call = this.#calls.get(id);
      this.#settle(id);
      call.reject(new Error(`the widget worker was restarted: ${reason}`));
    }
    this.#worker = null;
    worker.terminate();
  }

  close() {
    this.restart('closing');
  }
}
