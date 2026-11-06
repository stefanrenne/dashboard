# To do

Open work, roughly in order of value. Move an item to `completed.md` when it is done.
The widgets collection keeps its own list: `../dashboard-widgets/todo.md`.

## Settings page: every config file

Goal: everything in the YAML files (and `custom.css`/`custom.js`) can be managed from `/settings`,
not only the `FIELDS` of settings.yaml. Roughly in this order. Done so far: the writer, secrets
as tokens, `!include`, the sections and a text editor per file (see completed.md); each form
below replaces the text editor of its section as the main view (the text stays under a toggle),
and shows a part that comes from an `!include` read-only, with a link to its file (`at` in
`GET /api/settings/files`).

- [ ] **Export and restore.** Download the config files (one at a time or as one bundle without a
  new dependency) and restore a previous version; the wizard's homepage import from here too.
- [ ] **Docs and changelog.** "Settings page" in `docs/configuration/README.md` rewritten, a line
  on each config file's page that it can be edited on the settings page, `CHANGELOG.md` under
  Unreleased, screenshots of the new sections.
- [ ] **Tests per editor.** A `node:test` round trip per file (read → change → write, comments
  kept), jsdom tests per section, the design minimums, and access (without an admin password only
  from the local network, otherwise the password or a passkey).
