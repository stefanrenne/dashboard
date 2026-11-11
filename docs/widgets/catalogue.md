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

## Add yours

Published a [remote widget](../extend/custom-widget/remote.md)? Open a pull request on the
[dashboard repository](https://github.com/stefanrenne/dashboard) that adds a row to the table above
(`docs/widgets/catalogue.md`), in alphabetical order. A package is listed when it:

- is public: a git repository with release tags, or an npm package;
- targets the current widget API (`apiVersion: 2` in its widget.yaml);
- has a README as [Remote widget › Document it](../extend/custom-widget/remote.md#2-document-it) describes;
- keeps keys and passwords in `secret: true` options, and marks options that run something or
  reach elsewhere `discoverable: false` (see the [API reference](../extend/api-reference.md#option-schema)).

A listing says the package exists, not that it was reviewed.
