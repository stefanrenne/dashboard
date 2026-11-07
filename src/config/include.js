// `!include <file>` in the config files: the YAML of another file at that spot.
//
//   - Media: !include media.yaml        # media.yaml holds the group's list of services
//   - !include groups/network.yaml      # a list item whose file holds a list is spliced in
//
// Paths are relative to the file that has the include, must stay inside the config folder
// (checked on the resolved path) and end in .yaml or .yml. Includes nest up to MAX_DEPTH;
// a file that includes itself, directly or not, is reported. Problems never throw: each one
// becomes an error with the including file and the path to the include, and the value is
// left out (null for a map value, nothing for a list item).

import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { safeJoin, isPlainObject } from '../util.js';

export const MAX_DEPTH = 8;

class Include {
  constructor(file) {
    this.file = file;
  }
}

const YAML_OPTIONS = {
  prettyErrors: true,
  customTags: [{ tag: '!include', resolve: (value) => new Include(String(value).trim()) }],
};

/** YAML.parse that understands `!include`; includes come back as markers for resolveIncludes. */
export function parseConfigYaml(text) {
  return YAML.parse(text, YAML_OPTIONS);
}

const join = (p, key) => (typeof key === 'number' ? `${p}[${key}]` : p ? `${p}.${key}` : String(key));

/**
 * The file an include in `from` names: { name (relative to the config folder), full } or
 * { error }. Paths are relative to the including file, end in .yaml or .yml and stay inside the
 * config folder (checked on the resolved path).
 */
function includeTarget(configDir, from, inc) {
  if (!inc.file) return { error: 'expected a file name' };
  if (path.isAbsolute(inc.file)) return { error: 'use a path relative to this file, inside the config folder' };
  if (!/\.ya?ml$/i.test(inc.file)) return { error: 'only .yaml and .yml files can be included' };
  const full = safeJoin(configDir, path.join(path.dirname(from), inc.file));
  if (!full) return { error: 'outside the config folder' };
  return { name: path.relative(path.resolve(configDir), full).split(path.sep).join('/'), full };
}

/**
 * Replaces the includes in `value`, parsed from `file` (relative to `configDir`).
 * `errors` collects { file, path, message }. Returns the resolved value.
 */
export function resolveIncludes(value, { configDir, file, errors, stack = [file], overrides = {} }) {
  const load = (inc, at) => {
    const fail = (message) => {
      errors.push({ file, path: at, message: `!include ${inc.file}: ${message}` });
      return undefined;
    };
    const { name, full, error } = includeTarget(configDir, file, inc);
    if (error) return fail(error);
    if (stack.includes(name)) return fail(`includes itself (${[...stack, name].join(' → ')})`);
    if (stack.length > MAX_DEPTH) return fail(`more than ${MAX_DEPTH} includes deep`);
    let text = overrides[name];
    try {
      text ??= fs.readFileSync(full, 'utf8');
    } catch (err) {
      return fail(err.code === 'ENOENT' ? 'file not found' : `cannot read: ${err.code || err.message}`);
    }
    let parsed;
    try {
      parsed = parseConfigYaml(text);
    } catch (err) {
      const line = err.linePos?.[0]?.line;
      errors.push({ file: name, path: line ? `line ${line}` : '', message: err.message.split('\n')[0] });
      return fail('the file has a YAML error');
    }
    return resolveIncludes(parsed, { configDir, file: name, errors, stack: [...stack, name], overrides });
  };

  const walk = (node, at) => {
    if (node instanceof Include) return load(node, at) ?? null;
    if (Array.isArray(node)) {
      const out = [];
      node.forEach((item, i) => {
        if (!(item instanceof Include)) return out.push(walk(item, join(at, i)));
        const loaded = load(item, join(at, i));
        if (Array.isArray(loaded)) out.push(...loaded);
        else if (loaded !== undefined && loaded !== null) out.push(loaded);
      });
      return out;
    }
    if (isPlainObject(node)) {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v, join(at, k))]));
    }
    return node;
  };

  return walk(value, '');
}


/**
 * Every file the config files include, directly or not: [{ file, root, from, at }], where `root`
 * is the config file it ends up in, `from` the file with the include and `at` the path to the
 * include in the root's terms ('' for a whole file). Files that do not exist are left out.
 * `roots` are the config files, such as ['services.yaml', ...].
 */
export function listIncludes(configDir, roots) {
  const out = [];
  const visit = (root, from, value, at, stack) => {
    if (value instanceof Include) {
      const { name, error } = includeTarget(configDir, from, value);
      if (error || stack.includes(name) || stack.length > MAX_DEPTH) return;
      let parsed;
      try {
        parsed = parseConfigYaml(fs.readFileSync(path.join(configDir, name), 'utf8'));
      } catch {
        if (fs.existsSync(path.join(configDir, name))) out.push({ file: name, root, from, at });
        return;
      }
      if (!out.some((e) => e.file === name)) out.push({ file: name, root, from, at });
      visit(root, name, parsed, at, [...stack, name]);
    } else if (Array.isArray(value)) value.forEach((item, i) => visit(root, from, item, join(at, i), stack));
    else if (isPlainObject(value)) for (const [k, v] of Object.entries(value)) visit(root, from, v, join(at, k), stack);
  };
  for (const root of roots) {
    let parsed;
    try {
      parsed = parseConfigYaml(fs.readFileSync(path.join(configDir, root), 'utf8'));
    } catch {
      continue;
    }
    visit(root, root, parsed, '', [root]);
  }
  return out;
}
