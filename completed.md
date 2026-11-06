# Completed

Finished work, newest first.

- 2026-10-23: First version: config core, widget runtime with seven built-in widgets, plugin
  installer (git/npm/path + lock file), widget template, Docker and Kubernetes discovery,
  single-file dashboard, Docker image and CI.
- 2026-10-23: homepage look and compatibility, statuses per check, rows, plugin collections,
  and the widget collection repo (12 widgets).
- 2026-10-24: Apple HIG audits of the dashboard and the widgets; all findings fixed (Critical to Low).
- 2026-10-24: homepage parity, phase 1: `description` and `favicon` in settings.yaml.
- 2026-10-24: homepage parity, phase 1: `startUrl` and the PWA manifest (`pwa.icons`, `pwa.shortcuts`).
- 2026-10-24: homepage parity, phase 1: `background` with filters and `cardBlur`.
- 2026-10-24: homepage parity, phase 1: tabs (`layout.<group>.tab`).
- 2026-10-24: homepage parity, phase 1: nested groups.
- 2026-10-24: homepage parity, phase 1: icons-only bookmarks and category icons.
- 2026-10-24: homepage parity, phase 1: `mdi-`/`sh-` icons, icon colours and `iconStyle`.
- 2026-10-24: homepage parity, phase 1: fullWidth, max group columns, equal heights, disableCollapse, groupsInitiallyCollapsed.
- 2026-10-24: homepage parity, phase 1: group order from the layout block, mixed with bookmark groups.
- 2026-10-24: homepage parity, phase 1: header styles, cardStyle, blockStyle, font.
- 2026-10-24: homepage parity, phase 1: `statusStyle` (global and per service).
- 2026-10-24: homepage parity, phase 1: block highlighting and `blockHighlights` levels.
- 2026-10-24: homepage parity, phase 1: quick launch.
- 2026-10-24: homepage parity, phase 1: `showStats` (global and per service).
- 2026-10-24: homepage parity, phase 1: `providers`.
- 2026-10-24: homepage parity, phase 1: `instanceName` and homepage's label notation for discovery.
- 2026-10-24: homepage parity, phase 1: `hideVersion` and the update check.
- 2026-10-24: homepage parity, phase 1: `disableIndexing`.
- 2026-10-24: homepage parity, phase 1: `base` (sub path behind a reverse proxy).
- 2026-10-24: homepage parity, phase 1: `custom.css` and `custom.js`.
- 2026-10-24: homepage parity, phase 1: twelve more languages (homepage's set), right-to-left for Hebrew.
- 2026-10-24: homepage parity, phase 1: `logpath` and `LOG_TARGETS`.
- 2026-10-24: homepage parity, phase 1: search suggestions (search widget and quick launch).
- 2026-10-24: homepage parity, phase 1: resources widget (cputemp, uptime, network, expanded, diskUnits). Phase 1 done.
- 2026-10-24: homepage parity, phase 2: greeting widget.
- 2026-10-24: homepage parity, phase 2: logo widget and the `icon` option type.
- 2026-10-24: homepage parity, phase 2: Open-Meteo weather widget.
- 2026-10-24: homepage parity, phase 2: OpenWeatherMap widget (not checked against the live API: needs a key).
- 2026-10-24: homepage parity, phase 2: stocks widget (Finnhub; not checked against the live API: needs a key).
- 2026-10-24: homepage parity, phase 2: Kubernetes widget (tested against a fake API, not a live cluster).
- 2026-10-24: homepage parity, phase 2: glances, longhorn and unifi (also unifi_console) in the widgets collection. Phase 2 done but the weather's browser location.
- 2026-10-24: homepage parity, phase 2: weather without coordinates uses the viewer's location (`params` in the widget API, documented in the API reference). Phase 2 done.
- 2026-10-24: homepage parity, phase 3: Docker over TLS (`tls` in docker.yaml; tested against a local TLS server with client certificates, not a real dockerd).
- 2026-10-24: homepage parity, phase 3: services ordered by weight within a group, as in homepage (`weight` in services.yaml too).
- 2026-10-24: homepage parity, phase 3: Docker Swarm services and stacks (`swarm: true`; tested against a fake API, not a live swarm).
- 2026-10-24: homepage parity, phase 3: Proxmox VM/LXC status and stats per service (`proxmox.yaml`, built-in `proxmoxvm`; tested against a fake API, not a live Proxmox).
- 2026-10-24: homepage parity, phase 3: Kubernetes outside the cluster (`mode: default`, a kubeconfig without dependencies; tested against local API servers, not a live cluster).
- 2026-10-24: homepage parity, phase 3: Kubernetes discovery of Traefik IngressRoutes and Gateway API HTTPRoutes (tested against a fake API).
- 2026-10-24: homepage parity, phase 3: Kubernetes pod status and stats per service (`app`, `namespace`, `podSelector`, built-in `kubernetes-pods`; tested against a fake API). Phase 3 done.
- 2026-10-24: openmeteo, openweathermap and stocks moved from the built-in widgets to the widgets collection (they need a collection release before this dashboard release).
- 2026-10-24: homepage parity, phase 4: the twelve new languages for the collection's widgets.
- 2026-10-24: homepage parity, phase 4, batch 1 in the collection: pihole, adguard, plex, jellyfin, emby, homeassistant, proxmox, proxmoxbackupserver, qbittorrent, transmission, deluge, nzbget, lidarr, readarr, jackett, ombi (glances and unifi were already there). Tested against fixtures, not live services.
- 2026-10-24: homepage parity, phase 4, batch 1 done in the collection: also nextcloud, immich, paperlessngx, uptimekuma, traefik, npm, truenas (REST and WebSocket API), diskstation, openmediavault, speedtest, gitea, grafana, tailscale, authentik, audiobookshelf, navidrome, frigate, scrutiny, watchtower, syncthing and calendar (with the dashboard's new service references). Tested against fixtures and local fakes, not live services.
- 2026-10-24: homepage parity, phase 4, batch 2 in the collection: apcups, arcane, argocd, atsumeru, autobrr, azuredevops, backrest, booklore, bookorbit, beszel, caddy, calibreweb, changedetectionio, channelsdvrserver, checkmk, cloudflared, coinmarketcap, crowdsec, develancacheui, dispatcharr, dockhand, downloadstation, duplicati, esphome, evcc, feed, filebrowser, fileflows, firefly, flood, freshrss and fritzbox (stocks was already there). Tested against fixtures, not live services.
- 2026-10-24: homepage parity, phase 4, batch 2 in the collection: gamedig (Valve's server query, without the gamedig library), gatus, ghostfolio, gitlab, gluetun, gotify, hdhomerun, headscale, healthchecks, karakeep, homebox, homebridge, jdownloader (My.JDownloader), jellystat and kavita. Tested against fixtures and local fakes, not live services.
- 2026-10-24: homepage parity, phase 4: built-in `iframe` widget, with `frames` in widget.yaml so the page's CSP allows only the configured frames' origins.
- 2026-10-24: homepage parity, phase 4, batch 2 in the collection: komga, komodo, kopia, linkwarden, lubelogger, mastodon, mailcow, maintainerr, mealie, medusa, mikrotik, minecraft (Server List Ping, without a library), miniflux, mjpeg (client only), moonraker, mylar, myspeed, netdata, netalertx, netbird, nextdns, ntfy, octoprint and omada (controllers 4 to 6). Tested against fixtures and local fakes, not live services.
- 2026-10-24: homepage parity, phase 4, batch 2 done in the collection: opendtu, opnsense, openwrt, pangolin, peanut, pfsense, photoprism, plantit, prometheus, prometheusmetric, pterodactyl, pulse, pyload, qnap, qui, romm, rutorrent, slskd, sparkyfitness, spoolman, sportarr, strelaysrv, suwayomi, swagdashboard, tandoor, technitium, tracearr, trilium, tubearchivist, unifi_drive, unmanic, uptimerobot, urbackup, vikunja, wallos, wgeasy, xteve, yourspotify and zabbix; seerr also answers to overseerr. Every homepage service widget now has a counterpart (built in or in the collection). Tested against fixtures and local fakes, not live services.
- 2026-10-24: `DASHBOARD_ALLOWED_HOSTS` (and `HOMEPAGE_ALLOWED_HOSTS`): a Host header check against DNS rebinding, off until set, loopback always allowed.
- 2026-10-24: `DASHBOARD_WATCH_POLL`: polling the config files for network file systems, and polling as the fallback when fs.watch cannot start.
- 2026-10-24: widget scaffolding: `npm run new-widget -- <id>` (dashboard) and `npm run rename -- <id>` (the example repo).
- 2026-10-24: installed widgets run in one worker thread with a memory limit; a hung widget restarts the worker (checked: all 164 collection widgets give the same results as in the process).
- 2026-10-25: released the widgets collection 0.3.0 and the dashboard 0.5.0.
- 2026-10-25: the built-in widgets moved to the widgets collection; the dashboard has none of its own any more.
- 2026-10-25: released the widgets collection 0.4.0 and the dashboard 0.6.0.
- 2026-10-30: Documentation site in homepage's structure (Home, Configuration per file + Images
  + Custom CSS & JS, Widgets with an example image per widget, Extend), a showcase for the
  screenshots and a short README.
- 2026-10-31: Shelly widget (firmware, update button); a warning for `{{NAME}}` the dashboard
  does not fill in; "check the key or password" on a refused login.
- 2026-10-31: `filter:` on a service, on public attributes widgets publish (widget.yaml
  `attributes:`, `from:` a block, `@attention`, `@status`, `@rows`); attributes for 167 widgets.
- 2026-10-31: Widget pages with Display fields, Configuration options and Filter attributes; no
  version requirements in the docs; YAML examples that highlight without red marks.
- 2026-10-31: An example image for every widget page (the collection's fake services and options
  in `scripts/fakes.mjs`, demo page and camera, a fixed date).
- 2026-11-02: `filter: container.healthy`: a service filter reads its `container:` check; the
  collection's `docker` publishes `healthy` and `unhealthy` from the Docker healthcheck.
- 2026-11-02: CI tests against the newest release of the widgets collection, as installations get it.
- 2026-11-02: CLAUDE.md hard rule 11 names the folders this repository has.
- 2026-11-02: `tests/frontend.test.mjs` closes every page it opens after each test; run on its own it ends in seconds instead of hanging.
- 2026-11-02: A test for the Kubernetes annotation `homelab.dev/filter` (and `gethomepage.dev/filter`).
- 2026-11-02: The Pages workflow runs every code block of the site through Rouge 3.30.0 (`scripts/check-highlight.rb`) and fails on one it marks red.
- 2026-11-02: Filter recipes in the docs: Radarr, What's up Docker, Proxmox, Speedtest, Uptime Kuma and container health.
- 2026-11-02: The footer counts the cards filters hide ("3 hidden") and shows them dimmed on a click; a filter on a widget without a server.js is evaluated at once.
- 2026-11-02: The Pages workflow caches Chromium per Playwright version.
- 2026-11-02: Widget images on the docs site in the light appearance, as the docs theme.
- 2026-11-02: Widget example repo release v1.2.0 (Reset button, attributes `value` and `full`).
- 2026-11-02: A filter per widget: `filter:` on a service widget hides that widget (an update button only while there are updates); bound and checked like the service filter.
- 2026-11-04: Security: a broken request path or target is a 400 instead of ending the process; server.js catches every failing request.
- 2026-11-04: Security: host names are checked by default (DASHBOARD_ALLOWED_HOSTS; localhost and IP addresses always work), with a page that says what to set.
- 2026-11-06: Passkeys (WebAuthn) next to the admin password over HTTPS: login page, settings and buttons; managed on the settings page.
- 2026-11-06: Security: discovered labels/annotations fill in variables only when `allowVariables` lists them, and cannot set `discoverable: false` options (button command/script/user), framed options, `provider`, service references or `target: hidden-iframe`.
- 2026-11-06: Security: `allowedHosts: "*"` warns in the log. An Origin check was not added: a rebound page is same-origin, so its Origin matches its Host and the check would stop nothing.
- 2026-11-06: Security: reading needs authentication: the login page and passkeys (0.23.0), and a docs section "Authentication in front" (Authelia, Authentik, Cloudflare Access; no published port, the health check, event stream and rate limit behind a proxy).
- 2026-11-06: Security: the widget worker runs without the `DASHBOARD_VAR_*` / `DASHBOARD_FILE_*` variables in its environment (the config folder stays readable; documented).
- 2026-11-06: Security: at most 30 fresh param sets a minute per widget instance; the weather widgets round and check coordinates and keep at most 50 locations.
- 2026-11-06: Docs: `:ro` on the Docker socket is said not to limit the API wherever the socket is mounted (the Access paragraph says why; a socket proxy does).
- 2026-11-06: Security: at most 500 event streams (50 per address); headersTimeout, requestTimeout and maxConnections set in src/server.js.
- 2026-11-06: Security: files under a widget's assets/ and the config's icons/ are served only when their real path stays inside that folder.
- 2026-11-06: Security: the page's CSP drops `'unsafe-inline'` scripts (its own script runs by a per-response nonce); the security docs say a widget client runs with the page's rights. Not checked in a browser (none on the dev host).
- 2026-11-06: Security audit of 2026-11-04 closed. Left as documented: root mode (`DASHBOARD_ALLOW_ROOT_SCRIPTS`) makes every widget root. Checked and fine then: no unread bodies, `/widgets/<type>/` serves client.js and assets/ only, secrets out of `/api/layout` and messages, textContent/safeHref in the page, `npm pack --ignore-scripts`, pinned tarballs and commits, `npm audit` clean, the image runs as `node`.
- 2026-11-06: A widget catalogue: docs/widgets/catalogue.md on the Pages site (no separate repo), with the rules for adding a package by pull request.
- 2026-11-06: Versions in the docs before 1.0: kept as they are (the Migration section and the API Changes table keep naming versions, as CLAUDE.md rules 2 and 6 require).
- 2026-11-06: Settings page foundation: `src/config/edit.js` writes any config file (allow-list, checked as loadConfig loads it, 409 on a concurrent edit, the last ten versions under `.history/`); settings.yaml goes through it; hard rule 5 revised.
- 2026-11-06: Settings page secrets: `src/config/mask.js` sends secrets written in a file as `__SECRET_<id>__` tokens (secret options, providers, adminPassword, Proxmox secret) and puts them back on save; `/api/settings/files` (list, read, save, history); a warning for a literal secret; the admin password not changeable through a file.
- 2026-11-06: Settings page and `!include`: every file the config files include is editable as a file of its own (`editableFiles`, `listIncludes`), checked as part of the config file it ends up in, masked by that file's rules, its history under `.history/<folder>/`; the include itself is never inlined. The structured editors show an included part read-only, with a link to its file.
- 2026-11-06: Settings page sections (`/settings#<section>`: General as before, Services, Header widgets, Bookmarks, Docker, Kubernetes, Proxmox, Advanced) and a text editor per config file and its includes: checked save, problems with file › path, conflict notice, undo, an earlier version back into the editor, a warning before leaving with unsaved text.
- 2026-11-06: settings.yaml's other keys as fields on the settings page (FIELDS with `at` paths, types string/url/enum/boolean/tristate/int/duration/list; only changed fields written; background short form kept); Security its own section. `providers` and `blockHighlights` stay in the text editor under Advanced (secrets, free structure).
- 2026-11-06: Settings page Groups: the layout block per group and nested group, the order by up/down buttons (keyboard focus follows), gone groups removable (`src/settings-layout.js`, `POST /api/settings/layout`); the block keeps its map or list form and comments, untouched groups get no entry, a reorder lists every group.
- 2026-11-06: Settings page Widgets: the plugins list (`src/settings-plugins.js`, `POST /api/settings/plugins`), checked with the installer's parseSource, each entry's YAML node kept (comments, label), pins from the lock file, the defaults and whether replaced, install again / update buttons on `/api/plugins/sync`.
- 2026-11-06: Settings page Services as a form (`src/settings-services.js`, `/api/settings/services`): the tree by node ids, rebuilt from the original YAML nodes (comments, widgets, unknown keys kept; only changed fields written; the top comment stays on top), includes as movable blocks with a link to their file, discovered services listed, a toggle to the text editor. The icon picker with preview is left for later.
- 2026-11-06: Settings page service widgets: a form per widget from widget.yaml's options (`widgetCatalog`, `widgetForm`, `applyWidget` in `src/settings-services.js`), secret options as tokens, `widget:` kept while there is one, lists/objects/undeclared keys kept; `POST /api/settings/widget-test` runs a widget with hidden values and variables filled in on the server, errors scrubbed.
- 2026-11-06: Settings page header widgets as a form (`readHeader`/`writeHeader`, `/api/settings/header`), with the shared widget editor; each entry keeps its node, the top comment stays on top.
- 2026-11-06: Settings page bookmarks as a form (`src/settings-bookmarks.js`, `/api/settings/bookmarks`): groups and bookmarks by node ids, homepage's one-item list and the map form both kept, new ones in homepage's form, includes as blocks.
- 2026-11-06: Settings page Docker, Kubernetes and Proxmox as forms (`src/settings-servers.js`, `/api/settings/servers/<file>`): entries renamed/added/removed/reordered with their nodes kept, TLS files, the Proxmox secret as a token, homepage's flat proxmox form; `POST /api/settings/docker-test` for a saved server. Left: a connection test for Kubernetes and Proxmox (their problems show in the dashboard's messages).
- 2026-11-06: custom.css and custom.js editable under Advanced (`TEXT_FILES` in `src/config/edit.js`: no YAML check, history and conflicts as the others), custom.js behind a warning.
- 2026-11-06: Settings page import and download: homepage's files imported from Advanced (`/api/settings/import/check`, `/api/settings/import`: the wizard's dry run, then all or none, the admin password/login/allowed hosts kept), a download button on every text editor (hidden values stay hidden). The earlier-version restore is the history in each editor. Docs and the changelog were updated with each step; tests per editor are in tests/settings-*.test.mjs, app.test.mjs and settings-page.test.mjs.
