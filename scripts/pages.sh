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
# base path, its links to GitHub at the develop branch, and a banner and noindex on its pages.
# DOCS_RELEASE is the release's version, for the version menu of both.
#   [DOCS_CHANNEL=release|develop] [DOCS_RELEASE=x.y.z] scripts/pages.sh <out> [owner/repo] [<collection checkout> <tag>]
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
cp -R docs "$out"
# the version this is, for the version menu; develop lives under /develop/ and edits on develop
{
  printf '\n# staged by scripts/pages.sh\ndocs_channel: %s\ndocs_release: "%s"\n' "$channel" "${DOCS_RELEASE:-}"
  if [ "$channel" = develop ]; then printf 'baseurl: /develop\n'; fi
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
  if node -e "import('playwright').catch(() => process.exit(1))" 2>/dev/null; then
    node scripts/widget-images.mjs "$out/widgets/collection/images" "$collection"
  else
    echo "no Playwright: widget pages without example images"
  fi
  node scripts/pages-widgets.mjs "$out" "$collection" "$tag"
fi
