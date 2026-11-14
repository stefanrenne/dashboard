#!/bin/sh
# A release of one part of the documentation site (see scripts/pages.sh): a copy of its develop
# version, built (<part>/develop/, or <from>: any build staged with DOCS_CHANNEL=develop), at its
# latest address.
#
#   DOCS_PART=dashboard  <site>/develop/ to <site>/; the widgets part (widgets/), develop/ itself,
#                        CNAME, .nojekyll, robots.txt and version.json stay
#   DOCS_PART=widgets    <site>/widgets/develop/ to <site>/widgets/; widgets/develop/ stays
#
# In the copy, what Jekyll wrote for the develop base path points at the latest one (links, assets,
# the search index, canonical and redirect addresses), links to the part's repository at its
# develop branch go to main, and the widget pages name the collection's release <tag> instead of
# develop. The pages read their version from the address (docs/_includes/header_custom.html), so
# nothing else differs.
#   [DOCS_PART=dashboard|widgets] [DOCS_REPO=owner/repo] scripts/pages-promote.sh <site> <tag> [<from>]
set -eu
site=$1
tag=$2
part=${DOCS_PART:-dashboard}
domain=https://getdashboard.dev
collection=stefanrenne/dashboard-widgets
case "$part" in
  dashboard) prefix=""; repo=${DOCS_REPO:-stefanrenne/dashboard}; keep="develop widgets CNAME .nojekyll robots.txt version.json .git" ;;
  widgets) prefix="/widgets"; repo=${DOCS_REPO:-$collection}; keep="develop" ;;
  *) echo "DOCS_PART: dashboard or widgets, not $part" >&2; exit 1 ;;
esac
target="$site$prefix"
from=${3:-$target/develop}

[ -f "$from/index.html" ] || { echo "no built site in $from to copy" >&2; exit 1; }
mkdir -p "$target"
for entry in "$target"/* "$target"/.[!.]*; do
  [ -e "$entry" ] || continue
  case " $keep " in *" ${entry##*/} "*) continue ;; esac
  rm -rf "$entry"
done
cp -R "$from/." "$target/"

find "$target" -path "$target/develop" -prune -o -path "$target/widgets" -prune -o -path "$target/.git" -prune -o -type f \
  \( -name '*.html' -o -name '*.json' -o -name '*.xml' -o -name '*.js' -o -name '*.css' -o -name '*.txt' \) -print |
while read -r f; do
  sed -i.bak \
    -e "s#$domain$prefix/develop/#$domain$prefix/#g" \
    -e "s#\"$prefix/develop/#\"$prefix/#g" \
    -e "s#'$prefix/develop/#'$prefix/#g" \
    -e "s#($prefix/develop/#($prefix/#g" \
    -e "s#github.com/$repo/edit/develop/#github.com/$repo/edit/main/#g" \
    -e "s#github.com/$repo/blob/develop/#github.com/$repo/blob/main/#g" \
    -e "s#github.com/$repo/tree/develop/#github.com/$repo/tree/main/#g" \
    -e "s#github.com/$collection/tree/main/widgets/#github.com/$collection/tree/$tag/widgets/#g" \
    -e "s#</a> develop · #</a> $tag · #g" \
    -e "s#</a> develop, always installed#</a> $tag, always installed#g" \
    "$f" && rm "$f.bak"
done
echo "promoted $from to $target ($tag)"
