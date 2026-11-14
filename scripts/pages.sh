#!/bin/sh
# Stages the GitHub Pages site in <out>: docs/ as it is (docs/README.md is the home page).
# Links that point outside docs/ go to the file on GitHub, since only docs/ is published, and
# every page is wrapped in {% raw %} so Liquid leaves {{DASHBOARD_VAR_*}} in the examples alone.
# Then, when a checkout of the widgets collection (and its tag) is given, scripts/widget-images.mjs
# photographs each widget with example data (when Playwright is installed) and
# scripts/pages-widgets.mjs adds a page per widget.
#
# The site has two versions (docs/_includes/header_custom.html switches between them): the
# release, at the root, and develop, under /develop/. DOCS_CHANNEL=develop stages the latter: its
# base path and its links to GitHub at the develop branch. Nothing else differs, so a release can
# be a copy of develop's site (scripts/pages-promote.sh). DOCS_IMAGE_CACHE: the widget images of
# an earlier build (with their .hash files); only changed widgets are photographed again. DOCS_DIR:
# the docs to stage (default docs/), such as main's with this branch's scripts.
#   [DOCS_CHANNEL=release|develop] [DOCS_IMAGE_CACHE=<dir>] [DOCS_DIR=<dir>] scripts/pages.sh <out> [owner/repo] [<collection checkout> <tag>]
set -eu
out=$1
repo=${2:-stefanrenne/dashboard}
collection=${3:-}
tag=${4:-}
channel=${DOCS_CHANNEL:-release}
case "$channel" in
  release) branch=main ;;
  develop) branch=develop ;;
  *) echo "DOCS_CHANNEL: release or develop, not $channel" >&2; exit 1 ;;
esac
tree="https://github.com/$repo/tree/$branch"

rm -rf "$out"
cp -R "${DOCS_DIR:-docs}" "$out"
# develop lives under /develop/ and edits on develop; the release at the root, whatever base path
# the Pages settings of the repository that builds it would give
{
  printf '\n# staged by scripts/pages.sh\ndocs_channel: %s\n' "$channel"
  if [ "$channel" = develop ]; then printf 'baseurl: /develop\n'; else printf 'baseurl: ""\n'; fi
  grep -q '^url:' "$out/_config.yml" || printf 'url: https://getdashboard.dev\n'
} >> "$out/_config.yml"
sed -i.bak "s#^gh_edit_branch: .*#gh_edit_branch: $branch#" "$out/_config.yml" && rm "$out/_config.yml.bak"
find "$out" -name '*.md' | while read -r f; do
  # kramdown leaves Markdown inside an HTML block alone unless the block asks for it
  sed -i.bak 's#<details>#<details markdown="1">#g' "$f" && rm "$f.bak"
  # one ../ per folder below docs/, plus one, leaves docs/: such links go to GitHub
  rel=${f#"$out"/}
  up="\.\./"
  while [ "${rel#*/}" != "$rel" ]; do rel=${rel#*/}; up="$up\.\./"; done
  sed -i.bak "s#](\($up\)#]($tree/#g" "$f" && rm "$f.bak"
done
# empty front matter makes each file a page; raw keeps {{...}} literal
find "$out" -name '*.md' | while read -r f; do
  { printf -- '---\n---\n{%% raw %%}\n'; cat "$f"; printf '\n{%% endraw %%}\n'; } > "$f.tmp" && mv "$f.tmp" "$f"
done
# widget pages carry their own front matter and raw wrapping, so they come last
if [ -n "$collection" ]; then
  # without Playwright only the cached images (if any)
  node scripts/widget-images.mjs "$out/widgets/collection/images" "$collection" ${DOCS_IMAGE_CACHE:+--cache "$DOCS_IMAGE_CACHE"}
  node scripts/pages-widgets.mjs "$out" "$collection" "$tag"
fi
