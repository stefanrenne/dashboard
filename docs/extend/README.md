# Extend

Every widget on the dashboard is a package, and anyone can write one: a folder with a
`widget.yaml` and a `server.js`, run from your config folder or installed from a git repository
or npm. Nobody has to merge a pull request here first.

| Page | What |
|---|---|
| [Custom widget](custom-widget/README.md) | Writing a widget: as a [local](custom-widget/local.md) folder, or as a [remote](custom-widget/remote.md) package others install |
| [API reference](api-reference.md) | `widget.yaml`, the `ctx` passed to `server.js`, the result format, `client.js` |
| [Security](security.md) | What a widget can do, how secrets stay on the server, advice for users |
| [Contributing](contributing/README.md) | Working on the dashboard itself |
