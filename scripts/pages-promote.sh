#!/bin/sh
# A release of the documentation site: a copy of develop's built site (<site>/develop/, or <from>:
# any site built with DOCS_CHANNEL=develop) at the root.
# The root's old pages go first; develop/ itself, CNAME, .nojekyll, robots.txt and version.json
# stay. In the copy, what Jekyll wrote for /develop/ points at the root (links, assets, the search
# index, canonical and redirect addresses), links to this repository's develop branch at main,
# and the widget pages name the collection's release <tag> instead of develop. The pages
# themselves read their version from the address (docs/_includes/header_custom.html), so nothing
# else differs.
#   [DOCS_REPO=owner/repo] [DOCS_COLLECTION=owner/repo] scripts/pages-promote.sh <site> <collection tag> [<from>]
set -eu
site=$1
tag=$2
from=${3:-$site/develop}
repo=${DOCS_REPO:-stefanrenne/dashboard}
collection=${DOCS_COLLECTION:-stefanrenne/dashboard-widgets}
domain=https://getdashboard.dev

[ -f "$from/index.html" ] || { echo "no built site in $from to copy" >&2; exit 1; }
find "$site" -mindepth 1 -maxdepth 1 ! -name develop ! -name CNAME ! -name .nojekyll ! -name robots.txt ! -name version.json ! -name .git -exec rm -rf {} +
cp -R "$from/." "$site/"

find "$site" -path "$site/develop" -prune -o -path "$site/.git" -prune -o -type f \
  \( -name '*.html' -o -name '*.json' -o -name '*.xml' -o -name '*.js' -o -name '*.css' -o -name '*.txt' \) -print |
while read -r f; do
  sed -i.bak \
    -e "s#$domain/develop/#$domain/#g" \
    -e "s#\"/develop/#\"/#g" \
    -e "s#'/develop/#'/#g" \
    -e "s#(/develop/#(/#g" \
    -e "s#github.com/$repo/edit/develop/#github.com/$repo/edit/main/#g" \
    -e "s#github.com/$repo/tree/develop/#github.com/$repo/tree/main/#g" \
    -e "s#github.com/$repo/blob/develop/#github.com/$repo/blob/main/#g" \
    -e "s#github.com/$collection/tree/develop/#github.com/$collection/tree/$tag/#g" \
    -e "s#</a> develop · #</a> $tag · #g" \
    "$f" && rm "$f.bak"
done
echo "promoted $from to $site (collection $tag)"
