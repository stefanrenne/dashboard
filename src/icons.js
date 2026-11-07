// Icons: the names services, bookmarks, groups and widgets give (plex.svg, mdi-server, sh-plex,
// /icons/x.png, a URL, `dashboard`) to the addresses the page loads, and Dashboard's own mark,
// the favicon unless settings.favicon names another.

// The CSP allows data: images; its # is encoded, so the page never reads it as a mask marker.
export const MARK = `data:image/svg+xml,${encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" fill=\"#0ea5e9\"><rect x=\"6\" y=\"6\" width=\"16\" height=\"16\" rx=\"4\"/><rect x=\"26\" y=\"6\" width=\"16\" height=\"10\" rx=\"4\" opacity=\".55\"/><rect x=\"26\" y=\"20\" width=\"16\" height=\"22\" rx=\"4\"/><rect x=\"6\" y=\"26\" width=\"16\" height=\"16\" rx=\"4\" opacity=\".55\"/></svg>")}`;

const DASHBOARD_ICONS = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons';

const SIMPLE_ICONS = 'https://cdn.jsdelivr.net/npm/simple-icons@v13/icons';
const MDI_ICONS = 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg';
const SELFHST_ICONS = 'https://cdn.jsdelivr.net/gh/selfhst/icons';

/**
 * `plex.svg` / `plex.png` / `plex.webp` -> dashboard-icons CDN, a bare `plex` -> its png
 * (as in homepage), `si-plex` -> Simple Icons, `mdi-flask` -> Material Design Icons (both with
 * an optional colour, `mdi-flask-#f0d453`), `sh-plex` / `sh-plex.svg` -> selfh.st icons,
 * `/icons/x.svg` -> the config's icons folder, `http(s)://...` as is, `dashboard` -> Dashboard's own
 * mark (MARK). Anything else has no image.
 */
export function resolveIcon(icon) {
  if (!icon) return null;
  if (/^https?:\/\//.test(icon) || icon.startsWith('/icons/')) return icon;
  if (icon === 'dashboard') return MARK;
  // Single-colour icons (Material Design, Simple Icons) are drawn as a mask in the page; the
  // #dash-mask fragment says so, with an optional colour (homepage's mdi-name-#f0d453).
  const mono = /^(mdi|si)-([a-z0-9][a-z0-9-]*?)(?:-#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8}))?$/i.exec(icon);
  if (mono) {
    const base = mono[1] === 'mdi' ? MDI_ICONS : SIMPLE_ICONS;
    return `${base}/${mono[2].toLowerCase()}.svg#dash-mask${mono[3] ? `=${mono[3].toLowerCase()}` : ''}`;
  }
  const selfhst = /^sh-([a-z0-9][a-z0-9-]*)(?:\.(svg|png|webp))?$/.exec(icon);
  if (selfhst) return `${SELFHST_ICONS}/${selfhst[2] ?? 'png'}/${selfhst[1]}.${selfhst[2] ?? 'png'}`;
  const match = /^([a-z0-9][a-z0-9-]*)(?:\.(svg|png|webp))?$/.exec(icon);
  if (!match) return null;
  const ext = match[2] ?? 'png';
  return `${DASHBOARD_ICONS}/${ext}/${match[1]}.${ext}`;
}

/** An icon's address without the page's #dash-mask marker, and /icons/… relative (for settings.base). */
export const plainIcon = (icon) => resolveIcon(icon)?.split('#')[0].replace(/^\/icons\//, 'icons/') ?? null;
