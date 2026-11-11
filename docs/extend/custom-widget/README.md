# Custom widget

Every widget on the dashboard is a package: a folder with a `widget.yaml` and usually a
`server.js`. Even the widgets behind the dashboard's own service fields (`siteMonitor:`,
`container:`, ...) come from the [widgets collection](https://github.com/stefanrenne/dashboard-widgets)
this way, so anything they do, a widget of yours can do too. Nobody has to merge a pull request
here first.

```
my-widget/
  widget.yaml     the manifest: id, name, apiVersion, options
  server.js       fetch(ctx): asks your service, returns blocks
  client.js       optional: a Web Component for a look of its own
  i18n.json       optional: labels in the dashboard's languages
```

A widget is written the same way wherever it lives; only how the dashboard gets it differs. Both
are listed under `plugins:` in [settings.yaml](../../configuration/settings.md#plugins).

| | Where | For |
|---|---|---|
| [Local widget](local.md) | A folder next to your config, `path: ./my-widgets/x` | Something only you need, or trying out a widget while you write it. Start here: it walks through writing one. |
| [Remote widget](remote.md) | A git repository or an npm package, `source: git+https://...#v1.0.0` | Sharing it: others install it with one line, pinned to a version, and it can be listed in the [Catalogue](../../widgets/catalogue.md). |

The [API reference](../api-reference.md) has every field of `widget.yaml`, `ctx` and the result;
[Security](../security.md) what a widget can reach.
