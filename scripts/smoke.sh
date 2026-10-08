#!/bin/sh
# Smoke test against a deployed Everise frontend. The site forwards /api to its
# backend over a service binding, so the API is checked through <frontend-url>/api.
#
# Usage: scripts/smoke.sh read|create <frontend-url> [cookie-jar]
#   e.g. scripts/smoke.sh read https://everise.dev
#   read:   app shell, a deep link (SPA fallback), the service worker, the default
#           avatar, that the deployed bundle calls the relative /api, and that
#           <frontend-url>/api reaches the backend. Writes nothing.
#   create: read, then register a random user. When the backend confirms
#           emails, the sign-up answers "check your email" and signing in
#           is refused until the link is opened; otherwise the user is read
#           back with the auth cookie, like the browser does. The address is
#           Resend's test inbox (delivered+...@resend.dev), which accepts the
#           email and delivers it nowhere. Writes test data: not for
#           production.
#
# BUNDLE_API overrides the api_url expected in the bundle (default: /api).
#
# Exits non-zero if any request returns an unexpected status code or body.
#
# Staging is behind Cloudflare Access. Set CF_ACCESS_CLIENT_ID and
# CF_ACCESS_CLIENT_SECRET to an Access service token and every request sends it;
# leave them unset for production.
set -u
MODE=${1:-}; FE=${2:-}; J=${3:-${TMPDIR:-/tmp}/everise-web-smoke-jar.txt}
FE=${FE%/}; API=$FE/api; BUNDLE_API=${BUNDLE_API:-/api}
FAILED=0

ok()   { echo "ok   $1"; }
fail() { echo "FAIL $1"; FAILED=1; }

# Every request goes through http, which adds the Access service token if set.
CF_ACCESS_CLIENT_ID=${CF_ACCESS_CLIENT_ID:-}
CF_ACCESS_CLIENT_SECRET=${CF_ACCESS_CLIENT_SECRET:-}
http() {
  if [ -n "$CF_ACCESS_CLIENT_ID" ]; then
    curl -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" "$@"
  else
    curl "$@"
  fi
}

# req <expected-status> <expected-body-substring> <label> <curl args...>
req() {
  expected=$1; needle=$2; label=$3; shift 3
  out=$(http -s -b "$J" -c "$J" -w '\n%{http_code}' "$@")
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

# image <label> <url>: must answer 200 with an image content type.
image() {
  info=$(http -s -o /dev/null -w '%{http_code} %{content_type}' "$2")
  case "$info" in
    "200 image/"*) ok "[$info] $1" ;;
    *) fail "[$info, expected 200 image/*] $1" ;;
  esac
}

read_checks() {
  req 200 '<cdt-root'        "app shell"       "$FE/"
  req 200 '<cdt-root'        "deep link (SPA)" "$FE/article/some-slug"
  req 200 'addEventListener' "service worker"  "$FE/offline-sw.js"

  # The API URL is baked into the bundle at build time: check the right build was deployed.
  # The minifier may quote it with ", ' or a backtick. Unminified builds keep
  # comments, so commented-out alternatives in environment.ts are skipped.
  api_re="api_url: *[\"'\`]$(printf '%s' "$BUNDLE_API" | sed 's/[.[\*^$/]/\\&/g')[\"'\`]"
  # Right after `wrangler deploy`, Cloudflare can serve the previous build for a
  # few seconds, so retry for up to a minute (BUNDLE_WAIT seconds) before failing.
  found=""; waited=0; wait_max=${BUNDLE_WAIT:-60}
  while :; do
    scripts=$(http -s "$FE/" | grep -oE '(src|href)="[^"]+\.js"' | sed -E 's/^(src|href)="//; s/"$//')
    for s in $scripts; do
      case "$s" in http*) u=$s ;; /*) u=$FE$s ;; *) u=$FE/$s ;; esac
      if http -s "$u" | grep -vE '^[[:space:]]*//' | grep -qE -- "$api_re"; then found=$s; break; fi
    done
    [ -n "$found" ] || [ "$waited" -ge "$wait_max" ] && break
    sleep 5; waited=$((waited + 5))
  done
  if [ -n "$found" ]; then
    if [ "$waited" -gt 0 ]; then ok "bundle calls $BUNDLE_API ($found, after ${waited}s)"; else ok "bundle calls $BUNDLE_API ($found)"; fi
  else
    fail "no bundle script contains api_url \"$BUNDLE_API\" after ${waited}s (wrong build configuration?)"
  fi

  # After the bundle check: by then the new build is being served.
  image "default avatar" "$FE/assets/images/avatar-profile.png"

  # Answered by the backend through the service binding, not by the SPA fallback.
  req 200 '"tags"' "GET /api/tags via the frontend" "$API/tags"
}

case "$MODE" in
  read)
    read_checks
    ;;
  create)
    read_checks
    U="websmoke$(date +%s)"
    E="delivered+$U@resend.dev"
    signup=$(http -s -b "$J" -c "$J" -H 'Content-Type: application/json' "$API/users" \
      -d "{\"user\":{\"email\":\"$E\",\"username\":\"$U\",\"password\":\"Passw0rd!\"}}")
    case "$signup" in
      *"not a bot"*)
        # The backend has the bot check (TURNSTILE_SECRET_KEY): a script
        # can't sign up, which is what this shows.
        ok "[403] register $U: refused without the bot check's token"
        ;;
      *'"confirmation"'*)
        ok "[201] register $U: a confirmation link was emailed"
        req 403 '"unconfirmedEmail"' "sign-in refused until the email is confirmed" \
          -X POST -H 'Content-Type: application/json' "$API/users/login" \
          -d "{\"user\":{\"email\":\"$E\",\"password\":\"Passw0rd!\"}}"
        ;;
      *"\"$U\""*)
        ok "[201] register $U: signed in (emails aren't confirmed)"
        req 200 "\"$U\"" "current user via cookie" "$API/user"
        ;;
      *)
        fail "register $U"
        printf '%s\n' "$signup" | head -c 500
        echo
        ;;
    esac
    ;;
  *)
    echo "usage: $0 read|create <frontend-url> [cookie-jar]" >&2
    exit 2
    ;;
esac

exit $FAILED
