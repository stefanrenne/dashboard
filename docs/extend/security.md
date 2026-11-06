# Widget security

## Trust model

A widget's `server.js` runs **with the dashboard's rights**: network, files in the container,
environment variables. Installing a widget means trusting its author, like
choosing a Docker image. The dashboard limits the damage where it can:

- Plugins come **only from sources listed in `settings.yaml`**, plus the project's own
  [widgets collection](https://github.com/stefanrenne/dashboard-widgets) (`#latest`), which
  is always installed. The page cannot add a source; `POST /api/plugins/sync` only re-reads the config.
- Sources are **pinned**. A git tag or commit, `#latest` (the newest release tag at install
  time), or an exact npm version, is recommended; a branch or range gives a warning. `plugins/plugins.lock.yaml` records the commit or the npm tarball
  integrity, so a restart installs exactly the same code without network access. A changed npm
  tarball for a locked version is refused.
- `npm pack` runs with `--ignore-scripts`; nothing from a package runs during installation.
- `git`, `npm` and `ping` get validated arguments without a shell (no `-`-prefixed refs or names).
- The default collection yields: a widget id from your own `plugins:` wins over the collection's,
  and two of your own sources cannot share an id.
- **Host names are checked** (`allowedHosts` in settings.yaml, see
  [Allowed hosts](../configuration/README.md#allowed-hosts)): a web page that points a name of its
  own at your network (DNS rebinding) gets a refusal instead of the dashboard, so it cannot read
  it or press its buttons through your browser. `*` turns this off.
- **Actions run for anyone who can open the page, unless they ask for a password.** Without a
  login: a widget with an `action` (the collection's `button` running a script) does its thing
  for every visitor who presses it. With an admin password (settings.yaml `adminPassword`, a scrypt
  hash), root buttons, webhooks, the widget sync and every entry
  with `confirm: password` or `always` ask for it first (see
  [Admin password](../configuration/README.md#admin-password)); a correct one unlocks that
  browser for a while through an HttpOnly cookie the server keeps in memory, and guessing is slowed
  down per address. A passkey (see [Passkeys](../configuration/README.md#passkeys)) counts
  as the password: over HTTPS only, bound to the host name it was made on, with user
  verification, its challenge used once and a one-time token for the request that follows.
- **The settings page writes settings.yaml.** It opens only with the admin password (or a
  login); a new admin password needs the current one, and only its hash is written. Without an
  admin password yet, it answers only the local network, and only to set one. Its endpoints read a
  JSON body (at most 64 KB) and need `X-Requested-With: dashboard`.
- **`login: true` closes the page itself** (see [Login page](../configuration/README.md#login-page)):
  every request needs a session, which the server keeps in `.sessions.json` (hashes of the tokens,
  mode 600) and checks each time; a logout or a new admin password ends it for good. Only
  `/api/health`, `robots.txt` and the login page stay open. Without it, anyone who can open the
  page reads it: put the dashboard behind your proxy's authentication (see
  [Authentication in front](../configuration/README.md#authentication-in-front)), or keep such buttons off a
  dashboard that is reachable from outside. Only the
  configured script or command runs; nothing in the request reaches it.
- **Root scripts are off unless you ask for them.** Only with `DASHBOARD_ALLOW_ROOT_SCRIPTS=true` on
  the container does the image let `node` run `/usr/local/bin/dashboard-root` (bash as root) through
  sudo, for a `button` with `user: root`. Then every widget could, so a plugin you install can
  be root in the container too. A mounted Docker socket already gives that much: whoever can use
  the socket can start a root container.
- The dashboard, and so every widget, runs as the unprivileged `node` user. The entrypoint is
  root only to give `node` a mounted Docker socket's group, before the dashboard starts.
- **The setup wizard of a first install** writes the config folder, lists the containers and
  runs a widget once to test it. It exists only while `/config/.onboarding` is there (an empty
  folder at the first start); every other request to it is a 404. It answers a visitor whose
  address, and every address a proxy passed on, is private; anyone else needs the code from the
  log (wrong ones are slowed down per address), and what it changes needs
  `X-Requested-With: dashboard`. Its endpoints are the only ones that read a request body: JSON
  only, at most 1 MB. It never overwrites a file that is there.
- A mounted Docker socket gives every widget the whole Docker API (`:ro` does not limit it).
  Use a docker-socket-proxy with `CONTAINERS=1` when you install widgets you do not fully trust.

- Installed widgets' `server.js` runs in a **worker thread** with a memory limit
  (`DASHBOARD_WIDGET_MEMORY_MB`, default 256): a widget stuck in a loop or eating memory stops the
  worker, which starts again, not the dashboard. A worker thread is not a security boundary: it
  has the same network, files and environment. `DASHBOARD_WIDGET_ISOLATION=off` runs installed widgets
  in the dashboard process, as before.

- **Labels and annotations are not config.** Whoever starts a container (or builds its image)
  writes its labels, so discovered services cannot use variables unless `allowVariables` lists
  them, nor set options marked `discoverable: false`, framed options, `provider`, references to
  other services or `target: hidden-iframe` (see
  [What labels may do](../configuration/docker.md#what-labels-may-do)). Mark an option
  `discoverable: false` when it runs something or reaches elsewhere with the dashboard's rights.

## Secrets

- Options marked `secret: true`, undeclared options, and every value from `{{DASHBOARD_VAR_*}}` /
  `{{DASHBOARD_FILE_*}}` stay on the server. `/api/layout` contains public options only (tested).
- Error messages from widgets and config messages have secret values replaced by `***`.
- The page's Content-Security-Policy restricts `connect-src` to the dashboard itself.

## Recommendations for users

- Prefer widgets whose source you can read; pin tags or commits.
- Put secrets in variables (`DASHBOARD_VAR_*`) or files (`DASHBOARD_FILE_*`, e.g. Docker secrets), not in the YAML.
- Do not expose the dashboard to the internet without authentication: its
  [login page](../configuration/README.md#login-page), or a proxy with single sign-on in front
  (see [Authentication in front](../configuration/README.md#authentication-in-front)).
- Give Docker access through a socket proxy that only allows reading containers.
