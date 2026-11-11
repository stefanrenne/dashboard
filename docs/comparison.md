# Compared

How Dashboard compares with other self-hosted start pages, as far as their own documentation says
(November 2026). Projects move quickly: check their sites before you decide.

| | Dashboard | [Homepage](https://gethomepage.dev) | [Homarr](https://homarr.dev) | [Dashy](https://dashy.to) | [Glance](https://github.com/glanceapp/glance) | [Homer](https://github.com/bastienwirtz/homer) |
|---|---|---|---|---|---|---|
| Configuration | YAML files, and a settings page in the browser | YAML files | In the browser (drag and drop), no YAML | YAML file, and an editor in the browser | YAML file | YAML file |
| Setup wizard on first start | ✓ (finds running containers) | – | ✓ (onboarding in the browser) | – | – | – |
| Service widgets | 180, in a separate collection | 100+ | 90+ | 50+ | about 30 widget types, plus a custom API widget | a few dozen "smart cards" |
| Widgets from third parties | ✓ packages from git, npm or a folder, sandboxed | – (custom API widget) | – | – (custom widgets in the config) | – (custom API and extension widgets) | – |
| Docker discovery | ✓ labels, also homepage's | ✓ labels | containers as an integration | – | containers widget | – |
| Kubernetes discovery | ✓ Ingress, IngressRoute and HTTPRoute | ✓ Ingress annotations | Kubernetes as an integration | – | – | – |
| Login | admin password and passkeys, for the settings and actions or the whole page | password or OIDC | users, OIDC and LDAP, with permissions | users, Keycloak or OIDC | users with passwords | – (behind a proxy) |
| Buttons that run something | ✓ scripts, commands and webhooks, with confirmation | – | ✓ controls for some integrations | – | – | – |
| Reads homepage's config | ✓ as is, and imports it | (its own) | – | – | – | – |
| Live check of edited YAML | ✓ with line numbers, before saving | – | (no YAML) | ✓ schema check in the editor | – | – |
| Quick launch / search | ✓ | ✓ | ✓ | ✓ | ✓ search widget | ✓ |
| Install as an app (PWA) | ✓ | ✓ | – | – | – | ✓ |
| Languages | 17 | many (community translations) | 26 | many | – | – |
| Backend | Node.js, one dependency, no database | Next.js | Next.js with a database | Vue with a Node server | Go, a single binary | none (static files) |

"–" means the project's documentation does not mention it, not always that it is impossible.

## When to choose which

- **Dashboard** when you want homepage's YAML and labels with a settings page and wizard on top,
  widgets anyone can publish, and buttons that act on your services.
- **Homepage** for the largest established community around YAML and Docker labels.
- **Homarr** when you would rather not touch YAML and need several users with their own rights.
- **Dashy** for many layouts and themes on one YAML file, with an editor in the browser.
- **Glance** for a feed reader style page (RSS, Reddit, Hacker News, markets) next to your services.
- **Homer** when a static page without a server is all you need.
