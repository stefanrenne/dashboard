# Publishing

CI (`.github/workflows/ci.yml`) does the work. Changes go to `develop`; `main` only moves to
`develop` for a release, and a release is a tag on `main`.

| Event | What CI does |
|---|---|
| Pull request | Tests, an amd64 image build and a smoke test. Nothing is pushed. Into `develop`, the tests use the widgets collection's `develop` branch, otherwise its newest release. |
| Push to `develop` | Tests (with the collection's `develop` branch), then the image for amd64 and arm64, pushed as `develop` only (version `develop-<sha>`). A push that changes only `docs/`, `scripts/`, `tests/`, `examples/` or Markdown runs the tests only. |
| Push to `main` | Tests and the image for amd64 and arm64: nothing is pushed. |
| Tag `vX.Y.Z` | The same, pushed as `latest`, `X.Y.Z` and `X.Y`, and a GitHub release with that version's CHANGELOG section. The tagged commit must be on `main`, or nothing is published. |
| Run by hand on `main` | As a tag, for `package.json`'s version when it is not released yet: CI creates the tag `vX.Y.Z` with the release. For when a tag cannot be pushed. |
| Run by hand on `develop` | As a push to `develop` (Dependabot's auto-merge starts these). |
| Monday 04:23 UTC | Rebuild of the newest release (`latest`, `X.Y.Z`, `X.Y`), so base image security fixes arrive without a code change. |

A new push to a branch or a pull request cancels the older CI run of that branch or PR, which is
still running. Runs for a tag, by hand and on the schedule are never cancelled.

## Develop builds

`ghcr.io/stefanrenne/dashboard:develop` is the newest build of `develop`, to try what comes next;
`latest` and the version tags stay on releases. A develop build reports `develop-<sha>` as its
version (the footer links that commit) and installs the widgets collection from its `develop`
branch instead of `#latest`, checked for new commits every `pluginUpdateInterval` (an hour by
default). An entry for the collection in `settings.yaml` `plugins:` still wins. Going back to
`latest` installs the collection's newest release again.

## Release steps

On `develop`, with everything for the release merged:

1. Make sure `CHANGELOG.md` has everything under `## [Unreleased]`.
2. Choose the version (semver) and set it in `package.json` (`npm version <x.y.z> --no-git-tag-version`).
3. Rename `## [Unreleased]` to `## [x.y.z] - YYYY-MM-DD` and add a fresh empty `## [Unreleased]` above it.
4. Commit on `develop` and push it.
5. Move `main` to it: `git push origin develop:main` (a fast-forward; `main` never gets commits of
   its own, so this cannot fail unless someone pushed to `main`).
6. Tag that commit and push the tag: `git tag -a vx.y.z -m vx.y.z`, `git push origin vx.y.z`. CI
   fails the release when the CHANGELOG has no section for the version, or the tag is not on
   `main`. Without a tag push: run the CI workflow by hand on `main` (**Actions > CI > Run
   workflow**).

A release of the widgets collection goes the same way (its `develop`, then `main`, then the tag).

A change to the widget API is a release note of its own: say which `apiVersion` it belongs to.

## Documentation site

[getdashboard.dev](https://getdashboard.dev/) is published by a repository of its own,
[dashboard-site](https://github.com/stefanrenne/dashboard-site): its workflow `site.yml` builds the
site and commits it to its `gh-pages` branch, which GitHub Pages serves (the domain is set there).
The site has two parts, each with its own releases and its own version menu in the header
(`docs/_includes/header_custom.html`):

| Part | Latest | Develop | Its pages |
|---|---|---|---|
| Dashboard | `/` | `/develop/` | `docs/` in this repository |
| Widgets | `/widgets/` | `/widgets/develop/` | `docs/` in the widgets collection (its home and the catalogue) and a page per widget |

A part's menu opens the same page in its other version, or its home page when that page is not
there; the other part's menu opens that part's home page. Develop pages get a banner, and
`robots.txt` keeps them out of search engines. `/version.json` has the latest version of each
part, for the menus. Each part has its own Jekyll build, so its own side menu (the other part is
a link in it) and its own search. Links between the parts are absolute and go to the latest
version: `https://getdashboard.dev/widgets/...` in `docs/` here, `https://getdashboard.dev/...`
in the collection's `docs/`, and `/configuration/...` in a page per widget (its README's
`../../` links are made so).

`.github/workflows/site.yml` here, and `site.yml` and the release job in the collection, start
that workflow (with a fine-grained token in the secret `PAGES_DISPATCH_TOKEN`, Actions read and
write on dashboard-site; without it, they only say so):

| Started by | Mode | Does |
|---|---|---|
| a push to `develop` here | `dashboard-develop` | builds `/develop/` again |
| a push to `main` here (a release) | `dashboard-release` | builds `/develop/` again and **copies** it to `/` |
| a push to the collection's `develop` (widgets, its mock) | `widgets-develop` | builds `/widgets/develop/` again |
| a collection release | `widgets-release` | builds `/widgets/develop/` again and **copies** it to `/widgets/` |
| by hand | `bootstrap` | all four, the latest ones from `main` and the newest collection release |

A release is a copy: what was on a part's develop address is what is released, and the other part
is not touched. It works because nothing on a page depends on the version it was built for, apart
from what Jekyll writes for the base path: the menus and the banner read the version from the
address, and `scripts/pages-promote.sh` points the base path (links, assets, the search index,
canonical and redirect addresses) and the links to the `develop` branch at the latest address and
`main` (the widget pages at the collection's release). So a page never links to a develop address
of the site itself (`tests/pages.test.mjs` checks).

Jekyll builds both parts with the just-the-docs theme; the Markdown stays plain (no front
matter). The theme's settings, the includes and the logo are this repository's (`docs/_config.yml`
up to `defaults:`, `docs/_includes/`); titles, the menu order and redirects from old addresses are
in each part's `docs/_config.yml`.

`scripts/pages.sh` stages one part in one version (`DOCS_PART`, `DOCS_CHANNEL`): it points links
outside the docs folder at GitHub and wraps each page in `{% raw %}` so `{{DASHBOARD_VAR_*}}`
examples stay literal. For the widgets part, `scripts/widget-images.mjs` then photographs the
widgets with example data, and `scripts/pages-widgets.mjs` adds a page per widget from its
`README.md` and `widget.yaml` (with that image), split into service and header widgets, and the
list of all of them on the part's home page. Only a widget whose hash changed is photographed
again: its folder in the collection, the collection's mock, and what draws it here
(`RENDER_FILES` in the script). The published images, with their `<id>.hash` files, are the cache
(`DOCS_IMAGE_CACHE`); when every hash matches, Playwright does not even start.
`scripts/check-highlight.rb` then runs every code block through Rouge, at the version GitHub Pages
uses, and fails the build on one it would mark red (`tests/pages.test.mjs` catches the known cases
locally, without Ruby). Widget pages stay at `/widgets/collection/<id>.html`, whatever their
section: other sites link there.

A new page gets an entry under `defaults:` in its part's `docs/_config.yml`; a moved page a
`redirect_from` with its old address.

## Dependabot

`.github/dependabot.yml` opens grouped weekly PRs for GitHub Actions, npm and the Docker base
image, into `develop`: they ship with the next release. The Node major in the image is kept on an LTS line by hand (Dependabot ignores Node majors). `dependabot-automerge.yml` merges them when CI passes and builds `develop`. A PR that changes a workflow file
needs a fine-grained token in the repository secret `AUTOMERGE_TOKEN` (Contents, Pull requests and
Workflows: read and write); without it those PRs wait for a manual merge.
