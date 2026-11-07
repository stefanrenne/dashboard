// Suggestions for the icon fields of the settings page: the image files in the config folder's
// icons/ (two folders deep, at most 500) and the icons the config uses already.

import fs from 'node:fs';
import path from 'node:path';

const IMAGE = /\.(svg|png|webp|jpe?g|gif|ico)$/i;
const MAX = 500;

/** { local: ['/icons/…'], used: ['plex.svg', …] }, each sorted. */
export function iconSuggestions(configDir, config) {
  const local = [];
  const walk = (rel, depth) => {
    let names;
    try {
      names = fs.readdirSync(path.join(configDir, 'icons', rel), { withFileTypes: true });
    } catch {
      return; // no icons/ folder (or no such subfolder): nothing to suggest from it
    }
    for (const e of names) {
      if (local.length >= MAX) return;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory() && depth < 2 && !e.name.startsWith('.')) walk(r, depth + 1);
      else if (e.isFile() && IMAGE.test(e.name)) local.push(`/icons/${r}`);
    }
  };
  walk('', 0);
  const used = new Set();
  const add = (v) => typeof v === 'string' && v.trim() && used.add(v.trim());
  const groups = (list) => (list ?? []).forEach((g) => { g.services?.forEach((x) => add(x.icon)); groups(g.groups); });
  groups(config?.services);
  (config?.bookmarks ?? []).forEach((g) => g.bookmarks.forEach((b) => add(b.icon)));
  Object.values(config?.settings?.layout ?? {}).forEach((l) => add(l?.icon));
  return { local: local.sort(), used: [...used].sort() };
}
