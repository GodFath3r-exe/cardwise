/**
 * Automated offer refresh — no manual checklist.
 *
 * 1) Fetches each card's official source URLs
 * 2) Asks Gemini (free tier) to extract fees/offers/caps as JSON
 * 3) Writes updates into data/cards.json + data/review.json
 * 4) Regenerates assets/js + db/seed.sql
 *
 * Setup (free):
 *   export GEMINI_API_KEY="your-key"   # https://aistudio.google.com/apikey
 *   node scripts/auto-refresh.mjs
 *
 * Optional:
 *   CARDWISE_REFRESH_LIMIT=3 node scripts/auto-refresh.mjs   # test few cards
 *   CARDWISE_REFRESH_IDS=hdfc-freedom,sbi-cashback node scripts/auto-refresh.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { isAllowedSourceUrl } from "./allowed-hosts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const cardsPath = path.join(root, "data/cards.json");
const reviewPath = path.join(root, "data/review.json");
const cacheDir = path.join(root, "data/refresh-cache");
const logPath = path.join(root, "data/refresh-log.json");

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const LIMIT = Number(process.env.CARDWISE_REFRESH_LIMIT || 0);
const ONLY = (process.env.CARDWISE_REFRESH_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

fs.mkdirSync(cacheDir, { recursive: true });

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadJson(p, fallback) {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function fetchText(url) {
  if (!isAllowedSourceUrl(url)) {
    return { ok: false, status: 0, text: "", error: "host not allowlisted" };
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CardWiseBot/1.0; +https://cardwise-xi-ivory.vercel.app)",
        Accept: "text/html,application/xhtml+xml,application/pdf,*/*",
      },
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, status: res.status, text: "" };

    // Reject open redirects off the allowlist
    if (res.url && !isAllowedSourceUrl(res.url)) {
      return {
        ok: false,
        status: res.status,
        text: "",
        error: `redirect left allowlist: ${res.url}`,
        final: res.url,
      };
    }

    const ctype = res.headers.get("content-type") || "";
    if (ctype.includes("pdf") || url.endsWith(".pdf")) {
      // Keep PDFs as placeholder — Gemini can still use URL context if we pass link + note
      return {
        ok: true,
        status: res.status,
        text: `[PDF source] ${url}\n(Use publicly known terms from this PDF URL; binary not inlined.)`,
        final: res.url,
      };
    }
    let html = await res.text();
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (html.length > 24000) html = html.slice(0, 24000);
    return { ok: true, status: res.status, text: html, final: res.url };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, status: 0, text: "", error: String(e.message || e) };
  }
}

async function geminiExtract(card, sourceBundles) {
  if (!API_KEY) throw new Error("GEMINI_API_KEY missing");

  const prompt = `You are updating a credit-card comparison database for India (CardWise).
Extract ONLY facts supported by the SOURCE TEXT below. Prefer caps, fees, and merchant lists.
If unclear, keep previous values conservative and set confidence low.

Return STRICT JSON (no markdown) with this shape:
{
  "joiningFee": "string",
  "annualFee": "string",
  "waiver": "string",
  "feeHint": "string",
  "offers": [
    {
      "title": "string (merchant/category)",
      "rate": "string shown to user",
      "rateValue": number or null (approx % for ranking; cash-equivalent if points),
      "capLabel": "string",
      "capAmount": number or null (rupee cash-equivalent of cap when possible),
      "capPeriod": "month|statement|quarter|null",
      "tier": "high|mid|base",
      "hint": "string — MUST mention caps / point value if relevant"
    }
  ],
  "confidence": 0-1,
  "summary": "one sentence",
  "warnings": ["string"]
}

Rules:
- Never claim unlimited if a monthly/statement cap exists.
- Never use vague rates like "Boosted", "See bank", or rates with no digit. Prefer "5%", "10X", "~1.5%".
- Every offer needs a concrete capLabel (e.g. "₹1,500 / month") or capAmount, or set "noCap": true only if the source clearly says uncapped.
- For reward points, estimate cash-equivalent % when redemption value is stated; otherwise say points and use lower rateValue.
- Keep 2-6 offers max, best categories first.
- Movies/BookMyShow must note shared caps if applicable.
- If the source is unclear, omit the offer rather than inventing a percentage.

CARD:
${JSON.stringify({
  id: card.id,
  name: card.name,
  shortName: card.shortName,
  bank: card.bank,
  currentOffers: card.offers,
  currentFees: {
    joiningFee: card.joiningFee,
    annualFee: card.annualFee,
    waiver: card.waiver,
    feeHint: card.feeHint,
  },
})}

SOURCE TEXT:
${sourceBundles}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
  }
  const body = await res.json();
  const text =
    body?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

function applyExtraction(card, extracted) {
  const next = { ...card };
  if (extracted.joiningFee) next.joiningFee = extracted.joiningFee;
  if (extracted.annualFee) next.annualFee = extracted.annualFee;
  if (extracted.waiver) next.waiver = extracted.waiver;
  if (extracted.feeHint) next.feeHint = extracted.feeHint;
  if (Array.isArray(extracted.offers) && extracted.offers.length) {
    const mapped = extracted.offers.map((o) => ({
      title: String(o.title || "Offer"),
      rate: String(o.rate || ""),
      rateValue: o.rateValue == null ? null : Number(o.rateValue),
      capLabel: o.capLabel == null ? null : String(o.capLabel),
      capAmount: o.capAmount == null ? null : Number(o.capAmount),
      capPeriod: o.capPeriod || null,
      noCap: o.noCap === true ? true : undefined,
      tier: o.tier || "base",
      hint: o.hint || undefined,
    }));
    // Drop invented vague rates — keep previous card offers if extraction is all vague
    const concrete = mapped.filter((o) => /\d/.test(o.rate || "") && !/^boosted$/i.test(String(o.rate || "").trim()));
    if (concrete.length) next.offers = concrete;
  }
  return next;
}

async function main() {
  if (!API_KEY) {
    console.error(`
GEMINI_API_KEY is required for automated refresh (free at https://aistudio.google.com/apikey).

  export GEMINI_API_KEY="..."
  node scripts/auto-refresh.mjs
`);
    process.exit(1);
  }

  const catalog = loadJson(cardsPath, null);
  if (!catalog?.cards?.length) {
    console.error("data/cards.json missing — run export first");
    process.exit(1);
  }
  const review = loadJson(reviewPath, {});
  const log = { startedAt: new Date().toISOString(), results: [] };

  let list = catalog.cards.slice();
  if (ONLY.length) list = list.filter((c) => ONLY.includes(c.id));
  if (LIMIT > 0) list = list.slice(0, LIMIT);

  console.log(`Refreshing ${list.length} / ${catalog.cards.length} cards with ${MODEL}…`);

  let updated = 0;
  let failed = 0;

  for (const card of list) {
    const sources = card.sources || [];
    if (!sources.length) {
      log.results.push({ id: card.id, status: "skip", reason: "no sources" });
      continue;
    }

    process.stdout.write(`• ${card.id} … `);
    const bundles = [];
    let anyOk = false;
    for (const s of sources.slice(0, 2)) {
      if (!isAllowedSourceUrl(s.url)) {
        bundles.push(`### ${s.label}\nURL: ${s.url}\nSKIPPED: host not allowlisted`);
        continue;
      }
      const fetched = await fetchText(s.url);
      const hash = createHash("sha256").update(fetched.text || "").digest("hex").slice(0, 16);
      fs.writeFileSync(
        path.join(cacheDir, `${card.id}-${hash}.txt`),
        `URL: ${s.url}\nSTATUS: ${fetched.status}\n\n${fetched.text || fetched.error || ""}`
      );
      if (fetched.ok && fetched.text) {
        anyOk = true;
        bundles.push(`### ${s.label}\nURL: ${s.url}\n\n${fetched.text}`);
      } else {
        bundles.push(`### ${s.label}\nURL: ${s.url}\nFETCH FAILED: ${fetched.status} ${fetched.error || ""}`);
      }
    }

    if (!anyOk) {
      console.log("fetch failed");
      failed++;
      review[card.id] = {
        status: "needs-review",
        checked: today(),
        note: "Official source fetch failed during auto-refresh",
        source: "auto-refresh",
      };
      log.results.push({ id: card.id, status: "fetch-failed" });
      continue;
    }

    try {
      const extracted = await geminiExtract(card, bundles.join("\n\n"));
      const conf = Number(extracted.confidence || 0);
      const idx = catalog.cards.findIndex((c) => c.id === card.id);
      if (idx >= 0 && conf >= 0.45 && Array.isArray(extracted.offers) && extracted.offers.length) {
        catalog.cards[idx] = applyExtraction(catalog.cards[idx], extracted);
        updated++;
        review[card.id] = {
          status: "auto",
          checked: today(),
          note: extracted.summary || "Auto-refreshed from official sources",
          confidence: conf,
          warnings: extracted.warnings || [],
          source: "auto-refresh",
        };
        console.log(`updated (confidence ${conf})`);
        log.results.push({ id: card.id, status: "updated", confidence: conf });
      } else {
        review[card.id] = {
          status: "needs-review",
          checked: today(),
          note: extracted.summary || "Low confidence extraction — kept previous offers",
          confidence: conf,
          warnings: extracted.warnings || [],
          source: "auto-refresh",
        };
        console.log(`low confidence (${conf}) — kept old data`);
        log.results.push({ id: card.id, status: "low-confidence", confidence: conf });
      }
    } catch (err) {
      failed++;
      console.log("error:", err.message || err);
      review[card.id] = {
        status: "needs-review",
        checked: today(),
        note: String(err.message || err).slice(0, 180),
        source: "auto-refresh",
      };
      log.results.push({ id: card.id, status: "error", error: String(err.message || err) });
    }

    // gentle rate limit for free tier
    await new Promise((r) => setTimeout(r, 1200));
  }

  catalog.meta = catalog.meta || {};
  catalog.meta.lastVerified = today();
  const [y, m, d] = today().split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  catalog.meta.lastVerifiedLabel = `${Number(d)} ${months[Number(m) - 1]} ${y}`;
  catalog.meta.note =
    "Auto-refreshed from bank pages via CardWise bot. Always confirm on the bank’s official page before you apply or spend.";
  catalog.meta.phase = "Auto-refreshed catalog";

  fs.writeFileSync(cardsPath, JSON.stringify(catalog, null, 2) + "\n");
  fs.writeFileSync(reviewPath, JSON.stringify(review, null, 2) + "\n");
  log.finishedAt = new Date().toISOString();
  log.updated = updated;
  log.failed = failed;
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2) + "\n");

  execFileSync(process.execPath, [path.join(root, "scripts/generate-cards-data.mjs")], {
    stdio: "inherit",
  });
  execFileSync(process.execPath, [path.join(root, "db/generate-seed.mjs")], {
    stdio: "inherit",
  });

  console.log(`\nDone. Updated ${updated}, failed ${failed}. Log: data/refresh-log.json`);
  console.log("Next: deploy + run db/seed.sql in Supabase (or wire CI to do both).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
