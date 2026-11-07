// The dashboard page (public/index.html) with the parts of settings.yaml that must be in the
// HTML itself, for browsers and crawlers that do not run the page's script: the title, the
// meta description, the favicon and the web app manifest (site.webmanifest). Values are
// HTML-escaped and secrets (values filled in from {{DASHBOARD_VAR_*}}) are replaced by ***
// (hard rule 1); nothing else is templated.

import fs from 'node:fs';
import { MARK, plainIcon } from './icons.js';
import { scrub, escapeHtml } from './util.js';


// Shade 800 of each colour palette, as the dark theme shows it: the manifest's theme and
// background colour. The palettes are written once, in the pages' public/common.js.
const COMMON_JS = fs.readFileSync(new URL('../public/common.js', import.meta.url), 'utf8');
const SHADE_800 = Object.fromEntries([.../const PALETTES = \{([\s\S]*?)\n\};/.exec(COMMON_JS)[1].matchAll(/(\w+): '([^']+)'/g)].map(([, name, shades]) => [name, shades.split(' ')[8]]));




export function renderIndex(html, settings, secrets = new Set(), custom = [], nonce = null) {
  const clean = (value) => escapeHtml(scrub(value, secrets));
  const head = [];
  // settings.base first, so every relative URL after it resolves under it
  if (settings.base) head.push(`<base href="${clean(settings.base)}">`);
  head.push('<link rel="manifest" href="site.webmanifest">');
  if (settings.disableIndexing === true) head.push('<meta name="robots" content="noindex, nofollow">');
  if (settings.description) head.push(`<meta name="description" content="${clean(settings.description)}">`);
  const favicon = plainIcon(settings.favicon);
  head.push(favicon ? `<link rel="icon" href="${clean(favicon)}">` : `<link rel="icon" type="image/svg+xml" href="${MARK}">`);
  // custom.css / custom.js from the config folder, after the page's own style and script
  const tail = [];
  if (custom.includes('custom.css')) head.push('<link rel="stylesheet" href="custom.css">');
  if (custom.includes('custom.js')) tail.push('<script src="custom.js" defer></script>');
  return html
    // the page's own inline script: the CSP allows it by this nonce only (http.js securityHeaders)
    .replace('<script>', nonce ? `<script nonce="${nonce}">` : '<script>')
    .replace(/<title>[^<]*<\/title>/, `<title>${clean(settings.title)}</title>`)
    .replace('</head>', head.map((line) => `${line}\n`).join('') + '</head>')
    .replace('</body>', tail.map((line) => `${line}\n`).join('') + '</body>');
}

/** The web app manifest: installable as an app, with the icons and shortcuts of `pwa:`. */
export function renderManifest(settings, secrets = new Set()) {
  const text = (value) => scrub(value, secrets);
  const color = SHADE_800[settings.color] ?? SHADE_800.slate;
  const favicon = plainIcon(settings.favicon);
  const icons = settings.pwa?.icons?.length
    ? settings.pwa.icons.map((i) => ({ ...i, src: text(plainIcon(i.src) ?? i.src) }))
    : [{ src: favicon ? text(favicon) : MARK, sizes: 'any', ...(favicon ? {} : { type: 'image/svg+xml' }) }];
  return {
    name: text(settings.title),
    short_name: text(settings.title),
    ...(settings.description ? { description: text(settings.description) } : {}),
    start_url: text(settings.startUrl ?? '/'),
    display: 'standalone',
    theme_color: color,
    background_color: color,
    icons,
    ...(settings.pwa?.shortcuts?.length
      ? { shortcuts: settings.pwa.shortcuts.map((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, text(v)]))) }
      : {}),
  };
}

/** robots.txt: everything allowed, or nothing with disableIndexing (as in homepage). */
export function renderRobots(settings) {
  return settings.disableIndexing === true ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n';
}
