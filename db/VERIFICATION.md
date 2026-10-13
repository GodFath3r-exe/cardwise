# CardWise — automated offer refresh (no manual checklist)

You asked for **no human verification loop**. That’s what this pipeline is for.

## What runs automatically

1. Fetch each card’s official source page(s)  
2. Send page text to **Gemini** (free API tier)  
3. Extract fees / offers / **caps** as JSON  
4. If confidence ≥ 0.45 → auto-update `data/cards.json`  
5. Regenerate `assets/js/cards-data.js`, `verification.js`, `db/seed.sql`  
6. (With GitHub) commit weekly + optional Vercel deploy  

UI badge becomes **Auto-checked** with the run date.

## One-time setup (free)

### 1. Gemini API key (free)
1. Open https://aistudio.google.com/apikey  
2. Create an API key  
3. On your Mac:

```bash
export GEMINI_API_KEY="paste-key-here"
```

### 2. Test on 2 cards

```bash
cd /Users/ritiksingh/Documents/Tools/Office/cardwise
npm run refresh:sample
```

### 3. Full refresh

```bash
npm run refresh
```

Then deploy + run `db/seed.sql` in Supabase (until CI does it).

### 4. Hands-off weekly (GitHub)
1. Push this repo to GitHub  
2. Repo → **Settings → Secrets** → add `GEMINI_API_KEY`  
3. Optional: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` for auto-deploy  
4. Workflow file already exists: `.github/workflows/auto-refresh.yml` (Mondays)

## Ranking trust gate (product rule)

Search rankings only include offers that pass `isRankableOffer` in `categories.js`:

- numeric `rateValue` in a sane range  
- rate text contains a digit (no “Boosted” / “See bank”)  
- concrete cap (`capAmount`, non-vague `capLabel`, or `noCap: true`)

Matching but vague offers appear under **Details unclear — not ranked**.

Validate anytime:

```bash
npm run validate
```

## Important honesty (read once)

| Claim | Reality |
|--------|---------|
| No weekly human checklist | **Yes** — bot updates offers |
| 100% bank-perfect forever | **No system can guarantee that** — pages break, PDFs differ, AI can misread |
| What we do about risk | Keep “confirm on bank page”; low-confidence runs **keep old data** and mark Needs review; never invent unlimited caps; vague rates never win rankings |

So: **human checklist removed**. Residual AI/source risk remains — same as any automated fintech scraper.

## Files

| Path | Role |
|------|------|
| `data/cards.json` | Source of truth for catalog |
| `data/review.json` | Auto-check status per card |
| `scripts/auto-refresh.mjs` | The bot |
| `scripts/generate-cards-data.mjs` | JSON → website JS |
| `.github/workflows/auto-refresh.yml` | Weekly schedule |
