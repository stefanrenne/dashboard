# Custom CSS & JS

The settings page edits both files under Advanced; the previous versions are kept there too.

A `custom.css` and a `custom.js` in the config folder are loaded after the page's own style and
script, as in homepage. Refresh the browser after a change: unlike the YAML files, they do not
reload the open pages.

```css
/* custom.css */
:root {
  --dash-card: rgb(30 41 59 / 0.6);   /* the card background */
}
.card {
  border-radius: 12px;
}
```

```js
// custom.js
document.title = `${document.title} · lab`;
```

The page's colours are CSS variables on `:root` (`--dash-bg`, `--dash-card`, `--dash-text`,
`--dash-muted`, `--dash-accent`, `--dash-ok`, `--dash-warn`, `--dash-error`, ...), set for the light and the
dark theme. Override them in `custom.css` for a theme of your own. Class names of the page may change
between versions; variables are the steadier hook.

Both files are your own code on your own page: the page's Content Security Policy allows them
like the page's own script. Only put in what you trust. Inline scripts do not run: `custom.js`
cannot add a `<script>` with code in it or an `onclick="..."` attribute; put the code in `custom.js` itself and use `addEventListener`.
