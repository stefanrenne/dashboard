// Dashboard's mark (docs/images/logo.svg) as a data URL: the page's favicon and app icon unless
// settings.favicon names another, and the icon name `dashboard` (resolveIcon in layout.js).
// The CSP allows data: images; its # is encoded, so the page never reads it as a mask marker.
export const MARK = `data:image/svg+xml,${encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" fill=\"#0ea5e9\"><rect x=\"6\" y=\"6\" width=\"16\" height=\"16\" rx=\"4\"/><rect x=\"26\" y=\"6\" width=\"16\" height=\"10\" rx=\"4\" opacity=\".55\"/><rect x=\"26\" y=\"20\" width=\"16\" height=\"22\" rx=\"4\"/><rect x=\"6\" y=\"26\" width=\"16\" height=\"16\" rx=\"4\" opacity=\".55\"/></svg>")}`;
