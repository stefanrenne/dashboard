// The values the config files accept, in one place. load.js checks the files against them, the
// settings page and the setup wizard offer them (/api/settings sends them to the page), and the
// rest of the server reads them from here.

// the folder in the config folder where the dashboard keeps the widget packages it installs
export const PLUGINS_DIR = 'plugins';
export const CONFIG_FILES = ['settings', 'services', 'widgets', 'bookmarks', 'docker', 'kubernetes', 'proxmox'];
// the page's own CSS and JavaScript in the config folder (homepage's)
export const CUSTOM_FILES = ['custom.css', 'custom.js'];
// homepage's files that are taken over as they are (setup wizard, import on the settings page)
export const HOMEPAGE_FILES = ['services.yaml', 'settings.yaml', 'bookmarks.yaml', 'widgets.yaml', 'docker.yaml'];

// older names settings.yaml may still use (homepage's), and the language they mean
export const LANGUAGE_ALIASES = { 'zh-CN': 'zh-Hans' };
export const LANGUAGES = ['en', 'nl', 'fr', 'de', 'es', 'ca', 'he', 'hr', 'hu', 'it', 'nb-NO', 'pt', 'ru', 'sv', 'vi', 'zh-Hans', 'zh-Hant'];
export const THEMES = ['auto', 'dark', 'light'];
export const COLORS = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
export const HEADER_STYLES = ['boxed', 'clean', 'underlined', 'boxedWidgets'];
export const CARD_STYLES = ['hairline'];
export const BLOCK_STYLES = ['refined'];
export const FONTS = ['plex', 'plexData'];
export const ICON_STYLES = ['gradient', 'theme'];
export const BOOKMARK_STYLES = ['icons'];
export const STATUS_STYLES = ['dot', 'basic'];
export const TARGETS = ['_blank', '_self', '_top'];
// a service's link can also call its address in the background, as a webhook
const SERVICE_TARGETS = [...TARGETS, 'hidden-iframe'];
export const CONFIRM_VALUES = ['password', 'always', 'none'];
const PROXMOX_TYPES = ['qemu', 'lxc'];
export const KUBERNETES_MODES = ['disabled', 'cluster', 'default'];
export const SEARCH_PROVIDERS = ['google', 'duckduckgo', 'bing', 'baidu', 'brave', 'startpage', 'custom'];
export const BUTTON_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
// a group's arrangement in settings.yaml's layout (none: side by side, as homepage does)
export const GROUP_STYLES = ['row', 'column'];
export const HIGHLIGHT_LEVELS = ['good', 'warn', 'danger'];
// Tailwind's backdrop-blur steps, in pixels ('' is Tailwind's plain `blur`)
export const BLUR_PX = { none: 0, xs: 4, sm: 8, '': 8, md: 12, lg: 16, xl: 24, '2xl': 40, '3xl': 64 };
export const BLURS = Object.keys(BLUR_PX).filter(Boolean);
export const MAX_GROUP_COLUMNS = 8;
// settings.yaml background: the highest percentage of each
export const BACKGROUND_MAX = { saturate: 200, brightness: 200, opacity: 100 };
// a yes/no that can be left out ('': the default)
export const TRISTATE = ['', 'true', 'false'];
// a tab's keys in settings.yaml `tabs:` (a tab can also be just its name)
export const TAB_KEYS = ['name', 'icon', 'default'];
// a group's own `columns:` in settings.yaml layout
export const MAX_COLUMNS_IN_GROUP = 12;

// the shortest a duration setting may be (a shorter one is raised to it, with a warning)
export const MIN_DURATIONS = { loginRemember: '1m', discoveryInterval: '5s', pluginUpdateInterval: '1m' };

export const DEFAULTS = {
  kubernetesMode: 'disabled',
  title: 'Homelab',
  favicon: 'dashboard.svg', // Dashboard's own icon on dashboard-icons
  language: 'en',
  theme: 'auto',
  color: 'slate',
  headerStyle: 'boxed',
  target: '_blank',
  iconStyle: 'gradient',
  loginRemember: '7d',
  actionsRemember: '15m',
  pluginUpdateInterval: '1h',
  discoveryInterval: '30s',
};

// A service's own keys and what each takes: text, one of a list, a switch (boolean), homepage's
// `external: "true"` (flag), a number, or a filter expression. widget/widgets are read on their own.
export const SERVICE_FIELDS = {
  href: 'text', icon: 'text', description: 'text', siteMonitor: 'text', ping: 'text', container: 'text', server: 'text',
  target: SERVICE_TARGETS, statusStyle: STATUS_STYLES, showStats: 'boolean', weight: 'number', filter: 'filter',
  confirm: CONFIRM_VALUES, proxmoxNode: 'text', proxmoxVMID: 'text', proxmoxType: PROXMOX_TYPES,
  app: 'text', namespace: 'text', podSelector: 'text', external: 'flag',
};

// the Docker API's port when docker.yaml gives a host without one
export const DOCKER_PORT = 2375;

// a full http(s) URL, as settings.yaml `base` takes it
export const HTTP_URL = /^https?:\/\/[^\s"<>]+$/;

// a bookmark's fields (all text) besides its name; href is required
export const BOOKMARK_FIELDS = ['href', 'abbr', 'icon', 'description'];

// settings.yaml's security: kept as it is when homepage's settings.yaml is imported, and the
// admin password changes only with the current one (never through a file on the settings page)
export const SECURITY_KEYS = ['adminPassword', 'login', 'allowedHosts', 'actions'];

export const MIN_PASSWORD = 8;
// scrypt:N:r:p:salt:hash, as src/hash-password.mjs prints (no $, which Docker Compose would read)
export const SCRYPT_HASH = /^scrypt:(\d+):(\d+):(\d+):([A-Za-z0-9+/=]+):([A-Za-z0-9+/=]+)$/;

/**
 * What the settings page takes from here besides settings.yaml's fields (form.js formForPage):
 * the choices of the service and group forms, and the limits it shows. For /api/settings.
 */
export function schemaForPage() {
  return {
    statusStyles: STATUS_STYLES, serviceTargets: SERVICE_TARGETS, confirm: CONFIRM_VALUES, proxmoxTypes: PROXMOX_TYPES,
    groupStyles: GROUP_STYLES, maxColumnsInGroup: MAX_COLUMNS_IN_GROUP, minPassword: MIN_PASSWORD, homepageFiles: HOMEPAGE_FILES,
  };
}
