#!/bin/sh
# Smoke test against a deployed (or `wrangler dev`) Conduit frontend and the
# backend it was built for.
#
# Usage: scripts/smoke.sh read|create <frontend-url> <api-url> [cookie-jar]
#   e.g. scripts/smoke.sh read https://conduit-web.denis-coccodi.workers.dev https://conduit.denis-coccodi.workers.dev/api
#   read:   app shell, a deep link (SPA fallback), the service worker, that the
#           deployed bundle calls <api-url>, and that the backend allows the
#           frontend's origin (CORS with credentials). Writes nothing.
#   create: read, then register a random user and read it back with the auth
#           cookie, sending the frontend's Origin like the browser does.
#           Writes test data: not for production.
#
# Exits non-zero if any request returns an unexpected status code or body.
set -u
MODE=${1:-}; FE=${2:-}; API=${3:-}; J=${4:-${TMPDIR:-/tmp}/conduit-web-smoke-jar.txt}
FE=${FE%/}; API=${API%/}
ORIGIN=$(printf '%s' "$FE" | sed -E 's#^(https?://[^/]+).*#\1#')
FAILED=0

ok()   { echo "ok   $1"; }
fail() { echo "FAIL $1"; FAILED=1; }

# req <expected-status> <expected-body-substring> <label> <curl args...>
req() {
  expected=$1; needle=$2; label=$3; shift 3
  out=$(curl -s -b "$J" -c "$J" -w '\n%{http_code}' "$@")
  code=$(printf '%s' "$out" | tail -n 1)
  body=$(printf '%s\n' "$out" | sed '$d')
  if [ "$code" = "$expected" ] && printf '%s' "$body" | grep -qF -- "$needle"; then
    ok "[$code] $label"
  else
    fail "[$code, expected $expected with \"$needle\"] $label"
    printf '%s\n' "$body" | sed 's/"token":"[^"]*"/"token":"…"/' | head -c 500
    echo
  fi
}

# cors <label> <curl args...>: the response must allow $ORIGIN with credentials.
cors() {
  label=$1; shift
  headers=$(curl -s -o /dev/null -D - -H "Origin: $ORIGIN" "$@" | tr -d '\r')
  if printf '%s\n' "$headers" | grep -qix "access-control-allow-origin: $ORIGIN" \
    && printf '%s\n' "$headers" | grep -qix 'access-control-allow-credentials: true'; then
    ok "[cors] $label"
  else
    fail "[cors: $ORIGIN not allowed with credentials] $label"
    printf '%s\n' "$headers" | grep -i '^HTTP\|^access-control' | head -5
  fi
}

read_checks() {
  req 200 '<cdt-root'        "app shell"       "$FE/"
  req 200 '<cdt-root'        "deep link (SPA)" "$FE/article/some-slug"
  req 200 'addEventListener' "service worker"  "$FE/offline-sw.js"

  # The API URL is baked into the bundle at build time: check the right build was deployed.
  scripts=$(curl -s "$FE/" | grep -oE '(src|href)="[^"]+\.js"' | sed -E 's/^(src|href)="//; s/"$//')
  # The minifier may quote it with ", ' or a backtick. Unminified builds keep
  # comments, so commented-out alternatives in environment.ts are skipped.
  api_re="api_url: *[\"'\`]$(printf '%s' "$API" | sed 's/[.[\*^$/]/\\&/g')[\"'\`]"
  found=""
  for s in $scripts; do
    case "$s" in http*) u=$s ;; /*) u=$FE$s ;; *) u=$FE/$s ;; esac
    if curl -s "$u" | grep -vE '^[[:space:]]*//' | grep -qE -- "$api_re"; then found=$s; break; fi
  done
  if [ -n "$found" ]; then ok "bundle calls $API ($found)"; else fail "no bundle script contains \"$API\" (wrong build configuration?)"; fi

  req 200 '"tags"' "GET $API/tags" -H "Origin: $ORIGIN" "$API/tags"
  cors "GET /tags"              "$API/tags"
  cors "preflight POST /users" -X OPTIONS -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: content-type' "$API/users"
}

case "$MODE" in
  read)
    read_checks
    ;;
  create)
    read_checks
    U="websmoke$(date +%s)"
    req 201 "\"$U\"" "register $U" -X POST -H "Origin: $ORIGIN" -H 'Content-Type: application/json' "$API/users" \
      -d "{\"user\":{\"email\":\"$U@example.com\",\"username\":\"$U\",\"password\":\"Passw0rd!\"}}"
    req 200 "\"$U\"" "current user via cookie" -H "Origin: $ORIGIN" "$API/user"
    ;;
  *)
    echo "usage: $0 read|create <frontend-url> <api-url> [cookie-jar]" >&2
    exit 2
    ;;
esac

exit $FAILED
