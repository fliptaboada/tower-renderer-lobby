#!/bin/sh
# Builds Lobby into out/: a copy of the tower's page, its modules in a folder named after their contents
# (out/p-<hash>/), with index.html and renderer.json beside it. index.html gets the only edits made to the copy: its
# page.js points into that folder, lobby.css follows the page's styles, and lobby.js runs before page.js, so it
# regroups the page's frame before the page first draws. Everything else is lobby.css and lobby.js, over the page's
# ids and the tower's API.
#
#   ./sync.sh                  build from page/: the tower's page Lobby was last checked with, at the upstream commit
#                              UPSTREAM names. extension.json requires that page's API version, so the tower serves
#                              Lobby only where the page works: its major, at its minor or newer.
#   ./sync.sh <tower checkout> build from <tower checkout>/renderers/page instead (or a page folder itself), to check
#                              Lobby on another upstream
#
# A tower update doesn't change what Lobby runs. Run it after a `git pull` here and after changing lobby.css or
# lobby.js, then reload the page. When it fails, out/ stays as it was.
set -eu
here=$(cd "$(dirname "$0")" && pwd)

if [ $# -gt 0 ]; then
  page=$1
  [ -d "$page/renderers/page" ] && page=$page/renderers/page
  from=$page
else
  page=$here/page
  from="the tower's $(sed -n 's/^tag=//p' "$here/UPSTREAM") page (page/)"
fi
[ -f "$page/index.html" ] || { echo "sync: $page has no index.html: that is not the tower's page" >&2; exit 1; }

# The page's modules go in a folder named after their contents, so a new page gives every one of them a new URL:
# WebKit (Tower.app) keeps a module it has loaded across reloads while its URL is the same, and the page's modules
# import each other by name (./sidebar.js), so only a new folder makes it load the new page. index.html
# (the page's address) and renderer.json (read by the tower) stay at the top.
modules=p-$(cd "$page" && find . -type f ! -name index.html ! -name renderer.json | LC_ALL=C sort | xargs shasum | shasum | cut -c1-10)
rm -rf "$here/out.new"
trap 'rm -rf "$here/out.new"' EXIT
mkdir -p "$here/out.new/$modules"
cp -R "$page/." "$here/out.new/$modules/"
mv "$here/out.new/$modules/index.html" "$here/out.new/"
[ -f "$here/out.new/$modules/renderer.json" ] && mv "$here/out.new/$modules/renderer.json" "$here/out.new/"
cp "$here/lobby.js" "$here/out.new/"
# lobby.css puts each rule in the cascade layer of what it restyles (the elements in tower.design, the page's parts in
# tower.page, a view's insides in tower.views), as a tower from 2.17 orders its page's CSS. An older page puts its CSS
# in no layer, which would outweigh every layered rule of Lobby's, so for it the layers' lines come out.
if grep -q '@layer tower\.' "$page/index.html"; then
  cp "$here/lobby.css" "$here/out.new/"
else
  perl -ne 'print unless /^\@layer tower\.\w+ \{$/ || /^\} \/\* tower\.\w+ \*\/$/' "$here/lobby.css" > "$here/out.new/lobby.css"
fi
# Each link carries its file's hash, so a reload after a sync loads the new files: WebKit (Tower.app) keeps a module
# it has loaded across reloads while its URL is the same.
css=$(shasum "$here/out.new/lobby.css" | cut -c1-10)
js=$(shasum "$here/lobby.js" | cut -c1-10)
# What runs, for lobby.js to show: VERSION's number, the commit it was built from (`+` when the clone has changes of
# its own), and the day of the build.
version=$(tr -d '[:space:]' < "$here/VERSION")
if commit=$(git -C "$here" rev-parse --short HEAD 2>/dev/null); then
  git -C "$here" diff --quiet HEAD -- . || commit=$commit+
else
  commit='no git'
fi
built=$(date +%Y-%m-%d)
perl -0pi -e "s#</head>#<meta name=\"lobby-version\" content=\"$version\" data-commit=\"$commit\" data-built=\"$built\">\n<link rel=\"stylesheet\" href=\"lobby.css?v=$css\">\n</head>#; s#<script type=\"module\" src=\"page.js\"></script>#<script type=\"module\" src=\"lobby.js?v=$js\"></script>\n<script type=\"module\" src=\"$modules/page.js\"></script>#" "$here/out.new/index.html"
grep -q "lobby.css?v=$css" "$here/out.new/index.html" && grep -q "lobby.js?v=$js" "$here/out.new/index.html" && grep -q "src=\"$modules/page.js\"" "$here/out.new/index.html" || {
  echo "sync: $page/index.html no longer has </head> or page.js's script tag where Lobby expects them: Lobby needs an update" >&2; exit 1; }
rm -rf "$here/out" && mv "$here/out.new" "$here/out"
echo "lobby: built from $from into $here/out"
