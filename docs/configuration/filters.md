# Filters

`filter:` on a service in [`services.yaml`](services.md) hides its card while an expression is
true; on one of its widgets it hides that widget. The expression reads the **attributes** its
widgets and status checks publish: public values a widget declares for this (the Filter
attributes table on each [widget's page](../widgets/README.md) lists them), apart from the blocks
it shows. For example, a Shelly device that only appears while a firmware update is waiting:

```yaml
- Devices:
    - Shelly Bureau:
        href: http://shelly-bureau.lan
        filter: widget.update == false          # hidden while there is no update
        widget:
          type: shelly
          url: http://shelly-bureau.lan
          password: "{{HD_VAR_SHELLY_PASSWORD}}"
```

## The expression

- **An attribute**: `widget.<name>` reads the attributes of all the service's widgets together,
  so it works the same with one widget or several. When two widgets publish the same name, the
  first one on the card counts. To read one widget only: `widgets[1].<name>` (by position,
  from 0) or `widgets.shelly.<name>` (the first widget of that type).
- **A status check**: `container.<name>`, `ping.<name>` and `siteMonitor.<name>` read the
  service's `container:`, `ping:` or `siteMonitor:` check rather than a widget on the card (see
  [Container health](#container-health) and [Devices that do not answer](#devices-that-do-not-answer)).
- **A value**: `true`, `false`, `null`, a number, `'text'` or `"text"`.
- **Comparing**: `==`, `!=`, `<`, `<=`, `>`, `>=` (`<` and `>` only between numbers).
- **Combining**: `&&` (and), `||` (or), `!` (not), and parentheses:
  `filter: widget.update == false && widget.queued == 0`.

A bare attribute is true while its value is: `filter: container.healthy` is the same as
`filter: container.healthy == true`.

## Attributes of the status checks

A service's status checks publish these, whatever widgets it has. The attributes of a widget on
the card differ per widget: see its page under Filter attributes. Most widgets also publish
`attention` there, true while the card marks something as needing attention.

**`container.<name>`**, the service's `container:` (Docker):

| Attribute | Type | Value |
|---|---|---|
| `healthy` | boolean | true while Docker's healthcheck reports healthy; false without a healthcheck or while stopped |
| `unhealthy` | boolean | true while Docker's healthcheck reports unhealthy |
| `status` | text | `up`, `warn` (running but unhealthy, or a Swarm service with too few tasks) or `down` |
| `attention` | boolean | true while the label marks a problem |

**`ping.<name>`**, the service's `ping:`:

| Attribute | Type | Value |
|---|---|---|
| `attention` | boolean | true while the host does not answer |
| `status` | text | `up` or `down` |
| `latency` | number | the answer time in ms; `null` without an answer |

**`siteMonitor.<name>`**, the service's `siteMonitor:` (HTTP):

| Attribute | Type | Value |
|---|---|---|
| `attention` | boolean | true while it is not up: 5xx, another 4xx or no connection (2xx, 3xx and 401/403, a login in front of it, are up) |
| `status` | text | `up`, `warn` (another 4xx) or `down` |
| `code` | number | the HTTP status code, such as 200; `null` without a connection |
| `latency` | number | the answer time in ms; `null` without a connection |

Before a check has answered every attribute is `null`, and the card stays hidden; when the check
itself fails, the card is shown.

## While it waits, and when it fails

An attribute no widget sent counts as `null`, so `widget.update == false` is not true
before the widget knows. Until the widgets the filter reads have answered, the card stays hidden;
when one of them fails, the card is shown, so a broken service never disappears quietly. A group
whose cards are all hidden is hidden too, and a hidden card is no search hit. While filters
hide cards, the footer says how many ("3 hidden"); a click shows them, dimmed, until the next click.

## Container health

Whether a service is healthy is decided by its container, not by a widget, so `container.<name>`
reads the attributes of the service's `container:` check: `healthy` and `unhealthy` follow the
container's Docker healthcheck (both `false` for a container without one, or one that is not
running), and `status` is the label's `up`, `warn` or `down`. To show a service only while
something is wrong with it:

```yaml
- Media:
    - Plex:
        href: http://plex.lan:32400
        container: plex
        filter: container.healthy               # hidden while Docker reports it healthy
```

`filter: "!container.unhealthy"` also hides containers without a healthcheck (in quotes: YAML
reads a leading `!` as a tag). Discovered Docker services have `container:` already, so the label
`homelab.filter=container.healthy` works there.

## Devices that do not answer

`ping.<name>` reads the service's `ping:` check: `attention` is true while the host does not
answer. `siteMonitor.<name>` reads the HTTP check the same way: `attention` is true while it is
not up. To hide a device while it is off:

```yaml
- Living room:
    - Sonos:
        ping: sonos.lan
        filter: ping.attention                 # hidden while it does not answer
```

`filter: ping.attention == false` does the opposite: the card only shows while the device is down.

## A widget's filter

`filter:` on one entry of `widgets:` hides that widget instead of the card, in the same language
and reading the same attributes. For example a button that only shows while there is something to
update:

```yaml
- Docker:
    - Wud:
        widgets:
          - type: whatsupdocker
            url: http://wud:3000
          - type: button
            text: Update containers
            filter: widgets.whatsupdocker.updates == 0   # hidden while there is nothing to update
            timeout: 900
            command: >-
              curl -fsS http://wud:3000/api/containers
              | jq -r '.[] | select(.updateAvailable) | .id'
              | while read -r id; do
                  curl -fsS -X POST "http://wud:3000/api/containers/$id/triggers/docker/update" >/dev/null || exit 1;
                done
```

The widget behaves as a filtered card: hidden until the widgets its filter reads have answered,
and shown when one of them fails. A hidden widget keeps refreshing, since other filters may read
it. The footer's "hidden" is about whole cards: it does not count a hidden widget. It works on
service widgets only (a header widget such as `search` keeps its own options), and a widget that
has an option named `filter` itself keeps that option.

## Discovered services

Discovered services take filters too: as the Docker label `homelab.filter` (see
[Docker](docker.md#discovery)), or as the Kubernetes annotation `homelab.dev/filter` on an
Ingress (see [Kubernetes](kubernetes.md#discovery); `homelab.dev/` is the annotations' prefix, not
a web address). A widget's filter is `homelab.widgets[1].filter`:

```yaml
# compose.yaml: Compose's list form keeps the quotes and && of an expression simple
labels:
  - homelab.name=Shelly Bureau
  - homelab.filter=widget.update == false

# an Ingress
metadata:
  annotations:
    homelab.dev/enabled: "true"
    homelab.dev/filter: widget.update == false
```

## Recipes

A filter hides a card while all is well, so the dashboard shows what needs a look:

```yaml
- Media:
    - Radarr:                                   # only while it marks something, such as a blocked import
        href: http://radarr.lan:7878
        filter: widget.attention == false
        widget: { type: radarr, url: http://radarr.lan:7878, key: "{{HD_VAR_RADARR_KEY}}" }
    - Updates:                                  # only while a container has an update
        filter: widget.updates == 0
        widget: { type: whatsupdocker, url: http://wud.lan:3000 }
- Infrastructure:
    - Proxmox:                                  # only while a VM is stopped
        href: https://pve.lan:8006
        filter: widget.vmsStopped == 0
        widget: { type: proxmox, url: https://pve.lan:8006, username: "{{HD_VAR_PVE_USER}}", password: "{{HD_VAR_PVE_TOKEN}}" }
    - Speedtest:                                # only while the last test was slower than 100 Mbit/s
        filter: widget.download > 100
        widget: { type: speedtest, url: http://speedtest.lan }
    - Uptime Kuma:                              # only while a monitor is down
        filter: widget.down == 0
        widget: { type: uptimekuma, url: http://kuma.lan:3001, slug: home }
    - Plex:                                     # only while its container is not healthy
        container: plex
        filter: container.healthy
    - NAS:                                      # only while it does not answer
        ping: nas.lan
        filter: ping.attention == false
```

The attributes each widget publishes are on its page under Filter attributes.

## Mistakes

A mistake in the expression (`widget.update false`), a widget that is not on the service
(`widgets.radarr.queued` on a Shelly), `container.healthy` without `container:` or a secret in it
are config errors; the service (or widget) is then shown unfiltered. An attribute the widget does
not publish is a warning. The filter goes to the browser, so it cannot hold a `{{HD_VAR_*}}` value.
