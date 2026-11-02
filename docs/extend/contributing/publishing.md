# Publishing

CI (`.github/workflows/ci.yml`) does the work; a release is a tag.

| Event | What CI does |
|---|---|
| Pull request | Tests, an amd64 image build and a smoke test. Nothing is pushed. |
| Push to `main` | The same, for amd64 and arm64: tested, nothing is pushed. A push that changes only `docs/`, `scripts/`, `tests/`, `examples/` or Markdown runs the tests only. |
| Tag `vX.Y.Z` | The same, pushed as `latest`, `X.Y.Z` and `X.Y`, and a GitHub release with that version's CHANGELOG section. The tagged commit must be on `main`, or nothing is published. |
| Run by hand on `main` | As a tag, for `package.json`'s version when it is not released yet: CI creates the tag `vX.Y.Z` with the release. For when a tag cannot be pushed. Otherwise as a push to `main`. |
| Monday 04:23 UTC | Rebuild of the newest release (`latest`, `X.Y.Z`, `X.Y`), so base image security fixes arrive without a code change. |

A new push to `main` or a pull request cancels the older CI run of that branch or PR, which is still
running. Runs for a tag, by hand and on the schedule are never cancelled.

## Release steps

1. Make sure `CHANGELOG.md` has everything under `## [Unreleased]`.
2. Choose the version (semver) and set it in `package.json` (`npm version <x.y.z> --no-git-tag-version`).
3. Rename `## [Unreleased]` to `## [x.y.z] - YYYY-MM-DD` and add a fresh empty `## [Unreleased]` above it.
4. Commit, `git tag -a vx.y.z -m vx.y.z`, `git push --follow-tags` (`--follow-tags` only pushes
   annotated tags; a plain `git tag` stays local). CI fails the release when the CHANGELOG has
   no section for the version. Without a tag push: push `main` and run the CI workflow by hand on
   `main` (**Actions > CI > Run workflow**); a version that is released already gives a normal
   `main` build (Dependabot's auto-merge starts such runs too).

A change to the widget API is a release note of its own: say which `apiVersion` it belongs to.

## Documentation site

`.github/workflows/pages.yml` publishes `docs/` as
[getdashboard.dev](https://getdashboard.dev/) on every push to `main` that touches it. The
domain is set under the repository's Settings > Pages, not in a `CNAME` file; the build takes
the site's base path from there, so after a change of domain run the workflow once by hand,
or every link still points at the old path (the old `stefanrenne.github.io/homelab-dashboard/`
addresses redirect to the domain). Jekyll builds it with the just-the-docs theme; the Markdown
stays plain (no front matter), titles, the menu order and redirects from old addresses
are in `docs/_config.yml`. The menu has four parts: Home (`docs/README.md`), Configuration
(`docs/configuration/`, a page per file as in homepage), Widgets and Extend (`docs/extend/`).

`scripts/pages.sh` stages the site: it points links outside `docs/` at GitHub and wraps each
page in `{% raw %}` so `{{HD_VAR_*}}` examples stay literal. For the widgets collection at its
newest release (checked out by the workflow), `scripts/widget-images.mjs` then photographs every
widget with example data, and `scripts/pages-widgets.mjs` adds a page per widget from its
`README.md` and `widget.yaml` (with that image), split into service and header widgets, and the
list of all of them on the Widgets page. `scripts/check-highlight.rb` then runs every code
block through Rouge, at the version GitHub Pages uses, and fails the build on one it would mark
red (`tests/pages.test.mjs` catches the known cases locally, without Ruby). Widget pages stay at `widgets/collection/<id>.html`,
whatever their section: other sites link there. A daily run picks up a new collection release.

A new page gets an entry under `defaults:` in `docs/_config.yml`; a moved page a `redirect_from`
with its old address.

## Dependabot

`.github/dependabot.yml` opens grouped weekly PRs for GitHub Actions, npm and the Docker base
image. The Node major in the image is kept on an LTS line by hand (Dependabot ignores Node majors). `dependabot-automerge.yml` merges them when CI passes. A PR that changes a workflow file
needs a fine-grained token in the repository secret `AUTOMERGE_TOKEN` (Contents, Pull requests and
Workflows: read and write); without it those PRs wait for a manual merge.
