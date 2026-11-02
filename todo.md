# To do

Open work, roughly in order of value. Move an item to `completed.md` when it is done.
The widgets collection keeps its own list: `../homelab-dashboard-widgets/todo.md`.

## Tests and CI

- [ ] **Check the docs' code blocks with Rouge in the Pages workflow.** The site's highlighter
  marks some valid YAML red (keys with `[ ]` or `'`); `tests/pages.test.mjs` catches the known
  cases with a regex. The Pages build has Ruby: run `rougify` on every code block of `docs/` and
  the widget pages and fail on a highlighter error.

## Filters

- [ ] **Hidden cards cannot be seen at all.** A dashboard with filters gives no sign that cards
  are hidden. A footer toggle ("show 3 hidden") or a count per group would let a viewer check
  what the filters hide.
- [ ] **Filter recipes in the docs.** Filtering services has one example (Shelly). Add a few
  that use the new attributes: Radarr only with a blocked import
  (`widget.attention == false`), Proxmox only with a stopped VM (`widget.vmsStopped == 0`), a
  speed test below a threshold (`widget.download > 100`).

## Docs site

- [ ] **Versions in the docs before 1.0.** The Migration section of
  `docs/configuration/README.md` and the API reference's Changes table still name versions;
  CLAUDE.md rules 2 and 6 require them, the wish is no versions before 1.0. Decide, and change
  the rules or the pages to match.
- [ ] **Cache Playwright in the Pages workflow.** Every build installs Playwright and Chromium
  for the widget images (a minute or two).
- [ ] **Widget images are dark only** while the docs theme is light; consider a light variant
  or a frame around them.

## Housekeeping

- [ ] **Release the widget example repo.** `homelab-dashboard-widget-example` has the attributes
  (57df532) on `main`, but no release, so `#latest` installs still get the old version.

## Other

- [ ] A widget catalogue: an index (YAML in a separate repo) of known widget packages, shown in the docs.
