# To do

Open work, roughly in order of value. Move an item to `completed.md` when it is done.
The widgets collection keeps its own list: `../homelab-dashboard-widgets/todo.md`.

## Filters

- [ ] **A filter per widget.** `filter:` on one entry of a service's `widgets:` hides that widget
  while the expression is true, the same language as the service's `filter:` and reading the same
  attributes (`widget.<name>` merged over the service's widgets, `widgets.<type>.<name>`,
  `container.<name>`). For example a button that only shows while there are updates:

  ```yaml
  - Wud:
      icon: wud
      widgets:
        - type: whatsupdocker
          url: http://wud:3000
          username: "{{HD_VAR_WUD_USER}}"
          password: "{{HD_VAR_WUD_PASSWORD}}"
        - type: button
          text: Update containers
          filter: widgets.whatsupdocker.updates == 0   # hidden while there is nothing to update
          timeout: 900
          command: >-
            auth="{{HD_VAR_WUD_USER}}:{{HD_VAR_WUD_PASSWORD}}";
            curl -fsS -u "$auth" http://wud:3000/api/containers
            | jq -r '.[] | select(.updateAvailable) | .id'
            | while read -r id; do
                curl -fsS -X POST -u "$auth" "http://wud:3000/api/containers/$id/triggers/docker/update" >/dev/null || exit 1;
              done
  ```

  To decide: the key. As a dashboard key on a widget entry (next to `fields`, `refresh`,
  `hide_errors`) it shadows a widget's own option of that name. Only `search` had one; it is
  `filterServices` in the collection now, but `filter: false` still works there for older
  configs, and `search` is a header widget: limit the key to service widgets. Further: a hidden
  widget keeps
  polling, since other filters may read it; it stays hidden until the widgets it reads have
  answered and shows when one fails, as a card does; a card whose widgets are all hidden keeps
  its header. Bound and checked in `src/layout.js` like the service filter, evaluated in
  `public/index.html`; docs under Filtering services.

## Docs site

- [ ] **Versions in the docs before 1.0.** The Migration section of
  `docs/configuration/README.md` and the API reference's Changes table still name versions;
  CLAUDE.md rules 2 and 6 require them, the wish is no versions before 1.0. Decide, and change
  the rules or the pages to match.

## Other

- [ ] A widget catalogue: an index (YAML in a separate repo) of known widget packages, shown in the docs.
