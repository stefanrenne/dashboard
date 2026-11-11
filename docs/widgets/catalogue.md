# Widget catalogue

Widget packages outside the [widgets collection](https://github.com/stefanrenne/dashboard-widgets):
written and published by others, installed through `plugins:` in
[settings.yaml](../configuration/settings.md#plugins). They run on your server with the
dashboard's rights: read [Security](../extend/security.md) and look at the source before you add one.

| Package | Widgets | What it shows | `plugins:` |
|---|---|---|---|
| [dashboard-widget-example](https://github.com/stefanrenne/dashboard-widget-example) | `example-counter` | A number from a JSON API, with its change since the last refresh. The starting point for a widget of your own. | `source: git+https://github.com/stefanrenne/dashboard-widget-example#latest` |

```yaml
# settings.yaml
plugins:
  - source: git+https://github.com/stefanrenne/dashboard-widget-example#latest
```

Wrote one yourself? See [Remote widget › Get listed](../extend/custom-widget/remote.md#4-get-listed).
