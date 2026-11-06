# From homepage

Dashboard reads [homepage](https://gethomepage.dev)'s configuration as it is: its files, its
Docker labels and Kubernetes annotations, and its variables. Moving over is mostly a matter of
swapping the image.

## Switch the container

```diff
 # compose.yaml
 services:
-  homepage:
-    image: ghcr.io/gethomepage/homepage:latest
+  dashboard:
+    image: ghcr.io/stefanrenne/dashboard:latest
     ports:
       - 3000:3000
     volumes:
-      - ./config:/app/config
+      - ./config:/config                            # the same folder, at another path
       - /var/run/docker.sock:/var/run/docker.sock:ro
     environment:
       HOMEPAGE_VAR_RADARR_KEY: 0123456789abcdef     # keeps working, as do HOMEPAGE_FILE_*
-      HOMEPAGE_ALLOWED_HOSTS: dash.lan              # not read: add the name on the settings page
```

On its first start the dashboard installs its widgets, the
[widgets collection](https://github.com/stefanrenne/dashboard-widgets), from GitHub, so the
container needs to reach github.com. It reads only from Docker: give it a
[docker-socket-proxy](docker.md#discovery) rather than the socket itself.

## What carries over as it is

| homepage | In Dashboard |
|---|---|
| `services.yaml` | Groups and nested groups; `href`, `icon`, `description`, `siteMonitor`, `ping`, `container` with `server`, `app` with `namespace` and `podSelector`, `proxmoxNode` with `proxmoxVMID`; `widget:` and `widgets:` with `fields`, `refreshInterval`, `hide_errors`, `highlight` and `provider` |
| `widgets.yaml` | The info widgets: `datetime`, `greeting`, `logo`, `openmeteo`, `openweathermap`, `resources`, `search`, `kubernetes`, `glances`, `longhorn`, `stocks`, `unifi_console` |
| `bookmarks.yaml` | As it is |
| `settings.yaml` | `layout` (columns, style, tabs, nested groups), `theme`, `color`, `background`, `cardBlur`, `quicklaunch`, `providers`, `statusStyle`, `showStats`, `target`, `hideVersion`, ... (see [Settings](settings.md)) |
| `docker.yaml`, `kubernetes.yaml`, `proxmox.yaml` | The same servers, cluster and nodes |
| `homepage.*` Docker labels | Discovered as they are (see [Docker](docker.md#discovery)) |
| `gethomepage.dev/*` annotations | Discovered as they are (see [Kubernetes](kubernetes.md#discovery)) |
| `{{HOMEPAGE_VAR_*}}`, `{{HOMEPAGE_FILE_*}}` | Filled in from the environment, and kept secret (see [Variables](README.md#variables)) |
| `icons/` | `icon: /icons/name.svg` as before |

Every homepage service widget has a counterpart in the widgets collection under the same name,
also homepage's own spellings such as `customapi`, `overseerr`, `jellyseerr`, `unifi_console` and
`unifi_drive`. Each [widget's page](../widgets/README.md) lists its options.

## What is different

- **`custom.css` and `custom.js`** are loaded as in homepage, but the page underneath is another
  one: selectors written for homepage's markup do not match. Rewrite them against the dashboard's
  theme properties (`--dash-card`, `--dash-text`, ...) and classes (see
  [Custom CSS & JS](custom-css-js.md)).
- **Allowed hosts** are checked as in homepage, but they live in settings.yaml (`allowedHosts`,
  or the settings page) instead of `HOMEPAGE_ALLOWED_HOSTS`, which is not read. Unlike homepage,
  IP addresses always work (see [Allowed hosts](README.md#allowed-hosts)).
- **Widgets are packages.** They come from the widgets collection, which updates itself to its
  newest release; `plugins:` in `settings.yaml` pins a release or adds widgets of others (see
  [Settings](settings.md)).

## Once you are over

Nothing has to change: the homepage forms keep working. Dashboard's own names sit next to them
for new configuration: `{{DASHBOARD_VAR_*}}` and `{{DASHBOARD_FILE_*}}`, Docker labels
`dashboard.*` and Kubernetes annotations `getdashboard.dev/*`. And there is more than homepage
has: [filters](filters.md) that show a card only while something needs a look, buttons that run
a script, `!include` to split up a long `services.yaml` (see
[Including other files](README.md#including-other-files)), and widgets anyone can publish
(see [Extend](../extend/README.md)).
