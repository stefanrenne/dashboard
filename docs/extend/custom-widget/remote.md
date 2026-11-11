# A remote widget

A remote widget lives in a git repository or an npm package. Users add it with one line under
`plugins:`; the dashboard downloads it, pins the version in `plugins/plugins.lock.yaml` and runs
it. The widget is written as [a local one](local.md); this page is about the repository around it.

## 1. Start from the example repository

Start from [dashboard-widget-example](https://github.com/stefanrenne/dashboard-widget-example)
(**Use this template** on GitHub): the same widget as
[`examples/widget-template`](../../../examples/widget-template), set up as a repository with tests
that run without the dashboard and CI that releases a version tag, so users can install it with
`#latest`. Then give it your widget's id:

```bash
npm run rename -- my-nas --name "My NAS"
```

That renames `example-counter` everywhere: the `id` and `name` in `widget.yaml`, the `dash-<id>`
element in `client.js`, `name` in `package.json` (`dashboard-widget-<id>`), the README and the tests.

While you write it, point a test dashboard at your clone with `path:` (see
[a local widget](local.md#5-add-it-to-the-dashboard)).

## 2. Document it

Give the widget a `README.md` in its folder, in the format of the
[widgets collection](https://github.com/stefanrenne/dashboard-widgets), so users find
the same things in the same place:

1. `# <name>`, as in `widget.yaml`.
2. What it shows, and what the user must set up in the service: where the API key is, which ids
   to fill in, when an option is only needed with authentication on.
3. `## Fields`: every block `key`, so users know what to put in `fields:`.
4. `## Example`: a complete `services.yaml` entry, with the key through `{{DASHBOARD_VAR_...}}`.

Give each option in `widget.yaml` a line comment when its name does not explain it
(`url: { type: url, required: true }   # e.g. http://radarr:7878`).

## 3. Publish

- **git**: push, tag `v1.0.0` (match `version` in widget.yaml). The example repository's CI
  makes a GitHub release of each tag.
- **npm**: `npm publish` (add the keyword `dashboard-widget`). A package with a
  `package.json` needs `"type": "module"`.

Bump `version` on every release; the dashboard installs each version in its own folder.

## 4. Get listed

Add a row to the [Catalogue](../../widgets/catalogue.md) with a pull request on the
[dashboard repository](https://github.com/stefanrenne/dashboard) (`docs/widgets/catalogue.md`,
in alphabetical order). A package is listed when it:

- is public: a git repository with release tags, or an npm package;
- targets the current widget API (`apiVersion: 2` in its widget.yaml);
- has a README as in [2. Document it](#2-document-it);
- keeps keys and passwords in `secret: true` options, and marks options that run something or
  reach elsewhere `discoverable: false` (see the [API reference](../api-reference.md#option-schema)).

A listing says the package exists, not that it was reviewed.

## 5. How users install it

```yaml
# settings.yaml
plugins:
  - source: git+https://github.com/you/dashboard-widget-my-nas#v1.0.0    # a tag, a branch or a 40-character commit
  - source: git+https://github.com/you/dashboard-widget-my-nas#latest    # the newest release tag, checked hourly
  - source: npm:dashboard-widget-my-nas@1.0.0
  - source: git+https://github.com/you/widgets#v3.0.0
    subdir: widgets/my-nas                                        # one widget of a repository with several
  - source: git+https://github.com/you/widgets#v3.0.0
    only: [my-nas, my-router]                                     # a collection: only these folders
```

A repository without `widget.yaml` at its root is a collection: every folder with a
`widget.yaml` directly in it, or in its `widgets/` folder, is installed. See
[Plugins](../../configuration/settings.md#plugins) for updates, the lock file and `pluginUpdateInterval`.

Users run your code on their server: see [Security](../security.md) for what a widget can reach and
what to tell your users.
