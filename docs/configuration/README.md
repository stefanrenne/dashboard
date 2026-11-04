# Configuration

All configuration lives in one folder (`/config` in the container, `--config` or `DASHBOARD_CONFIG_DIR`
otherwise). Every file is optional. The page reloads by itself when a `.yaml` file changes.
On a network share (NFS, SMB) changes made on another machine are not noticed; set
`DASHBOARD_WATCH_POLL` to a number of seconds to check the files that often instead.
Problems are shown at the top of the page with the file and a path into it. A broken entry is
skipped and the rest keeps working. Coming from homepage? Its configuration works as it is: see
[From homepage](homepage.md).

| File | What |
|---|---|
| [`settings.yaml`](settings.md) | Title, language, theme, layout per group, discovery interval, plugins, [providers](providers.md) (keys and logins for widgets) |
| [`bookmarks.yaml`](bookmarks.md) | Groups of links |
| [`widgets.yaml`](header-widgets.md) | Widgets in the header |
| [`services.yaml`](services.md) | Groups of services; [filters](filters.md) hide a card or widget while all is well |
| [`kubernetes.yaml`](kubernetes.md) | Kubernetes discovery |
| [`docker.yaml`](docker.md) | Docker servers (status and discovery) |
| [`proxmox.yaml`](proxmox.md) | Proxmox nodes (VM and container status) |
| other `.yaml` files | Pulled in with `!include` (see [Including other files](#including-other-files)) |
| `icons/` | Your own icons, used as `icon: /icons/name.svg` (see [Images](images.md)) |
| [`custom.css`, `custom.js`](custom-css-js.md) | Your own style and script, loaded after the page's own |
| `plugins/` | Managed by the dashboard: downloaded widgets and `plugins.lock.yaml`. Older versions and removed sources are deleted after each sync |

## YAML in short

Every file is [YAML](https://yaml.org), a superset of JSON that is easy to read and write.

- **Indentation matters.** Nested keys go two spaces further in than their parent; never use tabs.
- **`key: value`**, with a space after the colon. A list item starts with `- `.
- **Quote strings** with special characters, and always API keys and `{{DASHBOARD_VAR_...}}` values:
  `key: "{{DASHBOARD_VAR_RADARR_KEY}}"`.
- A broken file is reported at the top of the page, with the file and a path into it. An online
  checker such as [YAML Lint](https://www.yamllint.com) helps to find the spot.

## Variables

Any value can contain `{{DASHBOARD_VAR_NAME}}` (the environment variable `DASHBOARD_VAR_NAME`) or
`{{DASHBOARD_FILE_NAME}}` (the contents of the file whose path is in `DASHBOARD_FILE_NAME`, e.g. a Docker
secret). homepage's `{{HOMEPAGE_VAR_*}}` and `{{HOMEPAGE_FILE_*}}` work the same, so an
existing homepage environment can be reused. Substituted values are treated as secrets: they
never reach the browser.

Only these forms are filled in. Anything else in double braces, such as `{{SHELLY_PASSWORD}}`,
stays as written and would reach the service as a wrong key or password; the dashboard warns
about it at the top of the page, with the form that works (`{{DASHBOARD_VAR_SHELLY_PASSWORD}}`, with the
environment variable `DASHBOARD_VAR_SHELLY_PASSWORD`).

## Including other files

A long `services.yaml` can be split up. `!include <file>` puts the YAML of another file at that
spot, as if it were written there:

```yaml
# services.yaml
- Infrastructure:
    - Router:
        href: http://router.lan
- Media: !include services/media.yaml      # the services of one group
- !include services/home-automation.yaml   # whole groups
```

```yaml
# services/media.yaml: what would otherwise follow "- Media:"
- Plex:
    href: http://plex.lan:32400
    icon: plex
- Radarr: !include radarr.yaml             # relative to this file: services/radarr.yaml
```

```yaml
# services/home-automation.yaml: one or more groups, as in services.yaml
- Home automation:
    - Home Assistant:
        href: http://homeassistant.lan:8123
- Cameras: []
```

The rules:

- **Where**: as the value of a key (`- Media: !include ...`, `widget: !include ...`), as an item
  in a list, or as a whole file. It works in every config file, also `widgets.yaml` and
  `bookmarks.yaml`.
- **Lists are joined**: an include that is a list item and whose file holds a list adds those
  items in its place. That is how `- !include services/home-automation.yaml` adds two groups. A
  file that holds a map (one service, one widget) is added as one item.
- **Paths** are relative to the file with the `!include`, use `/`, and must stay inside the config
  folder. Only `.yaml` and `.yml` files can be included. Keep included files out of `plugins/`.
- **Nesting**: an included file can include others, up to 8 levels deep. A file that ends up
  including itself is reported.
- **Variables and secrets**: `{{DASHBOARD_VAR_*}}` and `{{DASHBOARD_FILE_*}}` work in included files, and
  their values stay secret, as in the main files.
- **Reloading**: saving an included file reloads the page, also in a subfolder.
- **Problems** never stop the dashboard. A missing file, a path outside the config folder, a
  YAML error or a loop is shown with the file and path of the `!include`
  (`services.yaml › [1].Media: !include services/media.yaml: file not found`); that spot stays
  empty and the rest works. A mistake *inside* the included services is shown with the path
  in the file that includes it.

Files are only read where an `!include` names them: a `media.yaml` next to `services.yaml` does
nothing by itself. `!include` is this dashboard's own; homepage does not read it.

## Environment variables

Settings of the container rather than of the page.

| Variable | What |
|---|---|
| `DASHBOARD_VAR_*`, `DASHBOARD_FILE_*` | Values for `{{DASHBOARD_VAR_*}}` and `{{DASHBOARD_FILE_*}}` (see [Variables](#variables)) |
| `DASHBOARD_ALLOWED_HOSTS` | The host names you open the dashboard by; without it only `localhost` and IP addresses work (see [Allowed hosts](#allowed-hosts)) |
| `DASHBOARD_WIDGET_MEMORY_MB`, `DASHBOARD_WIDGET_ISOLATION` | The widget worker (see [Widget worker](#widget-worker)) |
| `DASHBOARD_ALLOW_ROOT_SCRIPTS` | Button scripts as root (see [Scripts as root](#scripts-as-root)) |
| `DASHBOARD_ACTION_PASSWORD`, `DASHBOARD_ACTION_PASSWORD_FILE` | A password a press asks for (see [Action password](#action-password)) |
| `DASHBOARD_WATCH_POLL` | Check the config files every so many seconds, for network shares |
| `DASHBOARD_CONFIG_DIR` | The config folder, when not run from the image |
| `LOG_TARGETS` | `both`, `stdout` or `file` (with `logpath` in [settings.yaml](settings.md)) |

### Allowed hosts

`DASHBOARD_ALLOWED_HOSTS` (or homepage's `HOMEPAGE_ALLOWED_HOSTS`) lists the host names you open the
dashboard by, comma-separated:

```yaml
# compose.yaml
services:
  dashboard:
    environment:
      DASHBOARD_ALLOWED_HOSTS: dash.lan,dash.example.com   # every name you open it by
```

- **Always answered**: `localhost`, `127.0.0.1`, `[::1]` (the image's health check uses them)
  and any IP address (`http://192.168.1.10:3000`), with or without the variable.
- **A host name** (`dash.lan`, the name your reverse proxy passes on) is only answered when it is
  in the list. Without the variable no name is: the browser shows a page that says which line to
  add, with the name it was opened by. An API call gets a 403.
- **Ports**: an entry without a port allows every port (`dash.lan`); with one, only that port
  (`dash.example.com:8443`).
- **`*`** answers every host, as before this check. Only use it when something else checks the
  host, such as a reverse proxy that answers your names only.

This stops DNS rebinding: a web page that points a name of its own at your network would
otherwise be the same site as the dashboard to your browser, and could read it and press its
buttons. Such a page always uses its own name, never an IP address, so IP addresses stay safe.

### Action password

With `DASHBOARD_ACTION_PASSWORD` set, presses that run something ask for that password first:

- **Buttons that run as root** (`user: root`) ask by default; `confirm: none` on the entry turns
  that off.
- **Other buttons** ask when their entry says `confirm: password`.
- **`target: hidden-iframe` services** (a webhook the dashboard calls) ask; `confirm: none` on the
  service turns that off.
- **The widget sync** (`POST /api/plugins/sync`) asks too.

`confirm: always` asks on every press. Otherwise a correct password unlocks that browser for 15
minutes (`actions: { remember: 30m }` in [settings.yaml](settings.md), `0` asks every time); the
lock in the footer locks it again, and a restart of the dashboard locks every browser.

```yaml
# services.yaml
- Admin:
    - Update:
        widgets:
          - type: button
            text: Update containers
            command: docker compose -f /stack/compose.yaml up -d --pull always
            confirm: password   # ask, then remember for 15 minutes
          - type: button
            text: Reboot
            user: root          # asks by default
            command: reboot
            confirm: always     # every press
```

The dialog has a username (`dashboard`) and a password field, so a password manager or the
browser's own keychain (with Face ID or Touch ID) fills it in.

**Store a hash, not the password.** `node src/hash-password.mjs` in the container asks for the
password and prints a `scrypt:` hash; put that in the variable, or in a file named by
`DASHBOARD_ACTION_PASSWORD_FILE` (a Docker secret):

```sh
docker exec -it dashboard node src/hash-password.mjs
```

```yaml
# compose.yaml
services:
  dashboard:
    environment:
      DASHBOARD_ACTION_PASSWORD: "scrypt:16384:8:1:..."   # the printed line, or the password itself
```

- **Scripts inside the container** (a button's `curl http://127.0.0.1:3000/api/...`) are not
  asked: a request from 127.0.0.1 without a proxy header comes from the container itself. A
  reverse proxy on the same machine with host networking must send `X-Forwarded-For` (they all
  do by default), or its visitors count as the container too.
- **Guessing is slowed down:** after five wrong passwords from one address it waits 30 seconds,
  doubled each time (up to 15 minutes). Each wrong one is in the log.
- **Open the dashboard over HTTPS** when it asks for a password: over plain HTTP the password
  crosses the network as it is.
- A file named by `DASHBOARD_ACTION_PASSWORD_FILE` that cannot be read keeps these presses
  locked (the log says why), rather than leaving them open.
- Labels of a discovered container cannot set `confirm: none`.

It guards the presses, not the page: anyone who can open the dashboard still sees it. Put it
behind a login (a forward-auth proxy) to keep the page itself private.

### Widget worker

Installed widgets run in a worker thread with a memory limit, so one that hangs cannot stop the
dashboard. `DASHBOARD_WIDGET_MEMORY_MB` sets the limit (default 256); `DASHBOARD_WIDGET_ISOLATION=off` runs them
in the dashboard process instead.

### Scripts as root

The [button](../widgets/collection/button.html)
widget runs its script as the dashboard's user (`node`, uid 1000). A button with `user: root`
runs it as root inside the container, for scripts that write files owned by root. That only works
with `DASHBOARD_ALLOW_ROOT_SCRIPTS: "true"` on the container: the image then lets `node` start one fixed
runner (`/usr/local/bin/dashboard-root`) through sudo. Without it such a button shows that it needs the
variable. The container must start as root (the default; not `--user 1000`), since that is when
the rule is written. Every installed widget could use the runner once it is on, and anyone who can
open the page can press the button, so turn it on only for a dashboard you trust and keep behind
authentication.

```yaml
# docker-compose.yml
services:
  dashboard:
    environment:
      DASHBOARD_ALLOW_ROOT_SCRIPTS: "true"
```
