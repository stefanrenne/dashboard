// Substitution of `{{DASHBOARD_VAR_*}}` and `{{DASHBOARD_FILE_*}}` placeholders in config values.
//
// DASHBOARD_VAR_NAME  -> the value of the environment variable DASHBOARD_VAR_NAME
// DASHBOARD_FILE_NAME -> the trimmed contents of the file whose path is in DASHBOARD_FILE_NAME
// HOMEPAGE_VAR_* and HOMEPAGE_FILE_* work the same, so a homepage config can be reused.
//
// Every substituted value is recorded in `secrets`, so the layout builder can keep
// them out of anything sent to the browser (hard rule 1).

import fs from 'node:fs';
import { isPlainObject } from '../util.js';

// DASHBOARD_VAR_X, HOMEPAGE_FILE_Y, ...: the environment variables the config may name
export const VARIABLE_NAME = /^(DASHBOARD|HOMEPAGE)_(VAR|FILE)_[A-Z0-9_]+$/;
const VARIABLE_PREFIX = /^(DASHBOARD|HOMEPAGE)_(VAR|FILE)_/;
const PLACEHOLDER = /\{\{\s*((?:DASHBOARD|HOMEPAGE)_(?:VAR|FILE)_[A-Z0-9_]+)\s*\}\}/g;

/** Whether `text` has a {{DASHBOARD_VAR_*}} (or _FILE_, HOMEPAGE_) placeholder: no secret itself. */
export const hasPlaceholder = (text) => typeof text === 'string' && text.search(PLACEHOLDER) !== -1;

/** Whether an environment variable is one the config may name (its value can be a secret). */
export const isConfigVariable = (name) => VARIABLE_PREFIX.test(name);
// `{{SOME_NAME}}`: looks like a variable but is not one the dashboard fills in, so it would reach
// the service as written (a wrong key or password). Templates such as Home Assistant's
// `{{ states.x }}` are lowercase and left alone.
const LOOKALIKE = /\{\{\s*([A-Z][A-Z0-9_]*)\s*\}\}/g;

/** The variable names (DASHBOARD_VAR_X, ...) whose placeholders appear in `value`. */
export function variablesIn(value) {
  const names = new Set();
  const walk = (node) => {
    if (typeof node === 'string') for (const [, name] of node.matchAll(PLACEHOLDER)) names.add(name);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (isPlainObject(node)) Object.values(node).forEach(walk);
  };
  walk(value);
  return [...names];
}

export function substitute(value, { env = process.env, readFile = (p) => fs.readFileSync(p, 'utf8') } = {}) {
  const secrets = new Set();
  const warnings = [];

  const replaceString = (str) => {
    for (const [whole, name] of str.matchAll(LOOKALIKE)) {
      if (isConfigVariable(name)) continue;
      // the old HD_VAR_/HD_FILE_ (or no prefix at all): say what to write instead
      const [, kind = 'VAR', rest] = /^(?:HD_|DASHBOARD_)?(?:(VAR|FILE)_)?(.*)$/.exec(name);
      const hint = `DASHBOARD_${kind}_${rest}`;
      warnings.push(`${whole} is not filled in: only {{DASHBOARD_VAR_*}} and {{DASHBOARD_FILE_*}} are. Write {{${hint}}} and set the environment variable ${hint}`);
    }
    return str.replace(PLACEHOLDER, (whole, name) => {
      const raw = env[name];
      if (raw === undefined) {
        warnings.push(`${whole} is used but ${name} is not set`);
        return whole;
      }
      let out = raw;
      if (/^(DASHBOARD|HOMEPAGE)_FILE_/.test(name)) {
        try {
          out = readFile(raw).trim();
        } catch (err) {
          warnings.push(`${whole}: cannot read ${raw} (${err.code || err.message})`);
          return whole;
        }
      }
      if (out !== '') secrets.add(out);
      return out;
    });
  };

  const walk = (node) => {
    if (typeof node === 'string') return replaceString(node);
    if (Array.isArray(node)) return node.map(walk);
    if (isPlainObject(node)) {
      const result = {};
      for (const [key, child] of Object.entries(node)) result[key] = walk(child);
      return result;
    }
    return node;
  };

  return { value: walk(value), secrets, warnings };
}
