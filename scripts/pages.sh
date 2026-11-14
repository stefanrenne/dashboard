#!/bin/sh
# Stages one part of the GitHub Pages site in <out>, for Jekyll. The site has two parts, each with
# its own release cycle and its own version menu (docs/_includes/header_custom.html):
#
#   DOCS_PART=dashboard  this repository's docs/ (docs/README.md is the home page); latest at the
#                        root, develop under /develop/
#   DOCS_PART=widgets    the widgets collection's docs/ and a page per widget; latest under
#                        /widgets/, develop under /widgets/develop/. The theme's settings, the
#                        includes and the logo come from this repository's docs/.
#
# Links that point outside the docs folder go to the file on GitHub (<owner/repo>, at the branch),
# and every page is wrapped in {% raw %} so Liquid leaves {{DASHBOARD_VAR_*}} in the examples alone.
# For the widgets part, scripts/widget-images.mjs then photographs each widget with example data
# (when Playwright is installed) and scripts/pages-widgets.mjs adds a page per widget.
#
# DOCS_CHANNEL=develop stages the develop version: its base path and its links to GitHub at the
# develop branch. Nothing else differs, so a release is a copy of develop's built site
# (scripts/pages-promote.sh). DOCS_IMAGE_CACHE: the widget images of an earlier build (with their
# .hash files); only changed widgets are photographed again. DOCS_DIR: the dashboard docs to stage
# (default docs/), such as main's with this branch's scripts.
#   [DOCS_PART=dashboard] [DOCS_CHANNEL=release|develop] [DOCS_DIR=<dir>] scripts/pages.sh <out> [owner/repo]
#   DOCS_PART=widgets [DOCS_CHANNEL=...] [DOCS_IMAGE_CACHE=<dir>] scripts/pages.sh <out> <collection owner/repo> <collection checkout> <tag>
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
out=$1
part=${DOCS_PART:-dashboard}
channel=${DOCS_CHANNEL:-release}
case "$channel" in
  release) branch=main ;;
  develop) branch=develop ;;
  *) echo "DOCS_CHANNEL: release or develop, not $channel" >&2; exit 1 ;;
esac
site=https://getdashboard.dev

rm -rf "$out"
case "$part" in
  dashboard)
    repo=${2:-stefanrenne/dashboard}
    cp -R "${DOCS_DIR:-$root/docs}" "$out"
    # the widgets have their own part now (older docs still have the folder, and redirects there)
    rm -rf "$out/widgets"
    sed -i.bak -E -e 's#/widgets/[a-z.-]+\.html, ##g' -e 's#, redirect_from: \[/widgets/[a-z.-]+\.html\]##g' "$out/_config.yml" && rm "$out/_config.yml.bak"
    base=/develop
    # the other part's place in the menu (title, nav_order, address)
    others="widgets|Widgets|3|$site/widgets/"
    ;;
  widgets)
    repo=${2:?the collection owner/repo}
    collection=${3:?the collection checkout}
    tag=${4:?the collection tag}
    [ -d "$collection/docs" ] || { echo "no docs/ in $collection" >&2; exit 1; }
    cp -R "$collection/docs" "$out"
    mkdir -p "$out/_includes" "$out/images"
    cp -R "$root/docs/_includes/." "$out/_includes/"
    cp "$root/docs/images/logo.svg" "$out/images/"
    # the theme's settings from here, the part's own menu (its defaults:) from the collection
    { sed '/^defaults:/,$d' "$root/docs/_config.yml"; [ -f "$collection/docs/_config.yml" ] && cat "$collection/docs/_config.yml"; } > "$out/_config.yml.new"
    mv "$out/_config.yml.new" "$out/_config.yml"
    sed -i.bak "s#^gh_edit_repository: .*#gh_edit_repository: https://github.com/$repo#" "$out/_config.yml" && rm "$out/_config.yml.bak"
    base=/widgets/develop
    others="home|Home|1|$site/ configuration|Configuration|2|$site/configuration/ extend|Extend|4|$site/extend/"
    ;;
  *) echo "DOCS_PART: dashboard or widgets, not $part" >&2; exit 1 ;;
esac
tree="https://github.com/$repo/tree/$branch"
if [ "$channel" = release ]; then base=${base%/develop}; fi

# its base path, whatever the Pages settings of the repository that builds it would give
{
  printf '\n# staged by scripts/pages.sh\ndocs_part: %s\ndocs_channel: %s\nbaseurl: "%s"\n' "$part" "$channel" "$base"
  grep -q '^url:' "$out/_config.yml" || printf 'url: %s\n' "$site"
} >> "$out/_config.yml"
sed -i.bak "s#^gh_edit_branch: .*#gh_edit_branch: $branch#" "$out/_config.yml" && rm "$out/_config.yml.bak"
find "$out" -name '*.md' | while read -r f; do
  # kramdown leaves Markdown inside an HTML block alone unless the block asks for it
  sed -i.bak 's#<details>#<details markdown="1">#g' "$f" && rm "$f.bak"
  # links into the widgets of older dashboard docs go to the widgets part
  if [ "$part" = dashboard ]; then
    sed -i.bak -e "s#](\(\.\./\)*widgets/README\.md#]($site/widgets/#g" -e "s#](\(\.\./\)*widgets/catalogue\.md#]($site/widgets/catalogue.html#g" \
      -e "s#](\(\.\./\)*widgets/collection/#]($site/widgets/collection/#g" "$f" && rm "$f.bak"
  fi
  # one ../ per folder below the docs folder, plus one, leaves it: such links go to GitHub
  rel=${f#"$out"/}
  up="\.\./"
  while [ "${rel#*/}" != "$rel" ]; do rel=${rel#*/}; up="$up\.\./"; done
  sed -i.bak "s#](\($up\)#]($tree/#g" "$f" && rm "$f.bak"
done
# empty front matter makes each file a page; raw keeps {{...}} literal
find "$out" -name '*.md' | while read -r f; do
  { printf -- '---\n---\n{%% raw %%}\n'; cat "$f"; printf '\n{%% endraw %%}\n'; } > "$f.tmp" && mv "$f.tmp" "$f"
done
# the other part's sections in this part's menu, in their place: a page per section that sends
# on to it (part-<name>.html; the menus' script points the menu link straight there)
for other in $others; do
  IFS='|' read -r name title order url <<EOF2
$other
EOF2
  printf -- '---\ntitle: %s\nnav_order: %s\npermalink: /part-%s.html\nredirect_to: %s\n---\n' "$title" "$order" "$name" "$url" > "$out/part-$name.md"
done
# widget pages carry their own front matter and raw wrapping, so they come last
if [ "$part" = widgets ]; then
  # old addresses under /widgets/ of pages that are in the dashboard docs now
  for move in authoring.html:extend/custom-widget/local.html api-reference.html:extend/api-reference.html security.html:extend/security.html; do
    to="$site/${move#*:}"
    printf '<!DOCTYPE html>\n<meta charset="utf-8">\n<title>Redirecting&hellip;</title>\n<link rel="canonical" href="%s">\n<meta http-equiv="refresh" content="0; url=%s">\n<meta name="robots" content="noindex">\n<a href="%s">%s</a>\n' "$to" "$to" "$to" "$to" > "$out/${move%%:*}"
  done
  # without Playwright only the cached images (if any)
  node "$root/scripts/widget-images.mjs" "$out/collection/images" "$collection" ${DOCS_IMAGE_CACHE:+--cache "$DOCS_IMAGE_CACHE"}
  node "$root/scripts/pages-widgets.mjs" "$out" "$collection" "$tag"
fi
