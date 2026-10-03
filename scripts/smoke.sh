#!/bin/sh
# Smoke test against a deployed (or `wrangler dev`) Conduit frontend.
#
# Usage: scripts/smoke.sh read|create <base-url> [cookie-jar]
#   read:   the app shell, a deep link (SPA fallback), the service worker and
#           GET /api/tags through the frontend Worker's proxy. Writes nothing.
#   create: read, then register a random user and read it back through the
#           proxy with the auth cookie, proving the same-origin cookie works.
#           Writes test data: not for production.
#
# Exits non-zero if any request returns an unexpected status code or body.
set -u
MODE=${1:-}; B=${2:-}; J=${3:-${TMPDIR:-/tmp}/conduit-web-smoke-jar.txt}
FAILED=0

# req <expected-status> <expected-body-substring> <label> <curl args...>
req() {
  expected=$1; needle=$2; label=$3; shift 3
  out=$(curl -s -b "$J" -c "$J" -w '\n%{http_code}' "$@")
  code=$(printf '%s' "$out" | tail -n 1)
  body=$(printf '%s\n' "$out" | sed '$d')
  if [ "$code" = "$expected" ] && printf '%s' "$body" | grep -qF -- "$needle"; then
    echo "ok   [$code] $label"
  else
    echo "FAIL [$code, expected $expected with \"$needle\"] $label"
    printf '%s\n' "$body" | sed 's/"token":"[^"]*"/"token":"…"/' | head -c 500
    echo
    FAILED=1
  fi
}

read_checks() {
  req 200 '<cdt-root'   "app shell"             "$B/"
  req 200 '<cdt-root'   "deep link (SPA)"       "$B/article/some-slug"
  req 200 'addEventListener' "service worker"   "$B/offline-sw.js"
  req 200 '"tags"'      "GET /api/tags (proxy)" "$B/api/tags"
}

case "$MODE" in
  read)
    read_checks
    ;;
  create)
    read_checks
    U="websmoke$(date +%s)"
    req 201 "\"$U\"" "register $U (proxy)" -X POST -H 'Content-Type: application/json' "$B/api/users" \
      -d "{\"user\":{\"email\":\"$U@example.com\",\"username\":\"$U\",\"password\":\"Passw0rd!\"}}"
    req 200 "\"$U\"" "current user via cookie" "$B/api/user"
    ;;
  *)
    echo "usage: $0 read|create <base-url> [cookie-jar]" >&2
    exit 2
    ;;
esac

exit $FAILED
