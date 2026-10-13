# CardWise — security hardening notes

## What’s in place

| Control | Where |
|--------|--------|
| Escape catalog/auth strings in DOM | `assets/js/safe.js` + app/detail/auth |
| Security headers + CSP | `vercel.json` |
| Source URL allowlist for refresh bot | `scripts/allowed-hosts.mjs` + `auto-refresh.mjs` |
| Catalog schema checks | `npm run validate` |
| Wallet RLS (own rows only) | `db/auth.sql` |
| Catalog public **read** only | `db/schema.sql` (no insert/update policies for anon) |
| Anon key only in browser | `supabase-config.js` — never `service_role` |

This is **hardening**, not an OWASP certification or pentest.

## RLS curl checklist (run after auth is live)

Replace placeholders. Use the **anon** key from Supabase → Settings → API.

### 1) Catalog is readable without login

```bash
curl -sS \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/cards?select=id&limit=3"
```

Expect: JSON array of cards (HTTP 200).

### 2) Anon cannot write catalog

```bash
curl -sS -X POST \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"id":"hack-test","name":"x","short_name":"x","bank":"x","is_active":true}' \
  "$SUPABASE_URL/rest/v1/cards"
```

Expect: error / 401 / 403 — **not** a successful insert.

### 3) Anon cannot read another user’s wallet

```bash
curl -sS \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/user_cards?select=*"
```

Expect: `[]` (empty), not other users’ rows.

### 4) Logged-in user sees only own `user_cards`

1. Sign in on the site, copy the access token from DevTools → Application → Local Storage → Supabase auth session (`access_token`).
2. Run:

```bash
curl -sS \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  "$SUPABASE_URL/rest/v1/user_cards?select=card_id"
```

Expect: only that user’s card ids.

3. With a second account’s JWT, confirm you do **not** see the first user’s cards.

### 5) SQL sanity (Supabase SQL editor)

```sql
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('user_cards', 'profiles', 'cards', 'card_offers', 'card_sources');
```

Confirm `user_cards` policies all use `auth.uid() = user_id`.

## Ops checklist

### A) RLS curls (automated)

```bash
chmod +x scripts/check-rls.sh
./scripts/check-rls.sh
```

Logged-in check (after Google sign-in on the site):

1. DevTools → Application → Local Storage → key containing `auth` / `supabase`
2. Copy `access_token` from the JSON session
3. Run:

```bash
USER_JWT='paste-access-token-here' ./scripts/check-rls.sh
```

**Last run (2026-10-13):**

| Check | Result |
|--------|--------|
| 1 Catalog readable as anon | PASS (200, card ids) |
| 2 Anon cannot INSERT cards | PASS (RLS `42501` / 401) |
| 3 Anon `user_cards` empty | PASS (`[]`) |
| 4 Logged-in own wallet only | Manual — needs your JWT |

SQL sanity (Supabase → SQL editor):

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('user_cards', 'profiles', 'cards', 'card_offers', 'card_sources');
```

Confirm `user_cards` policies use `auth.uid() = user_id`.

### B) Lock Supabase redirect URLs (you do this in the dashboard)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project `givtbcrjkivkqeffrzxl`
2. **Authentication → URL Configuration**
3. Set:
   - **Site URL:** `https://cardwise-xi-ivory.vercel.app`
   - **Redirect URLs** (only these — remove wildcards like `*` if present):
     - `https://cardwise-xi-ivory.vercel.app`
     - `https://cardwise-xi-ivory.vercel.app/**`
     - `http://localhost:5180/**` (optional, local only)
4. Save
5. Also confirm **Google Cloud Console → OAuth client → Authorized JavaScript origins** only lists your Vercel URL (+ localhost if needed). Redirect URI stays `https://givtbcrjkivkqeffrzxl.supabase.co/auth/v1/callback`

### C) Vercel Deployment Protection

**Check (2026-10-13):** `curl -sI https://cardwise-xi-ivory.vercel.app/` → **HTTP 200** (public). Security headers from `vercel.json` are present. Production is **not** behind a Vercel login wall.

If a preview URL ever asks for Vercel auth:

1. [Vercel Dashboard](https://vercel.com) → project **cardwise**
2. **Settings → Deployment Protection**
3. For **Production**: Standard Protection / Vercel Authentication → **Off** / only preview protected
4. Save

### D) Other

- [x] `service_role` key not in `assets/` (only anon in `supabase-config.js`)
- [ ] Re-run `npm run validate` before deploy after catalog edits

## Residual risks (still open)

- Style CSP allows `'unsafe-inline'` (card gradients use `style=` attributes)
- AI refresh can still mis-extract terms (product integrity, not classic XSS)
- No privacy policy / account-delete UI yet (DPDP)
- No dependency pinning / SBOM for the Supabase CDN script
