# Tabs

The settings page edits tabs under Tabs; a group's tab is chosen under Groups and a header
widget's under Header widgets.

Tabs split the dashboard into pages: a tab bar under the header, and each tab shows its own
groups and header widgets. Groups and header widgets without a tab are on every tab, so a search
box or a group of tools can stay put while the rest changes.

Each tab has its own address: `#` and its name in lowercase, with spaces as `%20`
(`http://dashboard.lan/#media`, `http://dashboard.lan/#home%20lab`). Use it for a bookmark, a
browser start page, `startUrl` or a [PWA shortcut](settings.md). Without a `#`, the page opens on
the tab marked `default`, or else on the first one.

## The tabs

`tabs:` in `settings.yaml` lists the tabs in the order of the tab bar. A tab is just its name, or
a map with a `name`, an `icon` and `default`:

```yaml
tabs:
  - Home
  - name: Media
    icon: mdi-play-circle     # any icon a service takes: mdi-, si-, sh-, dashboard-icons, /icons/...
    default: true             # opens without a # in the address (one tab)
  - name: Lab
    icon: proxmox.svg
```

`tabs:` is optional. A tab a group names (see below) is a tab too: those that `tabs:` does not
list follow it, in the order of the `layout` block. homepage's configuration, which has no
`tabs:`, keeps working as it is.

## Groups on a tab

A group gets its tab in the `layout` block of `settings.yaml`, as in homepage. This works for
service groups and bookmark groups alike. A nested group is on its parent's tab.

```yaml
layout:
  Infrastructure:
    tab: Lab
  Media:
    tab: Media
  Developer:          # a bookmark group
    tab: Home
  Tools:              # no tab: on every tab
    style: row
```

### Discovered groups

A container or Ingress can put its group on a tab with the `tab` label (Docker) or annotation
(Kubernetes). It is used when the `layout` block gives that group no tab; when two services of
one group name different tabs, the first one counts and the other gets a warning.

```yaml
labels:
  dashboard.name: Jellyfin
  dashboard.group: Media
  dashboard.tab: Media
```

```yaml
annotations:
  getdashboard.dev/enabled: "true"
  getdashboard.dev/group: Monitoring
  getdashboard.dev/tab: Lab
```

## Header widgets on a tab

A widget in [`widgets.yaml`](header-widgets.md) takes `tab:` with a tab name, or a list of them
for several tabs. Without it, it is on every tab. The header box is left out on a tab without
any header widget.

```yaml
- datetime:
    dateStyle: long                # every tab
- resources:
    cpu: true
    memory: true
    tab: Lab
- openmeteo:
    latitude: 52.37
    longitude: 4.89
    tab: [Home, Media]
```

A name that is no tab gives a warning; a widget whose names are all unknown is shown on every
tab. A widget that declares an option called `tab` itself gets the value as its own option.

## On the settings page

Under **Tabs** you add, rename, reorder and remove tabs, give them an icon and choose the one
that opens first. Saving writes `tabs:` only when it is needed (an icon, a default, an order of
its own, or a tab no group names yet).

- **Renaming** a tab moves its groups and header widgets with it: `settings.yaml` and
  `widgets.yaml` are both updated.
- **Removing** a tab puts its groups and header widgets on every tab.

The **Tab** field of a group (under Groups) and the **Shown on** boxes of a header widget (under
Header widgets) choose from these tabs.

## Refreshing

Widgets on a tab that is not shown do not ask for data. They ask as soon as their tab opens, and
from then on at their normal interval.
