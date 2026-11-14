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

`.github/workflows/pages.yml` publishes `docs/` as
[getdashboard.dev](https://getdashboard.dev/) in two versions, with a menu in the header to switch
(`docs/_includes/header_custom.html`): the release (`main`) at the root, and `develop` under
[`/develop/`](https://getdashboard.dev/develop/), with a banner and `noindex` on its pages and the widgets
collection's `develop` for its widget pages. Only `main` may deploy, so a push to `develop` that touches
the docs, a run by hand and the schedule start the workflow on `main`, which builds both. The menu opens
the same page in the other version, or its home page when that page is not there. The
domain is set under the repository's Settings > Pages, not in a `CNAME` file; the build takes
the site's base path from there, so after a change of domain run the workflow once by hand,
or every link still points at the old path (the old `stefanrenne.github.io/homelab-dashboard/`
addresses redirect to the domain). Jekyll builds it with the just-the-docs theme; the Markdown
stays plain (no front matter), titles, the menu order and redirects from old addresses
are in `docs/_config.yml`. The menu has four parts: Home (`docs/README.md`), Configuration
(`docs/configuration/`, a page per file as in homepage), Widgets and Extend (`docs/extend/`).

`scripts/pages.sh` stages the site, one version at a time (`DOCS_CHANNEL=release` or `develop`, and
`DOCS_RELEASE` for the menu; develop gets `baseurl: /develop` and its GitHub links at `develop`): it points links outside `docs/` at GitHub and wraps each
page in `{% raw %}` so `{{DASHBOARD_VAR_*}}` examples stay literal. For the widgets collection at its
newest release (checked out by the workflow), `scripts/widget-images.mjs` then photographs every
widget with example data, and `scripts/pages-widgets.mjs` adds a page per widget from its
`README.md` and `widget.yaml` (with that image), split into service and header widgets, and the
list of all of them on the Widgets page. `scripts/check-highlight.rb` then runs every code
block through Rouge, at the version GitHub Pages uses, and fails the build on one it would mark
red (`tests/pages.test.mjs` catches the known cases locally, without Ruby). Widget pages stay at `widgets/collection/<id>.html`,
whatever their section: other sites link there. A collection release starts a run itself (its release job, with a token in the
collection's secret `PAGES_DISPATCH_TOKEN`); the daily run is the fallback.

A new page gets an entry under `defaults:` in `docs/_config.yml`; a moved page a `redirect_from`
with its old address.

A deploy is named after its commit. When one hangs at GitHub (`updating_pages` until the
timeout, then "Deployment cancelled" for every new try), a run for the same commit does not help,
the daily one neither: push a new commit that touches `docs/` to `develop` and move `main` to it, and its deploy
goes through.

## Dependabot

`.github/dependabot.yml` opens grouped weekly PRs for GitHub Actions, npm and the Docker base
image, into `develop`: they ship with the next release. The Node major in the image is kept on an LTS line by hand (Dependabot ignores Node majors). `dependabot-automerge.yml` merges them when CI passes and builds `develop`. A PR that changes a workflow file
needs a fine-grained token in the repository secret `AUTOMERGE_TOKEN` (Contents, Pull requests and
Workflows: read and write); without it those PRs wait for a manual merge.
