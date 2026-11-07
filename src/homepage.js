// homepage's config files coming over (the setup wizard, Import on the settings page): which of
// the given files are homepage's, a dry run of what carries over, and keeping this dashboard's
// own security when homepage's settings.yaml replaces it.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { loadConfig } from './config/load.js';
import { HOMEPAGE_FILES, SECURITY_KEYS } from './config/schema.js';
import { parseDocument, documentText } from './config/edit.js';
import { mergeDiscovered } from './discovery/index.js';
import { buildState } from './layout.js';

export function homepageFiles(files) {
  const given = Object.fromEntries(Object.entries(files && typeof files === 'object' ? files : {}).filter(([k, v]) => HOMEPAGE_FILES.includes(k) && typeof v === 'string'));
  return Object.keys(given).length ? given : null;
}

/**
 * homepage's files loaded as the dashboard would, without writing them: { ok, files, services,
 * bookmarks, header, errors, warnings } — what carries over and what does not.
 */
export function homepageDryRun(files, { registry, env }) {
  const given = homepageFiles(files);
  if (!given) return { ok: false, error: `none of ${HOMEPAGE_FILES.join(', ')}` };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-import-'));
  try {
    for (const [name, text] of Object.entries(given)) fs.writeFileSync(path.join(dir, name), text);
    const config = loadConfig(dir, { env });
    const { layout } = buildState({ config, registry, groups: mergeDiscovered(config.services, []).groups, secrets: config.secrets });
    const services = [];
    const walk = (groups) => {
      for (const g of groups) {
        for (const s of g.services ?? []) services.push({ group: g.name, name: s.name, widgets: s.widgets.map((w) => w.type), unknown: s.widgets.filter((w) => !w.known).map((w) => w.type) });
        walk(g.groups ?? []);
      }
    };
    walk(layout.groups);
    const line = (m) => `${m.file}${m.path ? ` ${m.path}` : ''}: ${m.message}`;
    return { ok: true, files: Object.keys(given), services, bookmarks: layout.bookmarks.reduce((n, g) => n + g.bookmarks.length, 0), header: layout.header.length, errors: layout.messages.errors.map(line), warnings: layout.messages.warnings.map(line) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** homepage's settings.yaml text with this dashboard's security keys (SECURITY_KEYS) as `mine` has them. */
export function keepOwnSecurity(text, mine) {
  const doc = parseDocument(text, 'settings.yaml');
  const own = parseDocument(mine, 'settings.yaml');
  if (doc.contents === null) doc.contents = doc.createNode({});
  if (!YAML.isMap(doc.contents)) return text;
  for (const key of SECURITY_KEYS) {
    if (YAML.isMap(own.contents) && own.contents.has(key)) doc.contents.set(key, own.contents.get(key, true));
    else doc.contents.delete(key);
  }
  return documentText(doc);
}
