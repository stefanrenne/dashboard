# To do

Open work, roughly in order of value. Move an item to `completed.md` when it is done.
The widgets collection keeps its own list: `../dashboard-widgets/todo.md`.

## Settings page: every config file

Goal: everything in the YAML files (and `custom.css`/`custom.js`) can be managed from `/settings`,
not only the `FIELDS` of settings.yaml. Roughly in this order; 1–3 come before any editor.

- [ ] **Foundation: a general config-file writer.** Move `readDoc`/`writeDoc` out of
  `src/settings.js` into `src/config/edit.js`, for any file in the config folder (an allow-list of
  names, the resolved-path check, never `plugins/`). Validate before writing: parse the new
  document, run the file's `normalize*` from `src/config/load.js` with a collecting ctx, refuse on
  errors and return the warnings (file › path). Keep the previous version (`<file>.bak` or a
  `.history/` folder) and detect concurrent edits (a hash sent with the read, 409 when the file
  changed since). Revise hard rule 5 in `CLAUDE.md` and `docs/extend/contributing/decisions.md`:
  the user's files are written only on an admin's explicit save from the settings page. Tests:
  comments and key order survive, `!include` and `{{DASHBOARD_VAR_*}}` survive, a refused save
  leaves the file untouched.
- [ ] **Secrets and placeholders on the page.** The settings API sends values as the file has
  them: `{{DASHBOARD_VAR_*}}`/`{{DASHBOARD_FILE_*}}` as text, never the substituted value; options
  marked `secret: true` are masked and stay unchanged unless retyped. The "a secret never reaches
  the browser" test covers the new endpoints too. A hint to put a secret in a variable instead of
  the file.
- [ ] **`!include` on the page.** A group or list that comes from `!include` is edited in its own
  file (the writer follows the include, with `include.js`'s path checks) or shown read-only with
  its file name; decide, document, test. A save never inlines an include.
- [ ] **Settings page navigation.** Sections in `/settings`: General, Security (both as now),
  Services, Header widgets, Bookmarks, Docker, Kubernetes, Proxmox, Widgets (plugins), Layout,
  Advanced (raw files, CSS/JS). The section in the URL (`/settings#services`). Texts in en + nl.
- [ ] **Raw editor per file (the fallback for everything).** A plain textarea per config file (no
  editor library), save with the validation of the foundation, errors with file › path, and
  revert to the previous version. It covers every key, also those without a form yet.
- [ ] **settings.yaml: the remaining keys as fields.** `description`, `favicon`, `startUrl`,
  `instanceName`, `base`, `logpath`, `pwa`, `fullWidth`, `useEqualHeights`, `disableCollapse`,
  `groupsInitiallyCollapsed`, `showStats`, `maxGroupColumns`, `maxBookmarkGroupColumns`,
  `cardStyle`, `blockStyle`, `font`, `discovery.interval`, `pluginUpdateInterval`, `providers`,
  quicklaunch/search and every other key `normalizeSettings` and
  `docs/configuration/settings.md` know, grouped under General, Look and Behaviour.
- [ ] **Layout editor.** `layout:` per group: columns, style, header, icon, tab, initially
  collapsed; group order by drag and drop with a keyboard alternative.
- [ ] **Plugins editor.** The `plugins:` list: add or remove a source (git, npm, path; validated
  as `installer.js` does), pin a tag or version, the state from `plugins.lock.yaml`, and the
  sync/update buttons (`/api/plugins/sync`).
- [ ] **services.yaml editor.** Groups (add, rename, remove, order, nested groups) and services
  (add, edit, move between groups, order, remove): name, href, icon (a picker with preview),
  description, siteMonitor / ping / container + server, weight, target, filter. Discovered
  services (Docker labels, Kubernetes annotations) shown read-only with their source.
- [ ] **Service widgets in the services editor.** `widget:`/`widgets:` per service: the type from
  the registry (`widgetList` in `src/onboarding.js`), a form generated from the widget's option
  schema (`OPTION_TYPES` in `src/plugins/options.js`: enums, lists, objects), secret options
  masked, a test button (the wizard's `testWidget`). Keys the schema does not know are kept.
- [ ] **widgets.yaml editor (header widgets).** Add, remove and order header widgets, with the
  same schema forms.
- [ ] **bookmarks.yaml editor.** Groups and bookmarks: name, href, abbr, icon, description, order.
- [ ] **docker.yaml editor.** Servers: name, socket or host/port, TLS files, `discover`, Swarm; a
  connection test (`checkDocker`); the socket-proxy advice.
- [ ] **kubernetes.yaml editor.** `mode`, kubeconfig, the Ingress / IngressRoute / HTTPRoute
  switches; a connection test.
- [ ] **proxmox.yaml editor.** Nodes: URL, token id and secret (masked as above); a connection
  test.
- [ ] **custom.css / custom.js editor.** Under Advanced; custom.js behind an explicit warning; the
  CSP keeps treating both as 'self'.
- [ ] **Export and restore.** Download the config files (one at a time or as one bundle without a
  new dependency) and restore a previous version; the wizard's homepage import from here too.
- [ ] **Docs and changelog.** "Settings page" in `docs/configuration/README.md` rewritten, a line
  on each config file's page that it can be edited on the settings page, `CHANGELOG.md` under
  Unreleased, screenshots of the new sections.
- [ ] **Tests per editor.** A `node:test` round trip per file (read → change → write, comments
  kept), jsdom tests per section, the design minimums, and access (without an admin password only
  from the local network, otherwise the password or a passkey).
