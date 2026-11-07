// Small helpers shared by the server modules.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const UNITS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Parses `500ms`, `10s`, `5m`, `1h` or a number of seconds into milliseconds. */
export function parseDuration(value, fallbackMs) {
  if (value === undefined || value === null || value === '') return fallbackMs;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value * 1000;
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)$/.exec(String(value).trim());
  if (!match) throw new Error(`invalid duration "${value}" (use e.g. 500ms, 10s, 5m, 1h, 7d)`);
  return Number(match[1]) * UNITS[match[2]];
}

/** A short, stable id derived from the given parts. */
export function stableId(prefix, ...parts) {
  return prefix + '-' + createHash('sha1').update(parts.join('\u0000')).digest('hex').slice(0, 10);
}

/** Resolves `rel` inside `root`; returns null if the result would escape `root`. */
export function safeJoin(root, rel) {
  const resolved = path.resolve(root, '.' + path.sep + rel);
  const base = path.resolve(root);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null;
  return resolved;
}

/**
 * Whether `file`, with every symlink resolved, is still inside `root` (itself resolved): a symlink
 * in a widget's assets/ or in icons/ must not serve what it points to elsewhere.
 */
export async function realInside(root, file) {
  try {
    const [base, real] = await Promise.all([fs.promises.realpath(root), fs.promises.realpath(file)]);
    return real === base || real.startsWith(base + path.sep);
  } catch {
    return false;
  }
}

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Shorter values are no secret worth hiding (and would garble every message they occur in).
export const MIN_SECRET_LENGTH = 3;

/** `text` with every known secret value replaced by ***. */
export function scrub(text, secrets = []) {
  let out = String(text);
  for (const s of secrets) if (typeof s === 'string' && s.length >= MIN_SECRET_LENGTH) out = out.split(s).join('***');
  return out;
}

/** Writes `file` in one step: a temporary file next to it, then a rename (a reader never sees half of it). */
export function writeAtomic(file, text, options = {}) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text, options);
  fs.renameSync(tmp, file);
}
