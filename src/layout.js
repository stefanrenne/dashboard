// Builds the widget instances (server side) and the layout (sent to the browser).
//
// The layout only ever carries public options (hard rule 1); the instances keep the
// full options for the runtime.

import { validateOptions } from './plugins/options.js';
import { DEFAULT_REFRESH_MS } from './plugins/loader.js';
import { CORE_WIDGETS, DEFAULT_PLUGINS } from './plugins/installer.js';
import { stableId, parseDuration, isPlainObject, scrub, isSecretValue } from './util.js';
import { DEFAULT_LEVELS } from './highlight.js';
import { parseFilter, bindFilter, filterRefs } from './filter.js';
import { k8sConnection } from './discovery/kubeconfig.js';
import { resolveIcon } from './icons.js';
import { CONFIRM_VALUES, DEFAULTS } from './config/schema.js';

/**
 * Keys of a widget entry that belong to the dashboard, not to the widget (unless the
 * widget declares an option with that name): how often to refresh, which blocks to show
 * and whether to hide errors. `refreshInterval` (ms) and `hide_errors` are homepage's names.
 */
const INSTANCE_KEYS = ['refresh', 'refreshInterval', 'fields', 'hideErrors', 'hide_errors', 'highlight', 'provider', 'confirm'];

const MIN_REFRESH_MS = 1000;

function splitInstanceKeys(schema, raw) {
  const own = {};
  const options = {};
  for (const [key, value] of Object.entries(raw)) {
    if (INSTANCE_KEYS.includes(key) && !(key in schema)) own[key] = value;
    else options[key] = value;
  }
  return { own, options };
}

/** The origin of an http(s) URL, as a CSP source ("https://example.com:8443"), or null. */
function frameOrigin(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.origin : null;
  } catch {
    return null;
  }
}

const tlsOptions = ({ ca, cert, key }) => Object.fromEntries(Object.entries({ tlsCa: ca, tlsCert: cert, tlsKey: key }).filter(([, v]) => v));

export function buildState({ config, registry, groups, extraErrors = [], extraWarnings = [], secrets: knownSecrets = config.secrets, actionsProtected = false }) {
  // every value under settings.providers is a secret, also when written there literally
  const providers = isPlainObject(config.settings.providers) ? config.settings.providers : {};
  const secrets = new Set([...knownSecrets, ...stringsIn(providers)]);
  const instances = new Map();
  const actions = new Map(); // serviceId -> { name, href }: services the dashboard calls for the viewer
  const frames = new Set(); // origins the page may show in a frame (widget.yaml `frames`)
  const errors = [...config.errors, ...extraErrors];
  const warnings = [...config.warnings, ...extraWarnings];
  const usedTypes = new Set();

  /**
   * homepage's references to another service's widget (the calendar's integrations):
   * an object with `service_group` and `service_name` gets that widget's options (url, key, ...)
   * under its own keys, on the server only. With a `type`, the service's widget of that type.
   */
  const servicesByName = new Map();
  const collect = (list) => {
    for (const g of list) {
      for (const s of g.services ?? []) servicesByName.set(`${g.name}\u0000${s.name}`, s);
      collect(g.groups ?? []);
    }
  };
  collect(groups);
  function withReferences(value, where, depth = 0) {
    if (depth > 3) return value;
    if (Array.isArray(value)) return value.map((v) => withReferences(v, where, depth + 1));
    if (!isPlainObject(value)) return value;
    const out = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withReferences(v, where, depth + 1)]));
    if (out.service_group === undefined || out.service_name === undefined) return out;
    // a label could borrow a configured widget's key and point the url elsewhere
    if (where.discovered) {
      errors.push({ ...where, message: `service_group/service_name: not taken from a discovered service; set this widget in services.yaml` });
      return out;
    }
    const service = servicesByName.get(`${out.service_group}\u0000${out.service_name}`);
    const id = (t) => registry.get(t)?.id ?? t;
    const widget = service?.widgets.find((w) => !out.type || id(w.type) === id(out.type));
    if (!widget) {
      errors.push({ ...where, message: `no ${out.type ? `${out.type} widget on ` : ''}service "${out.service_name}" in group "${out.service_group}"` });
      return out;
    }
    return { ...widget.options, ...out };
  }

  /**
   * Widgets that take their connection from a config file, as in homepage: proxmoxvm from
   * proxmox.yaml (by node), kubernetes from the kubeconfig of kubernetes.yaml `mode: default`.
   * Options in the entry win; every filled-in value is a secret option or the url.
   */
  // proxmox.yaml's node, or homepage's one entry for every node (saved under '')
  const proxmoxFor = (node) => config.proxmox?.[String(node)] ?? config.proxmox?.[''];
  let kube;
  const kubeConnection = () => {
    if (kube === undefined) {
      try {
        kube = k8sConnection(config.kubernetes);
      } catch (err) {
        kube = null;
        errors.push({ file: 'kubernetes.yaml', path: 'mode', message: err.message });
      }
    }
    return kube;
  };
  function withConnection(type, rawOptions, where) {
    const options = withReferences(rawOptions, where);
    if (options.url) return options;
    if (type === CORE_WIDGETS.proxmox && options.node) return { ...proxmoxFor(options.node), ...options };
    if ((type === 'kubernetes' || type === CORE_WIDGETS.pods) && config.kubernetes?.mode === 'default') {
      const c = kubeConnection();
      if (!c) return options;
      const filled = { url: c.url, token: c.token, username: c.username, password: c.password, ...tlsOptions(c), insecure: c.insecure };
      return { ...Object.fromEntries(Object.entries(filled).filter(([, v]) => v !== undefined)), ...options };
    }
    return options;
  }

  const addInstance = (id, requested, rawOptions, where) => {
    const widget = registry.get(requested);
    const type = widget?.id ?? requested; // an alias (homepage's customapi) becomes the widget's id
    usedTypes.add(type);
    if (!widget) {
      const message = Object.values(CORE_WIDGETS).includes(type)
        ? `unknown widget type "${type}": it comes with the widgets collection (${DEFAULT_PLUGINS[0].atLeast} or newer), which is not installed`
        : `unknown widget type "${type}"`;
      errors.push({ ...where, message });
      instances.set(id, { type, options: {}, secretValues: [], refreshMs: DEFAULT_REFRESH_MS, errors: [message] });
      return { instanceId: id, type, options: {}, known: false };
    }
    const { own, options: widgetOptions } = splitInstanceKeys(widget.manifest.options, withConnection(widget.id, rawOptions, where));
    if (where.discovered) refuseFromLabels(widget, own, widgetOptions, where, type);
    if (own.provider !== undefined) applyProvider(widget.manifest.options, String(own.provider), widgetOptions, where, type);
    const { options, publicOptions, errors: optionErrors } = validateOptions(widget.manifest.options, widgetOptions, secrets);
    // `type: icon` options arrive as URLs, resolved like service icons (mdi-/si- with #dash-mask)
    for (const [name, def] of Object.entries(widget.manifest.options)) {
      if (def.type !== 'icon' || options[name] === undefined) continue;
      const url = resolveIcon(options[name]);
      if (!url) {
        optionErrors.push(`${name}: "${options[name]}" is not an icon name or URL`);
        delete options[name];
        delete publicOptions[name];
      } else {
        options[name] = url;
        if (name in publicOptions) publicOptions[name] = url;
      }
    }
    // widget.yaml `frames`: the origins of these (public) options are allowed in frame-src
    for (const name of widget.manifest.frames ?? []) {
      const origin = frameOrigin(publicOptions[name]);
      if (origin) frames.add(origin);
      else if (options[name] !== undefined) optionErrors.push(`${name}: "${options[name]}" is not an http(s) URL`);
    }
    let refreshMs = widget.manifest.refreshMs;
    try {
      if (own.refreshInterval !== undefined) refreshMs = Number(own.refreshInterval);
      // homepage's info widgets take `refresh: 3000` in milliseconds; a smaller bare number stays seconds
      else if (typeof own.refresh === 'number' && own.refresh >= 1000) refreshMs = own.refresh;
      else if (own.refresh !== undefined) refreshMs = parseDuration(own.refresh);
      if (!Number.isFinite(refreshMs)) throw new Error(`invalid refreshInterval "${own.refreshInterval}"`);
    } catch (err) {
      optionErrors.push(err.message);
      refreshMs = widget.manifest.refreshMs;
    }
    refreshMs = Math.max(MIN_REFRESH_MS, refreshMs);
    const fields = Array.isArray(own.fields) ? own.fields.map(String) : widget.manifest.defaultFields ?? null;
    const hideErrors = own.hideErrors === true || own.hide_errors === true;
    const confirm = confirmFor(widget, options, own.confirm, where, type);
    for (const e of optionErrors) errors.push({ ...where, message: `${type}: ${e}` });
    const secretValues = [...secrets];
    for (const [name, def] of Object.entries(widget.manifest.options)) {
      if (def.secret && options[name] !== undefined) secretValues.push(...stringsIn(options[name]));
    }
    for (const [name, value] of Object.entries(options)) {
      if (!(name in widget.manifest.options)) secretValues.push(...stringsIn(value));
    }
    if (own.highlight !== undefined && !isPlainObject(own.highlight)) {
      errors.push({ ...where, message: `${type}: highlight: expected a map of block key to rules` });
    }
    const highlight = isPlainObject(own.highlight) ? own.highlight : null;
    instances.set(id, { type, apiVersion: widget.manifest.apiVersion, options, secretValues, refreshMs, fields, highlight, errors: optionErrors, confirm });
    return {
      instanceId: id,
      type,
      options: publicOptions,
      known: true,
      server: Boolean(widget.server),
      refreshMs,
      ...(hideErrors ? { hideErrors } : {}),
      ...(confirm && actionsProtected ? { confirm } : {}),
    };
  };

  /**
   * Whether an action widget's press needs the admin password: widget.yaml `confirmWhen` (option
   * values that ask by default, the button's `user: root`), then the entry's `confirm:` (askFor).
   */
  function confirmFor(widget, options, own, where, type) {
    if (!widget.hasAction) {
      if (own !== undefined) warnings.push({ ...where, message: `${type}: confirm: this widget runs nothing, ignored` });
      return null;
    }
    const when = isPlainObject(widget.manifest.confirmWhen) ? Object.entries(widget.manifest.confirmWhen) : [];
    return askFor(when.length > 0 && when.every(([k, v]) => (options[k] ?? widget.manifest.options[k]?.default) === v), own, where, type);
  }

  /**
   * What an action asks before it runs: 'password' when `asked` by default, unless the entry's
   * `confirm:` (password, always, none) says otherwise. A discovered service cannot turn it off:
   * its labels come from whoever starts a container.
   */
  function askFor(asked, own, where, type) {
    let confirm = asked ? 'password' : null;
    if (own !== undefined) {
      if (!CONFIRM_VALUES.includes(own)) errors.push({ ...where, message: `${type}: confirm: expected ${CONFIRM_VALUES.join(', ')}` });
      else if (own === 'none' && asked && where.discovered) warnings.push({ ...where, message: `${type}: confirm: none is not taken from a discovered service; it asks for the admin password` });
      else confirm = own === 'none' ? null : own;
    }
    if (!actionsProtected && (confirm || (asked && own !== 'none'))) {
      warnings.push({ ...where, message: own === 'password' || own === 'always'
        ? `${type}: confirm: ${own} needs an admin password (set one on the settings page); it runs without one now`
        : `${type}: anyone who can open the page can run this; set an admin password on the settings page to ask for it first (or confirm: none to keep it as is)` });
    }
    return confirm;
  }

  /**
   * What a discovered service may not set: labels come from whoever starts a container, or from
   * its image. Options marked `discoverable: false` in widget.yaml (a button's command), the
   * options the page frames (`frames`: they widen the CSP) and `provider` (it hands out a key
   * the label could send to its own url) only come from the YAML config.
   */
  function refuseFromLabels(widget, own, options, where, type) {
    const schema = widget.manifest.options;
    const framed = widget.manifest.frames ?? [];
    for (const name of Object.keys(options)) {
      if (schema[name]?.discoverable !== false && !framed.includes(name)) continue;
      delete options[name];
      errors.push({ ...where, message: `${type}: ${name} is not taken from a discovered service; set this widget in services.yaml` });
    }
    if (own.provider !== undefined) {
      delete own.provider;
      errors.push({ ...where, message: `${type}: provider is not taken from a discovered service; set this widget in services.yaml` });
    }
  }

  /**
   * homepage's `provider: <name>`: settings.providers.<name> fills options the entry left out.
   * A map fills the options it names; a text (an API key) the first unset secret option.
   */
  function applyProvider(schema, name, options, where, type) {
    const provider = providers[name];
    if (provider === undefined) {
      errors.push({ ...where, message: `${type}: provider "${name}" is not in settings.yaml providers` });
    } else if (typeof provider === 'string' || typeof provider === 'number') {
      const key = Object.keys(schema).find((k) => schema[k].secret && options[k] === undefined);
      if (key) options[key] = String(provider);
    } else if (isPlainObject(provider)) {
      for (const [k, v] of Object.entries(provider)) if (k in schema && options[k] === undefined) options[k] = v;
    }
  }

  /**
   * A header widget's `tab:` (a tab name, or a list of them): the tabs it shows on. Taken out of its
   * options unless the widget declares an option of that name. Without it, or naming no tab the
   * page has, the widget is on every tab. Returns { options, tabs? }.
   */
  function headerTabs(w, where) {
    if (registry.get(w.type)?.manifest.options?.tab !== undefined || w.options?.tab === undefined) return { options: w.options };
    const { tab, ...options } = w.options;
    if (tab === null) return { options };
    const at = { ...where, path: `${where.path}.tab` };
    const names = (Array.isArray(tab) ? tab : [tab]).map((t) => (typeof t === 'string' || typeof t === 'number' ? String(t).trim() : '')).filter(Boolean);
    if (!names.length || names.length !== (Array.isArray(tab) ? tab.length : 1)) {
      warnings.push({ ...at, message: 'expected a tab name or a list of them; the widget is on every tab' });
      return { options };
    }
    const on = [...new Set(names.filter((n) => tabs.some((t) => t.name === n)))];
    for (const n of names.filter((x) => !on.includes(x))) {
      warnings.push({ ...at, message: `no tab "${n}" in settings.yaml tabs or a group's tab${on.length ? '' : '; the widget is on every tab'}` });
    }
    return on.length ? { options, tabs: on } : { options };
  }

  // Every check that is set gets its own status label, like homepage: HTTP, ping, container.
  const statusesFor = (group, service, where) => {
    const out = [];
    const id = (kind) => stableId('s', group.name, service.name, kind);
    if (service.siteMonitor) out.push({ kind: 'siteMonitor', ...addInstance(id('site'), CORE_WIDGETS.siteMonitor, { url: service.siteMonitor }, where) });
    if (service.ping) out.push({ kind: 'ping', ...addInstance(id('ping'), CORE_WIDGETS.ping, { host: service.ping }, where) });
    if (service.container) {
      const server =
        config.docker.find((s) => s.name === service.server) ?? (config.docker.length === 1 ? config.docker[0] : null);
      const conn = server?.url ? { url: server.url, ...tlsOptions(server.tls ?? {}) } : server?.socket ? { socket: server.socket } : {};
      if (server?.swarm) conn.swarm = true;
      out.push({ kind: 'container', ...addInstance(id('container'), CORE_WIDGETS.container, { container: service.container, ...conn }, where) });
    }
    // homepage's app (+ namespace, podSelector): the app's pods, unless external
    if (service.app && !service.external) {
      const options = { app: service.app, ...(service.namespace ? { namespace: service.namespace } : {}), ...(service.podSelector !== undefined ? { podSelector: service.podSelector } : {}) };
      out.push({ kind: 'pods', ...addInstance(id('pods'), CORE_WIDGETS.pods, options, where) });
    }
    if (service.proxmoxNode && service.proxmoxVMID) {
      const node = proxmoxNode(service.proxmoxNode, where);
      const options = { ...node, node: service.proxmoxNode, vmid: service.proxmoxVMID, ...(service.proxmoxType ? { type: service.proxmoxType } : {}) };
      out.push({ kind: 'proxmox', ...addInstance(id('proxmox'), CORE_WIDGETS.proxmox, options, where) });
    }
    return out;
  };

  const proxmoxNode = (node, where) => {
    const found = proxmoxFor(node);
    if (!found) errors.push({ ...where, message: `proxmoxNode "${node}" is not in proxmox.yaml` });
    return found ?? {};
  };

  const groupLayout = (own) => {
    const layout = Object.fromEntries(Object.entries(isPlainObject(own) ? own : {}).filter(([, v]) => !isPlainObject(v)));
    if (layout.icon !== undefined) layout.icon = resolveIcon(String(layout.icon));
    return layout;
  };

  // `key` is the group's path ("Parent/Nested") for ids; top-level ids stay as they were.
  // A nested group's layout sits inside its parent's (homepage's format) and inherits its tab.
  // A top-level group without a tab in the layout block takes the one its discovered services' labels name.
  const layoutGroup = (group, configured, key, parentTab) => {
    const own = isPlainObject(configured) ? configured : {};
    const layout = groupLayout(own);
    if (!parentTab && !layout.tab && group.discoveredTab) layout.tab = group.discoveredTab;
    if (parentTab && !layout.tab) layout.tab = parentTab;
    return {
      name: group.name,
      layout,
      services: layoutServices({ ...group, name: key }),
      groups: (group.groups ?? []).map((g) => layoutGroup(g, own[g.name], `${key}/${g.name}`, layout.tab)),
    };
  };

  // A `filter:` (a parsed tree, of the service or of one of its widgets) bound to the service's
  // widgets and status checks (container.<attr>); the page evaluates it on their attributes. Its
  // literals go to the browser, so a secret (a filled-in {{DASHBOARD_VAR_*}}) is refused (hard rule 1).
  // `what` (service or widget) is shown unfiltered after an error.
  const bindFilterFor = (tree, service, statuses, at, what) => {
    if (!tree) return {};
    const declared = (type) => {
      const widget = registry.get(type);
      return { id: widget?.id, attributes: widget ? widget.manifest.attributes ?? {} : undefined };
    };
    const widgets = service.widgets.map((w) => ({ type: w.type, ...declared(w.type) }));
    const checks = statuses.map((s) => ({ kind: s.kind, type: s.type, ...declared(s.type) }));
    const literals = [];
    const walk = (n) => {
      if (!n || typeof n !== 'object') return;
      if (typeof n.lit === 'string') literals.push(n.lit);
      walk(n.a);
      walk(n.b);
    };
    walk(tree);
    if (literals.some((l) => [...secrets].some((s) => isSecretValue(s) && l.includes(s)))) {
      errors.push({ ...at, message: `a filter cannot hold a secret ({{DASHBOARD_VAR_*}} or {{DASHBOARD_FILE_*}}); the ${what} is shown unfiltered` });
      return {};
    }
    const bound = bindFilter(tree, widgets, checks);
    for (const message of bound.warnings) warnings.push({ ...at, message });
    if (bound.errors.length) {
      for (const message of bound.errors) errors.push({ ...at, message: `${message}; the ${what} is shown unfiltered` });
      return {};
    }
    if (!filterRefs(bound.tree).length) warnings.push({ ...at, message: 'the filter names no widget attribute, so it is always true or always false' });
    return { filter: bound.tree };
  };
  const serviceFilter = (service, statuses, where) =>
    bindFilterFor(service.filter, service, statuses, { ...where, path: `${where.path}.filter` }, 'service');

  /**
   * A service widget's own `filter:` (hides that widget while true), taken out of its options
   * unless the widget declares an option of that name. Returns { options, filter? }.
   */
  const widgetFilter = (w, service, statuses, at) => {
    const declares = registry.get(w.type)?.manifest.options?.filter !== undefined;
    if (declares || w.options?.filter === undefined || w.options.filter === null) return { options: w.options };
    const { filter: text, ...options } = w.options;
    let tree;
    try {
      tree = parseFilter(typeof text === 'string' ? text : undefined);
    } catch (err) {
      errors.push({ ...at, message: `${err.message}; the widget is shown unfiltered` });
      return { options };
    }
    return { options, ...bindFilterFor(tree, service, statuses, at, 'widget') };
  };

  const layoutServices = (group) =>
    group.services.map((service) => {
      const where = { file: service.discovered ?? 'services.yaml', path: `${group.name}.${service.name}`, ...(service.discovered ? { discovered: true } : {}) };
      const id = stableId('svc', group.name, service.name);
      // homepage's `target: hidden-iframe` (a webhook): the server calls it and reports back.
      // Not for a discovered service: its label would make the server call any address; it opens as a link.
      let target = service.target ?? config.settings.target;
      if (target === 'hidden-iframe' && service.discovered) {
        if (service.target) warnings.push({ ...where, message: 'target: hidden-iframe is not taken from a discovered service; it opens as a link' });
        target = '_blank';
      }
      const hook = target === 'hidden-iframe' && /^https?:\/\//.test(service.href ?? '');
      const hookConfirm = hook ? askFor(true, service.confirm, where, 'webhook') : null;
      if (hook) actions.set(id, { name: service.name, href: service.href, confirm: hookConfirm });
      const statuses = statusesFor(group, service, where);
      const card = {
        id,
        name: service.name,
        ...serviceFilter(service, statuses, where),
        href: service.href ?? null,
        target,
        icon: resolveIcon(service.icon),
        description: service.description ?? null,
        discovered: service.discovered ?? null,
        ...(hookConfirm && actionsProtected ? { confirm: hookConfirm } : {}),
        statusStyle: service.statusStyle ?? config.settings.statusStyle ?? null,
        showStats: service.showStats ?? config.settings.showStats ?? false,
        statuses,
        widgets: service.widgets.map((w, i) => {
          const at = { file: where.file, path: w.path ?? where.path, ...(where.discovered ? { discovered: true } : {}) };
          const { options, filter } = widgetFilter(w, service, statuses, { ...at, path: `${at.path}.filter` });
          return { ...addInstance(stableId('w', group.name, service.name, String(i)), w.type, options, at), ...(filter ? { filter } : {}) };
        }),
      };
      // which card an instance is on: a button's action refreshes the others on it (runtime.js)
      for (const w of [...card.statuses, ...card.widgets]) if (instances.has(w.instanceId)) instances.get(w.instanceId).card = id;
      return card;
    });

  // Groups follow the order of the layout block (homepage's sorting); the others come after,
  // in their own order. `order` lets the page put a bookmark group between service groups.
  const layoutNames = Object.keys(config.settings.layout);
  const orderOf = (name) => (layoutNames.includes(name) ? layoutNames.indexOf(name) : null);
  const byLayout = (list) =>
    list
      .map((item, i) => ({ item, i, order: orderOf(item.name) }))
      .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.i - b.i)
      .map(({ item, order }) => ({ ...item, order }));
  const layoutGroups = byLayout(groups.map((group) => layoutGroup(group, config.settings.layout[group.name], group.name)));

  // the tab bar: settings.yaml `tabs:` first, then the tabs layout groups name (in the order of the
  // layout block, as homepage), then those of discovered groups
  const listed = config.settings.tabs ?? [];
  const named = [
    ...Object.values(config.settings.layout).map((l) => l?.tab),
    ...layoutGroups.map((g) => g.layout.tab),
  ].filter((t) => typeof t === 'string' && t);
  const tabs = [...listed, ...[...new Set(named)].filter((name) => !listed.some((t) => t.name === name)).map((name) => ({ name }))]
    .map((t) => ({ name: t.name, icon: t.icon ? resolveIcon(t.icon) : null, ...(t.default ? { default: true } : {}) }));

  const header = config.widgets.map((w, i) => {
    const where = { file: 'widgets.yaml', path: w.path };
    const { options, tabs: on } = headerTabs(w, where);
    const instance = addInstance(stableId('h', String(i), w.type), w.type, options, where);
    return on ? { ...instance, tabs: on } : instance;
  });

  const widgetTypes = {};
  for (const type of usedTypes) {
    const widget = registry.get(type);
    if (!widget) continue;
    const lang = config.settings.language;
    widgetTypes[type] = {
      name: widget.manifest.name,
      version: widget.manifest.version,
      apiVersion: widget.manifest.apiVersion,
      source: widget.source,
      // relative, so the page also works under settings.base
      client: widget.hasClient ? `./widgets/${type}/client.js?v=${encodeURIComponent(widget.manifest.version)}` : null,
      i18n: { ...(widget.i18n.en ?? {}), ...(widget.i18n[lang] ?? {}) },
    };
  }

  const scrubbed = (list) =>
    list.map(({ discovered, ...m }) => ({ ...m, message: scrub(m.message, secrets) }));

  const layout = {
    tabs,
    settings: {
      title: config.settings.title,
      language: config.settings.language,
      theme: config.settings.theme,
      color: config.settings.color,
      background: config.settings.background ?? null,
      cardBlur: config.settings.cardBlur ?? null,
      bookmarksStyle: config.settings.bookmarksStyle ?? null,
      iconStyle: config.settings.iconStyle ?? DEFAULTS.iconStyle,
      cardStyle: config.settings.cardStyle ?? null,
      quicklaunch: config.settings.quicklaunch ?? {},
      highlightLevels: { ...DEFAULT_LEVELS, ...(config.settings.blockHighlights?.levels ?? {}) },
      blockStyle: config.settings.blockStyle ?? null,
      font: config.settings.font ?? null,
      fullWidth: config.settings.fullWidth === true,
      maxGroupColumns: config.settings.maxGroupColumns ?? null,
      maxBookmarkGroupColumns: config.settings.maxBookmarkGroupColumns ?? null,
      useEqualHeights: config.settings.useEqualHeights === true,
      disableCollapse: config.settings.disableCollapse === true,
      groupsInitiallyCollapsed: config.settings.groupsInitiallyCollapsed === true,
      actionsProtected,
      showTitle: config.settings.showTitle,
      headerStyle: config.settings.headerStyle,
    },
    header,
    groups: layoutGroups,
    bookmarks: byLayout(config.bookmarks.map((g) => ({
      name: g.name,
      layout: groupLayout(config.settings.layout[g.name]),
      bookmarks: g.bookmarks.map((b) => ({ ...b, icon: resolveIcon(b.icon) })),
    }))),
    widgetTypes,
    messages: { errors: scrubbed(errors), warnings: scrubbed(warnings) },
  };
  return { instances, layout, actions, frames: [...frames] };
}

function stringsIn(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsIn);
  return [];
}
