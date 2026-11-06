# Widget API reference

This is the contract between the dashboard and widget packages (hard rule 2 in CLAUDE.md).
Current widget API: **1**. Every addition is listed with the version that introduced it.

## Package layout

```
my-widget/
  widget.yaml   required   manifest
  server.js     optional   data on the server
  client.js     optional   custom rendering in the browser
  i18n.json     optional   translations
  assets/       optional   static files for client.js, served at /widgets/<id>/assets/...
  package.json  optional   only for npm publishing; must contain "type": "module"
```

Load assets relative to your module, not from an absolute path, so the widget also works when
the dashboard runs under a sub path (`base` in settings.yaml):
`new URL('./assets/icon.svg', import.meta.url)`.

A package without `server.js` is client-only (like `datetime` and `search`). A package
without `client.js` is rendered by the dashboard from `blocks`.

## widget.yaml

| Key | Required | Meaning |
|---|---|---|
| `id` | yes | Lowercase letters, digits and dashes, max 63. Used as `type:` in the config and as `dash-<id>` element name. |
| `name` | yes | Human-readable name. |
| `version` | yes | A string, e.g. `"1.2.0"`. Installed as `plugins/<id>@<version>`. |
| `apiVersion` | yes | The widget API this package targets: `2`. A widget of API 1 is not loaded; see [API 1](#api-1). |
| `description` | no | One line, for docs and catalogues. |
| `refresh` | no | Cache time of a result: `500ms`, `10s`, `5m`, `1h` or seconds. Default `30s`. The browser polls at this rate (minimum 2 s). |
| `options` | no | Map of option name to schema (below). |
| `aliases` | no | Other names the widget answers to in `type:`, e.g. homepage's (`[customapi]`). Added after every real id, only where still free; the widget's `id` stays the one the page uses. |
| `defaultFields` | no | Block keys shown when the entry has no `fields`, e.g. `[cpu, memoryPercent]`. Without it every block shows. |
| `images` | no | Docker images the setup wizard of a first install recognises the service by, when the image's name is not the widget's id or one of its `aliases`, e.g. `[plexinc/pms-docker]` (a repository without registry and tag, or only its last part). |
| `confirmWhen` | no | Option values for which a press of the widget's `action` asks for the admin password by default, e.g. `{ user: root }`. An entry's `confirm:` (`password`, `always`, `none`) overrides it. Only counts when the dashboard has an admin password. |
| `frames` | no | `url` options whose page the `client.js` shows in an `<iframe>`, e.g. `[src]`. The page's CSP allows the origin of each one's value (`frame-src`); only public options count, so a URL from a variable or a secret option is never framed. |
| `attributes` | no | Public values the widget publishes for a service's `filter:`, each `name: { type: <type>, from? }` with `boolean`, `number` or `string`. A line comment says what it means; the docs page lists them. See [Filter attributes](#filter-attributes). |
| `params` | no | Names a `client.js` may send its `server.js` through the `dash-widget-params` page event, e.g. `[latitude, longitude]`. They reach `ctx.params`; anything else is dropped. |

### Filter attributes

Users hide a service's card with `filter:` on these values, e.g. `filter: widget.queued == 0`.
Each one either comes from the result the widget already returns, named with `from:`, or is
returned by `fetch` in `attributes`:

```yaml
attributes:
  queued: { type: number, from: queued }            # the value of the `queued` block
  attention: { type: boolean, from: '@attention' }  # true when a block or row is marked warn or error
  status: { type: string, from: '@status' }         # the result's status: up, down, ...
  streams: { type: number, from: '@rows' }          # the number of rows (a "+3 more" row counts 3)
  vmsStopped: { type: number }                      # no from: fetch returns it in attributes
```

`from: <block key>` takes the block's value before `fields:` picks the blocks, and `null` when the
widget left the block out. Use it for blocks whose value is a plain number or state; a value
formatted for the card ("1.2 TB", "2d 4h") makes a poor filter, so return the raw number in
`attributes` instead. What `fetch` returns in `attributes` wins over `from:`.

### Option schema

| Key | Meaning |
|---|---|
| `type` | `string` (a number or boolean becomes text), `url` (http/https only), `number`, `boolean`, `list` (a comma string is split), `object`, `enum`, `icon` (see below) |
| `values` | For `enum`: the allowed values. |
| `required` | `true` makes a missing option an error on the card and in the config messages. |
| `default` | Used when the option is missing. |
| `secret` | `true` keeps the option on the server. |
| `discoverable` | `false`: the option is only taken from the YAML config, never from a Docker label or Kubernetes annotation (whoever starts a container writes those). For options that run something or reach elsewhere with the dashboard's rights, such as the `button`'s `command`. Options listed in `frames` are never taken from a label either. |

An `icon` option takes what a service's `icon:` takes (`plex.svg`, `mdi-home`, `si-ubuntu`,
`sh-plex`, `/icons/x.png`, a URL) and reaches the widget as a URL. A single-colour icon (`mdi-`,
`si-`) ends in `#dash-mask`, or `#dash-mask=<hex>` with its colour: draw it as a CSS mask over the
URL before the `#`, filled with that colour or a theme colour. An unknown name is an error.

**What reaches the browser:** only options that are declared, not `secret`, and not filled in
from a variable or file. Undeclared options are passed to `server.js` but never to the browser.

## server.js

```js
export default {
  async fetch(ctx) {
    return { blocks: [{ label: 'queries', value: 1234 }] };
  },
};
```

`fetch(ctx)` is called at most once per `refresh` per widget instance. Concurrent browser requests share one call.

### action

```js
export default {
  async fetch(ctx) { return { blocks: [] }; },
  async action(ctx) { return { status: 'ok', output: 'done', exitCode: 0 }; },
};
```

Optional. Runs when the widget's `client.js` sends `dash-widget-action` (a button press): the page
POSTs `api/widgets/<instanceId>/action` and shows the result in a dialog. Same `ctx` as `fetch`;
`ctx.signal` aborts after an hour at most (keep your own, shorter limit). One action at a time per
instance: a second press while one runs is refused. With an admin password on the dashboard,
the page first asks for it when the entry or widget.yaml `confirmWhen` says so. Afterwards the other widgets and status labels
on the same card ask again, dimmed until they answer: right away, and after 5 and 30 seconds for
services that take a moment to notice (the server keeps their results 4 seconds meanwhile). So a
button that updates containers, next to a widget that counts updates, shows the new count. The
result:

| Field | Meaning |
|---|---|
| `status` | `ok`, or anything else for a failure. |
| `output` | Text shown as it is (monospace, scrollable); the last 64 KB are kept. |
| `exitCode` | An integer, shown next to the status. |
| `error` | A short reason for a failure. |

Other fields are dropped. Every secret value the dashboard knows (secret options, `{{DASHBOARD_VAR_*}}`,
`{{DASHBOARD_FILE_*}}`) is replaced by `***` in `output` and `error`, as is a thrown error's message.
An action changes something somewhere: it runs for anyone who can open the page (there is no
login), so say so in the widget's README.

Widgets run in a worker thread, apart from the dashboard: one
worker for all of them, with a memory limit. `ctx` is the same; what `fetch` returns must be plain
data (it is copied out of the worker), and module-level state is the worker's. A widget that does
not stop within a second after its timeout gets the worker restarted.

### ctx

| Field | Meaning |
|---|---|
| `ctx.apiVersion` | the widget's `apiVersion`: `2` |
| `ctx.instanceId` | Stable id of this instance (group + service + position). |
| `ctx.options` | Validated options, secrets included. A copy: changing it has no effect. |
| `ctx.fetch(url, init)` | The standard `fetch`, plus: relative URLs resolve against `options.url`; the call is aborted with the widget; `init.socketPath` sends the request over a unix socket (used for Docker); `init.insecure: true` accepts a self-signed certificate for that request (only behind an option the user sets, off by default); `init.tls: { ca, cert, key }` (PEM text) trusts that CA and sends that client certificate, as for a Docker daemon with `--tlsverify`. `res.headers.getSetCookie()` lists every cookie. |
| `ctx.params` | What the page sent through `dash-widget-params`: only names in widget.yaml `params`, each a non-empty string of at most 100 characters; `{}` when nothing was sent. Comes from the browser, so treat it as untrusted input (validate, never put it in a URL path unchecked). Each set of params has its own cached result. |
| `ctx.signal` | `AbortSignal`, aborted when the call times out (10 s). |
| `ctx.cache` | A `Map` that survives between calls of this instance (e.g. the previous value for a delta). Cleared when the instance disappears from the config, and when the widget worker restarts (see below). |
| `ctx.configDir` | The dashboard's config folder (an absolute path), e.g. to resolve a script path from the options. |
| `ctx.log` | `info`, `warn`, `error`; prefixed with the widget type. |

Only `node:` built-ins can be imported. Bundle any other dependency into the file.

### Result

An object; all fields are optional.

| Field | Meaning |
|---|---|
| `status` | `up`, `down`, `warn` or `unknown`. Used when the widget is a service's status check. |
| `latency` | Milliseconds, shown next to the status dot. |
| `statusText` | Text for the status label in the card corner instead of the latency (e.g. `healthy`). Translated when it is a key. |
| `blocks` | List of `{ key?, label, vars?, value, unit?, status? }`. `label` is a string, translated through `i18n.json` when it is a key; `vars` fill `{name}` placeholders in that translation (`{ label: 'poolUsed', vars: { pool: 'Trunk' } }` with `"poolUsed": "{pool} used"`). `value` is a string, number or `null` (shown as –). A string value is translated too when it is a key. `status` is `ok`, `warn`, `error` or `unknown`: warn and error get a colour and a shape (▲, ✕) and are announced to screen readers. `key` names the block for `fields` (default: the label). |
| `attributes` | Map of the attributes declared in widget.yaml to their value (of the declared type, or `null`): `{ update: true, version: '1.4.2' }`. Users filter services on them (`filter: widget.update == false`). They are **public**: they reach the browser, so never put a secret in one (a secret value is replaced by `***`). Undeclared names and values of another type are left out, with one warning in the log. `fields` and `highlight` do not touch them. |
| `rows` | List of `{ label, vars?, value?, status?, icon?, progress? }`, shown below the blocks as label-left/value-right lines (a download queue, current streams, `display: list`). `status` marks a row like a block. `icon` (`play` or `pause`) is drawn before the label and spoken as a word. `progress` (0–100) fills the row's background. A row whose text does not fit opens on click, Enter or Space. A row labelled `moreItems` with `vars: { count }` closes a shortened list ("+3 more"). |

### Writing labels

Labels sit in blocks of about 65px on a phone when a card has four of them. Keep every
translation short: whole words (no abbreviations), at most two lines; the dashboard wraps and
hyphenates in the page language, and never cuts a label off. Show amounts in decimal units
(kB, MB, GB) and durations as `m:ss` or `h:mm:ss`. Mark counts that need someone's attention
(failures, pending requests, updates) with `status: 'warn'`.
| anything else | Free-form JSON for `client.js`. |

### Keys the dashboard keeps for itself

These keys in a widget entry are read by the dashboard and not passed to the widget, unless the
widget declares an option with the same name:

| Key | Meaning |
|---|---|
| `refreshInterval` | Refresh time of this instance in milliseconds (homepage's name). Minimum 1000. |
| `refresh` | The same as a duration: `5s`, `1h`. A bare number of 1000 or more is milliseconds (homepage's `refresh: 3000`); a smaller one is seconds. |
| `fields` | List of block keys to show, e.g. `[cpu, memoryPercent]`. The widget's order is kept. |
| `hideErrors` / `hide_errors` | `true` hides the error box of this widget. |
| `provider` | Fills options the entry leaves out from `settings.yaml` `providers.<name>`: a map fills the options it names, a text the first unset `secret: true` option. Every provider value is treated as a secret. A widget that declares its own `provider` option keeps it. |
| `highlight` | Colours blocks by their value, as in homepage: block `key` (or `<type>.<key>`) → `numeric` / `string` rules with a `level` (`good`, `warn`, `danger`). The dashboard adds the result to the block as `highlight: { level, valueOnly }`; `client.js` sees it in `data.blocks` and may use or ignore it. See [Services](../configuration/services.md). |

**References to another service** (homepage's calendar integrations): an object anywhere in a
widget's options (up to three levels deep) with `service_group` and `service_name` gets that
service's widget options (with `type`, the widget of that type) under its own keys, on the
server. Declare the option `secret: true` (or leave it undeclared): the merged options can hold
keys. An unknown service is a config message.

A thrown error (or a timeout) shows its message on the card. Secret values in it are replaced by `***`.

## client.js

A JavaScript module that defines a custom element named `dash-<id>`:

```js
class MyWidget extends HTMLElement {
  connectedCallback() { this.attachShadow({ mode: 'open' }); this.render(); }
  set data(v) { this._data = v; this.render(); }
  render() { /* ... */ }
}
customElements.define('dash-my-widget', MyWidget);
```

The dashboard sets these properties before the element is connected, and `data` and `error`
again after every refresh:

| Property | Meaning |
|---|---|
| `options` | Public options only. |
| `t(key)` | Translation from `i18n.json` for the dashboard language, falling back to English, then the key. |
| `data` | What `server.js` returned, or `null` (before the first result, or for a client-only widget). |
| `error` | Error message of the last refresh, or `null`. |
| `instanceId` | The id of this widget instance (for `api/suggest`). |
| `busy` | `true` while an action this widget asked for (`dash-widget-action`) runs, then `false`. Use a setter to update the look (disable the button). |
| `actionResult` | `{ status: 'ok' }` or `{ status: 'error' }` of the last action, set just before `busy` goes back to `false`, e.g. to show a check after a quiet success. |

Theme CSS variables inherit into the shadow root: `--dash-text`, `--dash-muted`, `--dash-accent`,
`--dash-card`, `--dash-border`, `--dash-ok`, `--dash-warn`, `--dash-error`.

### API 1

The dashboard no longer loads a widget with `apiVersion: 1`; the configuration messages name it.
API 2 renamed the page's names and changed nothing else, so moving a widget over is renaming: set
`apiVersion: 2`, and in its `client.js` the element `hd-<id>` becomes `dash-<id>`, the events
`hd-widget-action`, `hd-widget-params`, `hd-search-input` and `hd-search-submit` become `dash-…`,
the theme properties `--hd-*` become `--dash-*` and the icon marker `#hd-mask` becomes `#dash-mask`.

The page's Content-Security-Policy allows `connect-src 'self'`: get data through `server.js`, not
from the browser. Images may come from anywhere.

## Page events

A `client.js` may talk to the dashboard through DOM events that bubble out of its shadow root
(`bubbles: true, composed: true`):

| Event | `detail` | What the dashboard does |
|---|---|---|
| `dash-search-input` | `{ query }` | Shows only the services and bookmarks that match every word; empty shows all. |
| `dash-search-submit` | `{ query }` | Send it `cancelable: true`. With exactly one match the dashboard opens it and cancels the event; otherwise the widget may search elsewhere. |
| `dash-widget-action` | `{ title?, showResult? }` | Runs server.js's `action` (see above) and shows its result in a dialog titled `title` (default: the service's name). Sets the element's `busy` to `true` until it is done and then its `actionResult`; a press while it runs is ignored. `showResult: 'failure'` is for a widget that shows its own progress: no running toast, and the dialog only when the action failed. |
| `dash-widget-params` | `{ name: value, ... }` | Fetches the widget again with these values (text) for `server.js`, and keeps sending them on every refresh. Only the names in widget.yaml `params` arrive. |

The collection's `search` widget uses the first two. The weather widgets of the
[collection](https://github.com/stefanrenne/dashboard-widgets) send `dash-widget-params`
with the viewer's location (`navigator.geolocation`, HTTPS only, rounded to two decimals) when
their options have no coordinates.

## Dashboard endpoints for client.js

| Request | Answer |
|---|---|
| `GET api/suggest?instance=<instanceId>&q=<text>` | `{ suggestions: [...] }`: search suggestions for this instance, when its options have `showSearchSuggestions: true` and a `provider` (google, duckduckgo, bing, baidu, brave) or `provider: custom` with a `suggestionUrl`. The server asks the search engine; the URL never comes from the request. Empty on any problem. |

Use relative URLs (`api/...`), so the widget also works under a sub path.

## i18n.json

```json
{ "en": { "queries": "Queries" }, "nl": { "queries": "Verzoeken" } }
```

Languages: `en`, `nl`, `fr`, `de`, `es`. Missing keys fall back to English, then the key itself.

## Changes

| API | Dashboard | Change |
|---|---|---|
| 2 | next | `discoverable: false` on an option: not taken from a discovered service. Discovered services also lose `frames` options, `provider` and `service_group`/`service_name`. Older dashboards ignore the key. |
| 2 | next | `images` in widget.yaml, for the setup wizard. Widgets need no change. |
| 2 | next | With `login: true` every endpoint (also `GET api/widgets/<instanceId>`) answers 401 `{ needsLogin: true }` without a session; the page goes to its login. Widgets need no change. |
| 2 | next | `confirmWhen` in widget.yaml, and the admin password: `POST api/widgets/<instanceId>/action` answers 401 `{ needsPassword: true }` (or 429 with `retryAfter`) until it has one; the page asks for it. Widgets need no change. |
| 2 | next | API 1 is no longer supported: such a widget is not loaded, with a message that says what to rename. |
| 2 | next | The names of the page: the element `dash-<id>`, the events `dash-widget-action`, `dash-widget-params`, `dash-search-input` and `dash-search-submit`, the theme properties `--dash-*` and the icon marker `#dash-mask`. Nothing else changed: a widget of API 1 goes to 2 by renaming them. |
| 1 | 0.1.0 | First version (including `vars`, row `status` and `defaultFields`). |
| 1 | 0.8.0 | `action(ctx)` in server.js, `ctx.configDir`, the `hd-widget-action` event and the element's `busy`; `POST api/widgets/<instanceId>/action`. |
| 1 | 0.10.0 | `showResult: 'failure'` in `hd-widget-action`, and the element's `actionResult`. |
| 1 | next | `attributes` in widget.yaml and in the result: public values a service's `filter:` reads. Older dashboards ignore them. |
| 1 | next | `from:` in an attribute: a block key, `@attention`, `@status` or `@rows`. |
| 1 | next | Blocks can carry `highlight: { level, valueOnly }`, added by the dashboard from the entry's `highlight:` rules. Widgets need no change. |
| 1 | next | `provider: <name>` in an entry fills options from `settings.yaml` `providers`. Widgets need no change. |
| 1 | next | `client.js` gets `instanceId`; `GET api/suggest` for search suggestions. |
| 1 | next | Option type `icon`; `string` options accept numbers and booleans. |
| 1 | next | `aliases` in widget.yaml. |
| 1 | next | `ctx.fetch(url, { insecure: true })` for self-signed certificates. |
| 1 | next | `ctx.fetch(url, { tls: { ca, cert, key } })` for a CA and client certificate. |
| 1 | next | Options with `service_group` and `service_name` get the referenced widget's options. |
| 1 | next | `params` in widget.yaml, the `hd-widget-params` page event and `ctx.params`. |
| 1 | next | `frames` in widget.yaml: the page may frame the origin of these options. |
| 1 | next | Installed widgets run in a worker thread; their result must be plain data. Widgets that return plain data need no change. |
