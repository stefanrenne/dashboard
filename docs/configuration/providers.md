# Providers

Many widgets need an API key, or a username and password. A **provider** is such an account,
defined once under `providers:` in [`settings.yaml`](settings.md) and used by every widget that
needs it, as homepage's providers:

```yaml
# settings.yaml
providers:
  radarr: "{{DASHBOARD_VAR_RADARR_KEY}}"        # a text: the key
  nas:                                   # a map: the options it names
    url: https://nas.lan:5001
    username: dashboard
    password: "{{DASHBOARD_VAR_NAS_PASSWORD}}"
```

A widget uses one with `provider: <name>`:

```yaml
# services.yaml
- Media:
    - Radarr:
        href: http://radarr.lan:7878
        widget:
          type: radarr
          url: http://radarr.lan:7878
          provider: radarr               # fills the key
- Storage:
    - DiskStation:
        widget:
          type: diskstation
          provider: nas                  # fills url, username and password
```

## How a provider fills a widget

- **A text** fills the widget's first secret option that the entry leaves out: its key or token.
- **A map** fills the options it names, such as `url`, `username`, `password` or `key`, again
  only those the entry leaves out. Options a widget does not have are skipped.
- What the entry sets itself always wins, so one provider can serve widgets that differ in one
  option.

A provider that does not exist is a config error on the widget, shown at the top of the page.

## Keeping them secret

- **Nothing under `providers:` reaches the browser.** Every value in it is a secret, also one
  written there literally; secret values are scrubbed from error messages too.
- **Use variables, not passwords**: `{{DASHBOARD_VAR_NAME}}` takes the environment variable
  `DASHBOARD_VAR_NAME`, and `{{DASHBOARD_FILE_NAME}}` the contents of the file whose path is in `DASHBOARD_FILE_NAME`,
  such as a Docker secret (see [Variables](README.md#variables)). `settings.yaml` then holds the
  names of the variables, not the passwords, and can be shared or kept in git.

```yaml
# compose.yaml of the dashboard
services:
  dashboard:
    image: ghcr.io/stefanrenne/dashboard:latest
    environment:
      DASHBOARD_VAR_RADARR_KEY: 0123456789abcdef      # or from an .env file next to compose.yaml
      DASHBOARD_FILE_NAS_PASSWORD: /run/secrets/nas_password
    secrets: [nas_password]
secrets:
  nas_password:
    file: ./nas_password.txt
```

With `DASHBOARD_FILE_NAS_PASSWORD`, write `"{{DASHBOARD_FILE_NAS_PASSWORD}}"` in `settings.yaml` instead of the
`DASHBOARD_VAR_` form.

## Discovered services

A discovered service takes a provider the same way, as the Docker label
`dashboard.widget.provider` (or `dashboard.widgets[1].provider` for the second widget), or the
Kubernetes annotation `getdashboard.dev/widget.provider`:

```yaml
# compose.yaml
labels:
  - dashboard.name=Radarr
  - dashboard.widget.type=radarr
  - dashboard.widget.url=http://radarr:7878
  - dashboard.widget.provider=radarr
```
