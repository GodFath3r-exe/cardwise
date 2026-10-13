#!/usr/bin/env bash
# CardWise — RLS smoke tests (anon key only)
# Usage:
#   ./scripts/check-rls.sh
# Optional logged-in check:
#   USER_JWT='eyJ...' ./scripts/check-rls.sh

set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://givtbcrjkivkqeffrzxl.supabase.co}"
ANON_KEY="${ANON_KEY:-}"

if [[ -z "$ANON_KEY" ]]; then
  # Fallback: read public anon key from supabase-config.js
  ANON_KEY="$(
    node -e "
      const fs=require('fs');
      const t=fs.readFileSync('assets/js/supabase-config.js','utf8');
      const m=t.match(/anonKey:\\s*\\n?\\s*[\"']([^\"']+)[\"']/);
      if(!m) process.exit(1);
      process.stdout.write(m[1]);
    "
  )"
fi

pass=0
fail=0

check() {
  local name="$1"
  local expect="$2"
  local body="$3"
  local code="$4"
  # Match against response body only (HTTP code printed separately)
  if printf '%s' "$body" | grep -Eq "$expect"; then
    echo "PASS  $name (HTTP $code)"
    pass=$((pass + 1))
  else
    echo "FAIL  $name (HTTP $code)"
    echo "      body: ${body:0:200}"
    fail=$((fail + 1))
  fi
}

echo "Supabase: $SUPABASE_URL"
echo

body="$(curl -sS -w '\n%{http_code}' \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/cards?select=id&limit=3")"
code="${body##*$'\n'}"
json="${body%$'\n'*}"
check "1) Catalog readable as anon" '"id"' "$json" "$code"

body="$(curl -sS -w '\n%{http_code}' -X POST \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"id":"hack-test","name":"x","short_name":"x","bank":"x","is_active":true}' \
  "$SUPABASE_URL/rest/v1/cards")"
code="${body##*$'\n'}"
json="${body%$'\n'*}"
check "2) Anon cannot INSERT cards" '42501|401|403|row-level security' "$json" "$code"

body="$(curl -sS -w '\n%{http_code}' \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/user_cards?select=*")"
code="${body##*$'\n'}"
json="${body%$'\n'*}"
check "3) Anon user_cards empty" '^\[\]$' "$json" "$code"

if [[ -n "${USER_JWT:-}" ]]; then
  body="$(curl -sS -w '\n%{http_code}' \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $USER_JWT" \
    "$SUPABASE_URL/rest/v1/user_cards?select=card_id")"
  code="${body##*$'\n'}"
  json="${body%$'\n'*}"
  check "4) Logged-in can read own user_cards" '\[|\{' "$json" "$code"
  echo "      (manual) Confirm these card_ids belong only to that account: $json"
else
  echo "SKIP  4) Logged-in user_cards — set USER_JWT to test"
fi

echo
echo "Passed: $pass  Failed: $fail"
[[ "$fail" -eq 0 ]]
