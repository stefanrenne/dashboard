// Icons: the names services, bookmarks, groups and widgets give (plex.svg, mdi-server, sh-plex,
// /icons/x.png, a URL) to the addresses the page loads.

const DASHBOARD_ICONS = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons';

const SIMPLE_ICONS = 'https://cdn.jsdelivr.net/npm/simple-icons@v13/icons';
const MDI_ICONS = 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg';
const SELFHST_ICONS = 'https://cdn.jsdelivr.net/gh/selfhst/icons';

/**
 * `plex.svg` / `plex.png` / `plex.webp` -> dashboard-icons CDN, a bare `plex` -> its png
 * (as in homepage), `si-plex` -> Simple Icons, `mdi-flask` -> Material Design Icons (both with
 * an optional colour, `mdi-flask-#f0d453`), `sh-plex` / `sh-plex.svg` -> selfh.st icons,
 * `/icons/x.svg` -> the config's icons folder, `http(s)://...` as is. Anything else has no image.
 */
export function resolveIcon(icon) {
  if (!icon) return null;
  if (/^https?:\/\//.test(icon) || icon.startsWith('/icons/')) return icon;
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
