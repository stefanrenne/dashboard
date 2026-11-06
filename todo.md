# To do

Open work, roughly in order of value. Move an item to `completed.md` when it is done.
The widgets collection keeps its own list: `../dashboard-widgets/todo.md`.

## Security (audit of 2026-11-04)

Findings of a review of the server, discovery, the widget runtime, the installer, the image and
the page, most severe first. "Verified" means reproduced against the code as it is.

- [ ] **Info: root mode makes every widget root.** With `DASHBOARD_ALLOW_ROOT_SCRIPTS=true` the
  sudo rule (`NOPASSWD:SETENV` for `/usr/local/bin/dashboard-root`, which runs bash with any
  arguments) lets any code in the `node` process run anything as root. Documented; keep it that way.
- Checked and fine: no request bodies are read; `/widgets/<type>/` serves only `client.js` and
  `assets/` (resolved paths); secrets stay out of `/api/layout` and error messages; page text goes
  in through `textContent` and links through `safeHref`; widget `innerHTML` only inserts fixed
  markup; `npm pack` runs with `--ignore-scripts`, npm tarballs are pinned by integrity and git
  checkouts by commit, no submodules; `npm audit` finds nothing; the image runs as `node`.

## Docs site

- [ ] **Versions in the docs before 1.0.** The Migration section of
  `docs/configuration/README.md` and the API reference's Changes table still name versions;
  CLAUDE.md rules 2 and 6 require them, the wish is no versions before 1.0. Decide, and change
  the rules or the pages to match.

## Other

- [ ] A widget catalogue: an index (YAML in a separate repo) of known widget packages, shown in the docs.
