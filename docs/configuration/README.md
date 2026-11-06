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

## First start

The image starts the setup wizard when `/config` is empty: it writes the file `.onboarding`, and
while that is there the page opens at `/setup`. The wizard has five steps:

1. **Basics**: title, language, theme and colour (`settings.yaml`).
2. **Docker**: the Docker servers it can reach (a mounted socket, or `docker.yaml` once there is
   one), each with its version and number of containers, or the error it got; a socket it may not
   use gets a hint (start the container as root, the default, or use a socket proxy). Add a socket
   path or the `host:port` of a docker-socket-proxy or Docker API, and it is checked at once;
   what you add is written to `docker.yaml`, with the mounted socket.
3. **Services**: the running containers of those servers, each with the widget that fits its
   image (`linuxserver/radarr` gets `radarr`) and its address: the container's name when it
   shares a network with the dashboard, its own address on a macvlan or ipvlan network (Unraid's
   `br0`), or the published port. Tick the ones you want, fill in what the widget needs (a key),
   and **Test** shows whether it answers. **Next** checks every ticked service first: a name, a
   link (the published address, else the widget's URL, editable), the widget's required options,
   and a test of the widget; one that fails is marked in red with its error, and the wizard stays
   until it is fixed or unticked. Containers with `dashboard.*` labels are on the page already and
   left out. **Add a service by hand** adds one without a container; **Migrate from
   homepage** takes homepage's `services.yaml`, `settings.yaml`, `bookmarks.yaml`,
   `widgets.yaml` and `docker.yaml`, shows what carries over (and which widgets have no match),
   and writes them as they are in place of what the wizard would write (`services.yaml`).
4. **Security**: the [admin password](#admin-password) (required, at least 8 characters; only its
   hash is written), whether the dashboard shows a [login page](#login-page) or asks only for some
   presses, and the [allowed hosts](#allowed-hosts) (the name you opened the wizard by, when it is
   one). All three go into `settings.yaml`. **Skip the setup** on the first step leads here too.
5. **Done**: it writes `settings.yaml`, `services.yaml`, `widgets.yaml` (the time, the system's
   resources and a search box), `bookmarks.yaml`, `docker.yaml` and `kubernetes.yaml`, removes
   `.onboarding` and opens the dashboard. It writes nothing when one of those files is there
   already.

A key or password you enter is written into `services.yaml` as it is; to keep it out of the file,
put `{{DASHBOARD_VAR_NAME}}` in its place and set the variable on the container (see
[Variables](#variables)). **Skip the setup** writes the same files with no services.

On the local network (a private address, also through a reverse proxy whose visitors are on it)
the wizard opens straight away. From anywhere else it asks for the code the dashboard writes in
its log at the start (`docker logs dashboard`). Wrong codes are slowed down. Once the wizard is
done, `/setup` is gone; it never shows for a config folder that has files. To see it again, empty
the folder and restart the container.

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
- **On the settings page** an included file is a file of its own, edited and saved there; the
  `!include` in the main file stays as it is. A save is checked as part of the main file, and
  secrets in it are hidden by the main file's rules (a file included under `providers:` is secret
  as a whole).

Files are only read where an `!include` names them: a `media.yaml` next to `services.yaml` does
nothing by itself. `!include` is this dashboard's own; homepage does not read it.

## Environment variables

Settings of the container rather than of the page.

| Variable | What |
|---|---|
| `DASHBOARD_VAR_*`, `DASHBOARD_FILE_*` | Values for `{{DASHBOARD_VAR_*}}` and `{{DASHBOARD_FILE_*}}` (see [Variables](#variables)) |
| `DASHBOARD_WIDGET_MEMORY_MB`, `DASHBOARD_WIDGET_ISOLATION` | The widget worker (see [Widget worker](#widget-worker)) |
| `DASHBOARD_ALLOW_ROOT_SCRIPTS` | Button scripts as root (see [Scripts as root](#scripts-as-root)) |
| `DASHBOARD_WATCH_POLL` | Check the config files every so many seconds, for network shares |
| `DASHBOARD_CONFIG_DIR` | The config folder, when not run from the image |
| `LOG_TARGETS` | `both`, `stdout` or `file` (with `logpath` in [settings.yaml](settings.md)) |

### Settings page

The gear in the footer opens `/settings`: the page's look (title, language, theme, colour, the
header widgets' box, where links open, the status labels), the security (the login page or only
some actions, how long a login and an unlock last, the allowed hosts), the admin password and a
few switches (the versions in the footer, the update check, search engines). It writes them into
`settings.yaml`, keeping your comments and every key it does not show (`layout`, `plugins`,
`providers`, ...), which it names; the dashboard follows at once.

The other sections (Services, Header widgets, Bookmarks, Docker, Kubernetes, Proxmox, and
Advanced for `settings.yaml` itself) show their file as text, with its comments, and the files
it includes. A save is checked first: a mistake is shown with its file and path and nothing is
written. Secrets written in a file appear as `__SECRET_…__` and stay as they were; if the file
was changed elsewhere in the meantime, the page says so instead of overwriting it. The previous
versions are kept under `.history/` in the config folder (the last ten per file), and one can
be loaded back into the editor. The section is in the address (`/settings#services`).

- It opens with the [admin password](#admin-password); a login counts, and the browser stays
  unlocked as after a press (`actions.remember`).
- A new admin password needs the current one, every time; then every other login ends. Set in
  the container's environment, it is changed there.
- **Without an admin password yet** (a dashboard set up before the setup wizard), the page asks
  to set one first, and only on the local network; nothing else is saved before it.

### Allowed hosts

`allowedHosts` in [settings.yaml](settings.md) lists the host names you open the dashboard by.
The setup wizard writes it, and the [settings page](#settings-page) adds and removes names (open
the dashboard by its IP address to get there). There is no environment variable for it
(`DASHBOARD_ALLOWED_HOSTS` is no longer read).

```yaml
# settings.yaml
allowedHosts: [dash.lan, dash.example.com]   # every name you open it by
```

- **Always answered**: `localhost`, `127.0.0.1`, `[::1]` (the image's health check uses them)
  and any IP address (`http://192.168.1.10:3000`), with or without the list.
- **A host name** (`dash.lan`, the name your reverse proxy passes on) is only answered when it is
  in the list. Otherwise the browser shows a page that says which line to add, with the name it was
  opened by. An API call gets a 403. A change of `settings.yaml` counts at once.
- **Ports**: an entry without a port allows every port (`dash.lan`); with one, only that port
  (`dash.example.com:8443`).
- **`*`** answers every host, as before this check. Only use it when something else checks the
  host, such as a reverse proxy that answers your names only; the log warns about it. Nothing
  else can make up for it: to the browser a rebinding page is the dashboard's own site.

This stops DNS rebinding: a web page that points a name of its own at your network would
otherwise be the same site as the dashboard to your browser, and could read it and press its
buttons. Such a page always uses its own name, never an IP address, so IP addresses stay safe.

### Admin password

The admin password guards what runs something, and with `login: true` the whole page. It is
`adminPassword` in [settings.yaml](settings.md): **only its scrypt hash**, never the password
itself (a plain one is refused, and what it guards stays locked). The setup wizard writes it, the
[settings page](#settings-page) changes it, and `node src/hash-password.mjs` in the container
asks for a password and prints a new hash:

```sh
docker exec -it dashboard node src/hash-password.mjs
```

```yaml
# settings.yaml
adminPassword: "scrypt:16384:8:1:..."   # the printed line
```

There is no environment variable for it (`DASHBOARD_ADMIN_PASSWORD` and
`DASHBOARD_ADMIN_PASSWORD_FILE` are no longer read). Next to the password, a
[passkey](#passkeys) works too.

These presses ask for it:

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

- **Scripts inside the container** (a button's `curl http://127.0.0.1:3000/api/...`) are not
  asked: a request from 127.0.0.1 without a proxy header comes from the container itself. A
  reverse proxy on the same machine with host networking must send `X-Forwarded-For` (they all
  do by default), or its visitors count as the container too.
- **Guessing is slowed down:** after five wrong passwords from one address it waits 30 seconds,
  doubled each time (up to 15 minutes). Each wrong one is in the log.
- **Open the dashboard over HTTPS** when it asks for a password: over plain HTTP the password
  crosses the network as it is.
- Labels of a discovered container cannot set `confirm: none`.

### Login page

With `login: true` in [settings.yaml](settings.md) the page itself asks for the admin password:
whoever opens the dashboard sees a login page first, and every API call without a session gets a
401. Logged in counts as unlocked: buttons ask nothing more, except those with `confirm: always`.
The logout is in the footer.

```yaml
# settings.yaml
login: true              # or { remember: 30d }
```

- **A session lasts a week** (`remember`) and each visit moves its end on: a dashboard you open
  every day keeps you logged in. A week without a visit ends it.
- **Sessions live on the server**, in `.sessions.json` in the config folder (hashes of the
  tokens only, readable by the dashboard alone): the server checks every request, they last
  through a restart or an update, a logout ends one for good (also if its cookie was copied), and a
  new admin password ends them all.
- The cookie is `HttpOnly` and `SameSite=Lax` (`Secure` over HTTPS): a link to the dashboard
  from elsewhere opens it logged in, while the endpoints that change something keep needing a
  header no other site can send.
- **Still open**: `/api/health` (the image's health check) and `robots.txt`; and, as for the
  presses, scripts inside the container.
- Without an admin password, `login: true` does nothing but say so in the messages.

### Passkeys

Next to the admin password, a passkey (your fingerprint, face or a PIN, on this device or your
phone) works wherever the dashboard asks for authentication: the login page, the settings and the
buttons. Add one on the [settings page](#settings-page), under Passkeys. Where one can be used,
the dashboard asks for it at once; cancel it to type the admin password, which keeps working. A
new password leaves the passkeys as they are.

- **Over HTTPS, by a host name only.** Browsers offer passkeys in a secure context only, and a
  passkey belongs to the host name it was added on: one made on `https://dash.example.com` works
  there, not on `https://dash.lan` or an IP address. Behind a reverse proxy, the proxy passes
  `X-Forwarded-Proto: https` and keeps the `Host` header (most do by default).
- **Stored in `.passkeys.json`** in the config folder: the public keys only, readable by the
  dashboard alone. Remove a passkey on the settings page; deleting the file removes them all.
- The passkey has to verify you (user verification), and wrong tries are slowed down as for the
  password.

### Authentication in front

The [login page](#login-page) closes the dashboard with one password (and passkeys). For accounts
of your own, single sign-on or a second factor, put an authenticating proxy in front instead, or
as well: Authelia, Authentik, Cloudflare Access, oauth2-proxy. The dashboard needs nothing for it;
it sees only requests the proxy let through.

```yaml
# compose.yaml: Traefik with Authelia's forward auth
services:
  dashboard:
    image: ghcr.io/stefanrenne/dashboard:latest
    volumes: [./config:/config]
    # no ports: only the proxy reaches it
    labels:
      - traefik.http.routers.dashboard.rule=Host(`dash.example.com`)
      - traefik.http.routers.dashboard.middlewares=authelia@docker   # the forwardAuth middleware from Authelia's own labels
      - traefik.http.services.dashboard.loadbalancer.server.port=3000
```

```text
# Caddyfile: the same with Caddy
dash.example.com {
  forward_auth authelia:9091 {
    uri /api/authz/forward-auth
    copy_headers Remote-User Remote-Groups Remote-Email Remote-Name
  }
  reverse_proxy dashboard:3000
}
```

Authentik's proxy outpost works the same (its forward-auth middleware in Traefik, or
`forward_auth` to the outpost in Caddy). With Cloudflare Access, add an Access application for the
host name and let the tunnel point at `http://dashboard:3000`.

- **Publish no port of the dashboard** (no `ports:`), or bind it to `127.0.0.1`: the dashboard
  always answers IP addresses, so `http://<server>:3000` would go around the proxy.
- Add the host name to [Allowed hosts](#allowed-hosts).
- Leave everything behind the proxy, `/api/health` included: the image's health check calls it
  inside the container, not through the proxy.
- `/api/events` is a stream that stays open: a proxy that buffers responses (nginx: `proxy_buffering
  off;` for it) delays the page's reloads otherwise.
- Behind a proxy every request comes from the proxy's address, so wrong admin passwords are
  slowed down for everyone at once. Keep the [admin password](#admin-password) for the buttons
  anyway: the proxy decides who sees the page, the password who presses `user: root`.

### Widget worker

Installed widgets run in a worker thread with a memory limit, so one that hangs cannot stop the
dashboard. `DASHBOARD_WIDGET_MEMORY_MB` sets the limit (default 256); `DASHBOARD_WIDGET_ISOLATION=off` runs them
in the dashboard process instead. The worker's environment leaves out the `DASHBOARD_VAR_*` and
`DASHBOARD_FILE_*` variables (and `HOMEPAGE_`): a widget gets the values the config gives it,
through its options, not every one.

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
