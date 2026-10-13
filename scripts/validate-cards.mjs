/**
 * Schema / trust checks for data/cards.json
 * Exit 1 on hard errors; print warnings for vague rates (not ranked in UI).
 *
 *   node scripts/validate-cards.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isAllowedSourceUrl } from "./allowed-hosts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cardsPath = path.join(__dirname, "../data/cards.json");

function vagueRate(rate) {
  const r = String(rate || "").toLowerCase().trim();
  if (!r || !/\d/.test(r)) return true;
  return /^(boosted|varies|tbd|n\/?a|see\s)/i.test(r);
}

function vagueCap(o) {
  if (o.noCap === true) return false;
  if (o.capAmount != null && Number.isFinite(Number(o.capAmount))) return false;
  const c = String(o.capLabel || "").toLowerCase().trim();
  if (!c || c === "—" || c === "-") return true;
  return /^(see\s|confirm|tbd|n\/?a|caps?\s*apply)/i.test(c);
}

const catalog = JSON.parse(fs.readFileSync(cardsPath, "utf8"));
const cards = catalog.cards || [];
const errors = [];
const warnings = [];
const ids = new Set();

for (const c of cards) {
  if (!c.id) errors.push("card missing id");
  else if (ids.has(c.id)) errors.push(`duplicate id: ${c.id}`);
  else ids.add(c.id);

  if (!c.shortName) errors.push(`${c.id}: missing shortName`);
  if (!c.bank) errors.push(`${c.id}: missing bank`);
  if (!Array.isArray(c.offers) || !c.offers.length) errors.push(`${c.id}: no offers`);
  if (!Array.isArray(c.sources) || !c.sources.length) errors.push(`${c.id}: no sources`);
  else {
    for (const s of c.sources) {
      if (!s.url) errors.push(`${c.id}: source missing url`);
      else if (!isAllowedSourceUrl(s.url)) {
        errors.push(`${c.id}: source host not allowlisted: ${s.url}`);
      }
    }
  }

  for (const o of c.offers || []) {
    const rv = o.rateValue == null ? null : Number(o.rateValue);
    if (rv != null && (!Number.isFinite(rv) || rv < 0 || rv > 40)) {
      errors.push(`${c.id}: rateValue out of range (${o.rateValue}) on “${o.title}”`);
    }
    if (vagueRate(o.rate) || vagueCap(o)) {
      warnings.push(`${c.id}: not rankable — “${o.title}” rate=${o.rate} cap=${o.capLabel}`);
    }
  }
}

console.log(`Validated ${cards.length} cards`);
console.log(`Errors: ${errors.length}`);
errors.slice(0, 40).forEach((e) => console.log("  ERR ", e));
console.log(`Warnings (excluded from ranking): ${warnings.length}`);
warnings.slice(0, 40).forEach((w) => console.log("  WARN", w));
if (warnings.length > 40) console.log(`  … +${warnings.length - 40} more`);

if (errors.length) process.exit(1);
console.log("OK — no hard errors");
