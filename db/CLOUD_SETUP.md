# CardWise — cloud database setup (Supabase)

## What you need (free tier is enough)

| Tool | Why |
|------|-----|
| **Supabase** account | Hosted PostgreSQL + dashboard + API |
| Browser | Create project + run SQL |
| Later (optional) | GitHub Actions or a small script for weekly refresh |

You do **not** need Cursor Premium for the database. Premium helps you *build*; Supabase holds the data.

## Step 1 — Create project

1. Open [https://supabase.com](https://supabase.com) → **Start your project**
2. Sign in (GitHub is fine)
3. **New project**
   - Name: `cardwise`
   - Database password: save it somewhere safe
   - Region: closest to you (e.g. Mumbai / Singapore if available)
4. Wait until the project is ready (1–2 minutes)

## Step 2 — Create tables

1. In Supabase left sidebar → **SQL** → **New query**
2. Open this file on your Mac: `db/schema.sql`
3. Copy all → paste into SQL Editor → **Run**

## Step 3 — Load your 20 cards

1. New query again
2. Open `db/seed.sql` → copy all → paste → **Run**
3. Left sidebar → **Table Editor** → open `cards`  
   You should see ~20 rows.

## Step 4 — Save connection info (for later app)

Project **Settings → API**:
- Project URL
- `anon` public key (for website reads later)

Project **Settings → Database**:
- Connection string (URI) — only for server/scripts, never put in public frontend

## What we set up for you locally

```
db/schema.sql   → tables (cards, offers, sources, source_urls, refresh_runs)
db/seed.sql     → your current CardWise catalog
```

## Live website

Production URL: https://cardwise-xi-ivory.vercel.app

Redeploy after changes:
```bash
cd /Users/ritiksingh/Documents/Tools/Office/cardwise
npx vercel deploy --prod --yes
```

## Connect the website

1. Supabase → **Project Settings → API**
2. Copy **Project URL** and **anon public** key
3. Paste into `assets/js/supabase-config.js`
4. Open `index.html` — banner should say **Loaded from Supabase**

Local `cards-data.js` stays as backup if the key is missing or the network fails.

## Google login + My Cards sync

See **`db/AUTH_SETUP.md`** — run `db/auth.sql`, then connect Google OAuth in Supabase.

## Keeping offer data correct (automated)

See **`db/VERIFICATION.md`** — Gemini bot refreshes offers from bank pages.
Run locally: `export GEMINI_API_KEY=... && npm run refresh`  
Or push to GitHub and use the weekly workflow.

## Next (when you’re ready)

1. Weekly script: fetch `source_urls` → AI summarise → update rows  
   (API key + cron, not Cursor chat)

## Cost reality

- Supabase free tier is enough to start
- Weekly AI refresh for tens of cards stays cheap if you only process **changed** pages
