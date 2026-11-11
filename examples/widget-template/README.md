# Example counter (widget template)

A starting point for your own dashboard widget. Copy this folder into its own
repository, change `id`, `name` and the code, and publish it. The same widget as a complete
repository, with tests and a release workflow: [dashboard-widget-example](https://github.com/stefanrenne/dashboard-widget-example).

## Use it

```yaml
# settings.yaml
plugins:
  - source: git+https://github.com/you/dashboard-widget-example-counter#v1.0.0
  # or: - source: npm:dashboard-widget-example-counter@1.0.0
  # or, while developing: - path: ./my-widgets/example-counter

# services.yaml
- Apps:
    - My app:
        href: http://app.lan
        widget:
          type: example-counter
          url: http://app.lan/api/
          key: "{{DASHBOARD_VAR_APP_KEY}}"
```

## Files

| File | Required | What |
|---|---|---|
| `widget.yaml` | yes | Manifest: id, version, apiVersion, refresh, options schema |
| `server.js` | no | Fetches data on the server; may use secret options |
| `client.js` | no | Custom rendering as a Web Component `dash-<id>`; without it the dashboard renders `blocks` |
| `i18n.json` | no | Labels per language (`en`, `nl`, `fr`, `de`, `es`) |
| `assets/` | no | Static files for `client.js`, served at `/widgets/<id>/assets/` |

Release by tagging a version (`git tag v1.0.0`) or `npm publish`, and bump `version` in
`widget.yaml` at the same time. See the dashboard's `docs/extend/custom-widget/` (local and remote) for the full guide.
