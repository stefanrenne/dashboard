// Watches the config directory and calls `onChange` (debounced) when a YAML file changes,
// also in subfolders (for files pulled in with !include). plugins/ is skipped: the dashboard
// writes plugins.lock.yaml there itself. On network file systems (NFS, SMB) fs.watch sees no
// changes made elsewhere; `pollMs` (DASHBOARD_WATCH_POLL) compares the files' size and time instead.
// When fs.watch cannot start at all, polling every 5 seconds takes over.
//
// Each folder gets a watcher of its own, not one recursive watcher: Node's recursive watching on
// Linux follows the files themselves, and a file replaced as a whole (written next to it, then
// renamed over it, as the settings page and most editors save) was not seen any more after its
// first change. A folder's watcher sees every change in it, whatever happens to its files.

import fs from 'node:fs';
import path from 'node:path';
import { PLUGINS_DIR } from './schema.js';

export function isConfigChange(filename) {
  if (!filename) return true;
  const parts = String(filename).split(/[\\/]/);
  return /\.ya?ml$/.test(parts.at(-1)) && parts[0] !== PLUGINS_DIR;
}

const FALLBACK_POLL_MS = 5000;

function snapshot(dir, rel = '') {
  let entries;
  try {
    entries = fs.readdirSync(rel ? `${dir}/${rel}` : dir, { withFileTypes: true });
  } catch {
    return '';
  }
  const out = [];
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const name = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!rel && e.name === PLUGINS_DIR) continue;
      out.push(snapshot(dir, name));
    } else if (isConfigChange(name)) {
      try {
        const st = fs.statSync(`${dir}/${name}`);
        out.push(`${name} ${st.size} ${st.mtimeMs}`);
      } catch { /* removed meanwhile */ }
    }
  }
  return out.filter(Boolean).join('\n');
}

function poll(dir, onChange, ms) {
  let last = snapshot(dir);
  const timer = setInterval(() => {
    const now = snapshot(dir);
    if (now !== last) {
      last = now;
      onChange();
    }
  }, ms);
  timer.unref?.();
  return { close: () => clearInterval(timer) };
}

/** The folders under `dir` to watch, relative (plugins/ and hidden ones such as .history/ left out). */
function folders(dir, rel = '') {
  let entries;
  try {
    entries = fs.readdirSync(rel ? path.join(dir, rel) : dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !(!rel && e.name === PLUGINS_DIR))
    .flatMap((e) => {
      const name = rel ? `${rel}/${e.name}` : e.name;
      return [name, ...folders(dir, name)];
    });
}

export function watchConfig(dir, onChange, { debounceMs = 300, pollMs = 0, log = console } = {}) {
  if (pollMs > 0) return poll(dir, onChange, pollMs);
  let timer = null;
  const watchers = new Map(); // relative folder ('' is dir) -> FSWatcher
  const changed = (rel) => {
    if (!isConfigChange(rel)) return;
    clearTimeout(timer);
    timer = setTimeout(onChange, debounceMs);
  };
  // a watcher per folder there is now: new folders get one, removed ones lose theirs
  const sync = () => {
    const want = new Set(['', ...folders(dir)]);
    for (const [rel, w] of watchers) {
      if (!want.has(rel)) {
        w.close();
        watchers.delete(rel);
      }
    }
    for (const rel of want) {
      if (watchers.has(rel)) continue;
      let w;
      try {
        w = fs.watch(rel ? path.join(dir, rel) : dir, (event, filename) => {
          if (event === 'rename') sync();
          changed(filename ? (rel ? `${rel}/${filename}` : String(filename)) : null);
        });
      } catch (err) {
        if (!rel) throw err;
        continue; // a folder removed meanwhile
      }
      w.on('error', () => {
        w.close();
        watchers.delete(rel);
      });
      watchers.set(rel, w);
    }
  };
  try {
    sync();
  } catch (err) {
    for (const w of watchers.values()) w.close();
    log.warn(`config: cannot watch ${dir} (${err.code || err.message}); checking for changes every ${FALLBACK_POLL_MS / 1000} s instead`);
    return poll(dir, onChange, FALLBACK_POLL_MS);
  }
  return {
    close() {
      clearTimeout(timer);
      for (const w of watchers.values()) w.close();
      watchers.clear();
    },
  };
}
