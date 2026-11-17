#!/bin/sh
# Builds Lobby into out/: a fresh copy of your tower's own page, with two lines added to its index.html (the only edit
# made to the copy): lobby.css after the page's styles, and lobby.js before page.js, so it regroups the page's frame
# before the page first draws. Everything else is lobby.css and lobby.js, over the page's ids and the tower's API.
#
#   ./sync.sh                        copy the page of the tower that is running (asked at $TOWER_URL, else at the port
#                                    in $TOWER_CONFIG, else in ~/.tower/config.json)
#   ./sync.sh <tower checkout>       copy <tower checkout>/renderers/page instead (or a page folder itself)
#
# Run it again after `tower update`, so Lobby sits on the page your tower now has, and after changing lobby.css or
# lobby.js. Then reload the page.
set -eu
here=$(cd "$(dirname "$0")" && pwd)

if [ $# -gt 0 ]; then
  page=$1
  [ -d "$page/renderers/page" ] && page=$page/renderers/page
else
  url=${TOWER_URL:-}
  if [ -z "$url" ]; then
    config=${TOWER_CONFIG:-$HOME/.tower/config.json}
    [ -f "$config" ] || { echo "sync: no tower config at $config: pass your tower checkout, ./sync.sh <checkout>" >&2; exit 1; }
    port=$(node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).port ?? ""))' "$config")
    [ -n "$port" ] || { echo "sync: $config names no port: pass your tower checkout, ./sync.sh <checkout>" >&2; exit 1; }
    url=http://127.0.0.1:$port
  fi
  renderers=$(curl -fsS "$url/renderers") || { echo "sync: no tower answered at $url: start it (tower up), or pass your tower checkout" >&2; exit 1; }
  page=$(printf '%s' "$renderers" | node -e 'const r = JSON.parse(require("fs").readFileSync(0, "utf8")).renderers.find((r) => r.name === "page"); process.stdout.write(r ? r.root : "")')
  [ -n "$page" ] || { echo "sync: the tower at $url serves no page renderer" >&2; exit 1; }
fi
[ -f "$page/index.html" ] || { echo "sync: $page has no index.html: that is not the tower's page" >&2; exit 1; }

rm -rf "$here/out"
mkdir -p "$here/out"
cp -R "$page/." "$here/out/"
cp "$here/lobby.css" "$here/lobby.js" "$here/out/"
# Each link carries its file's hash, so a reload after a sync loads the new files: WebKit (Tower.app) keeps a module
# it has loaded across reloads while its URL is the same.
css=$(shasum "$here/lobby.css" | cut -c1-10)
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
perl -0pi -e "s#</head>#<meta name=\"lobby-version\" content=\"$version\" data-commit=\"$commit\" data-built=\"$built\">\n<link rel=\"stylesheet\" href=\"lobby.css?v=$css\">\n</head>#; s#(<script type=\"module\" src=\"page.js\"></script>)#<script type=\"module\" src=\"lobby.js?v=$js\"></script>\n\$1#" "$here/out/index.html"
grep -q "lobby.css?v=$css" "$here/out/index.html" && grep -q "lobby.js?v=$js" "$here/out/index.html" || {
  echo "sync: $page/index.html no longer has </head> or page.js's script tag where Lobby expects them: Lobby needs an update" >&2; exit 1; }
echo "lobby: built from $page into $here/out"
