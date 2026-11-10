# To do

Open work, roughly in order of value. Move an item to `completed.md` when it is done.
The widgets collection keeps its own list: `../dashboard-widgets/todo.md`.


## Settings and setup pages: design review (2026-11-10)

From an Apple HIG review of the setup wizard and the settings page (contrast measured from the
tokens, for every palette).

- [ ] **Medium: eleven section pills.** On a phone they wrap over 3–4 lines with no grouping.
  Group them (Look: General, Groups · Content: Services, Header widgets, Bookmarks · Sources:
  Docker, Kubernetes, Proxmox, Widget packages · System: Security, Advanced); one select on narrow
  screens.
- [ ] **Medium: validation only on Next or Save.** The wizard's password check shows after Next;
  server errors on a save stand in the save bar, away from the field. Check as people type, and
  put a server error with a path next to its field (`aria-invalid`).
- [ ] **Medium: finished wizard steps differ only in colour.** Add a ✓ (with hidden text) to
  `.steps li.done`.
- [ ] **Low: small targets on a phone.** Buttons ~38 px, order buttons 32 px, swatches 28 px with
  6 px between; 44 px and 10–12 px gaps under `pointer: coarse`.
- [ ] **Low: a dark flash in light mode.** `setup.html` and `settings.html` start with
  `data-theme="dark"`; start from `prefers-color-scheme` instead.
- [ ] **Low: Manrope from Google Fonts.** A self-hosted LAN dashboard loads its font from outside;
  host it in `public/`.
