# To do

Open work, roughly in order of value. Move an item to `completed.md` when it is done.
The widgets collection keeps its own list: `../dashboard-widgets/todo.md`.

## Security review (2026-11-15)

Threat model: a self-hosted dashboard, on the LAN by default, sometimes reachable from outside
through a reverse proxy or tunnel. Adversaries: whoever can reach the page, web pages acting
through a visitor's browser (CSRF, DNS rebinding), whoever writes container labels, and a
compromised widget package or CI dependency. Sound already, and to keep: host checks against DNS
rebinding, `X-Requested-With` on every write, a nonce-based CSP without `unsafe-inline` scripts,
scrypt with constant-time comparison, HttpOnly/SameSite cookies, secrets kept out of
`/api/layout`, config paths confined (`configPath`, `safeJoin`), labels unable to set
`discoverable: false` options, `git`/`npm`/`ping` without a shell, `npm audit` clean.

- [ ] **HIGH: "local network" decides who may set the first admin password, and a proxy can make
  everyone local.** `isLocal` (`src/http.js`) trusts a private socket address unless a forwarding
  header says otherwise. Behind something that forwards without `X-Forwarded-For` (Docker's
  userland-proxy, e.g. IPv6 to an IPv4 container; a TCP/SNI passthrough; some tunnels) every
  internet visitor arrives from a private address. While no admin password is set, which can be
  forever since the dashboard works without one, such a visitor may set it
  (`src/settings/routes.js`, the `noPassword` branch) and then do anything the settings page can:
  add a plugin source, which is code execution in the container (and the Docker socket, when
  mounted). The setup wizard of a first install (`src/onboarding/wizard.js`) trusts `isLocal` the
  same way. Fix: never let an address alone open this. Ask the one-time code from the log for the
  first password too (as the wizard does for a remote visitor), or accept `isLocal` only for
  loopback; add `trustedProxies` (below). Test: a request from 172.17.0.1 without forwarding
  headers cannot set a password without the code.
- [ ] **MEDIUM: the widgets collection updates itself every hour, without a signature.**
  `DEFAULT_PLUGINS` is `#latest` and `pluginUpdateInterval` defaults to 1h (`src/app.js`
  `checkPluginUpdates`, `src/plugins/installer.js`): a new release tag on
  stefanrenne/dashboard-widgets reaches every installation within the hour and runs with the
  dashboard's rights (Docker socket included). Whoever can push a tag there (the owner's account,
  a leaked token, its CI) can do the same. Fix, in layers: protect `v*` tags with a ruleset (owner
  only); sign release tags and verify them on install (`git verify-tag` with a public key shipped in
  the image); consider a delay (install a tag only once it is a day old) or make automatic updates
  of the collection opt-in. Document the choice in `docs/extend/security.md`.
- [ ] **MEDIUM: GitHub Actions run third-party actions by tag, and Dependabot merges their updates
  by itself.** `docker/*` actions in `.github/workflows/ci.yml` are pinned to a moving major tag; a
  compromised or re-pointed tag runs with `packages: write` and pushes the image (`:develop` on
  every push to develop). `dependabot-automerge.yml` merges github-actions updates, with
  `AUTOMERGE_TOKEN` also those that change workflows. Fix: pin third-party actions to a full
  commit SHA (Dependabot keeps SHA pins up to date, with the tag as a comment); auto-merge only
  patch and minor updates, and leave workflow changes for a review.
- [ ] **LOW-MEDIUM: behind a reverse proxy every visitor shares one address for the password
  limiter.** `clientAddress` is the socket address (`src/http.js`), so `FailureLimiter`
  (`src/actionauth.js`) counts the proxy: one person guessing locks out everyone for up to 15
  minutes, and the per-client slow-down is gone. Fix: a `trustedProxies` setting (addresses or
  ranges) whose `X-Forwarded-For` is believed, for the limiter, the event stream caps and
  `isLocal` alike.
- [ ] **LOW: login sessions never end while they are used.** `Sessions.check` (`src/login.js`) moves
  the end on with every visit, so a session that is used now and then stays valid forever. Fix: an
  absolute lifetime (e.g. 30 days from the login) next to `login.remember`.
- [ ] **LOW: CSP and link checks can be tighter.** Add `base-uri 'self'; form-action 'self';
  object-src 'none'` to `securityHeaders` (`src/http.js`). `safeHref` (`public/index.html`) is a
  deny-list of schemes; the CSP already blocks `javascript:`, but an allow-list (`http:`, `https:`,
  `mailto:`, relative) parsed with `new URL` is the sturdier second layer, for hrefs from labels
  and widget results.
- [ ] **INFO: `/api/layout` shows every service's address to whoever opens the page.** Documented
  (Recommendations in `docs/extend/security.md`), but easy to miss: log a warning at start when
  `login` is off and `allowedHosts` has a name that is not `*.lan`/`localhost`-like, or show it on
  the settings page.
