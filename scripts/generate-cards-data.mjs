/**
 * data/cards.json → assets/js/cards-data.js + assets/js/verification.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/cards.json"), "utf8"));
const reviewPath = path.join(root, "data/review.json");
const review = fs.existsSync(reviewPath)
  ? JSON.parse(fs.readFileSync(reviewPath, "utf8"))
  : {};

function esc(str) {
  return JSON.stringify(str ?? "");
}

const lines = [];
lines.push(`/**`);
lines.push(` * CardWise catalog — GENERATED from data/cards.json`);
lines.push(` * Do not edit by hand. Run: node scripts/generate-cards-data.mjs`);
lines.push(` * lastVerified: ${data.meta?.lastVerified || ""}`);
lines.push(` */`);
lines.push(`window.CARDWISE_META = ${JSON.stringify(data.meta, null, 2)};`);
lines.push(``);
lines.push(`function card(base) {`);
lines.push(`  return Object.assign({ group: "popular", earnLabel: "cashback" }, base);`);
lines.push(`}`);
lines.push(``);
lines.push(`window.CARDWISE_CARDS = [`);

for (const c of data.cards) {
  const copy = { ...c };
  delete copy.reviewStatus;
  delete copy.reviewChecked;
  delete copy.reviewNote;
  lines.push(`  card(${JSON.stringify(copy, null, 4).replace(/\n/g, "\n  ")}),`);
}

lines.push(`];`);
lines.push(``);
lines.push(`window.CARDWISE_byId = function (id) {`);
lines.push(`  return (window.CARDWISE_CARDS || []).find((c) => c.id === id) || null;`);
lines.push(`};`);
lines.push(``);

fs.writeFileSync(path.join(root, "assets/js/cards-data.js"), lines.join("\n"));

const reviewJs = `/**
 * Auto / review status — GENERATED from data/review.json
 * Do not edit by hand. Run: node scripts/generate-cards-data.mjs
 */
window.CARDWISE_REVIEW = ${JSON.stringify(review, null, 2)};

window.CardWiseReview = {
  get(id) {
    return (
      (window.CARDWISE_REVIEW && window.CARDWISE_REVIEW[id]) || {
        status: "unverified",
        checked: null,
        note: "",
      }
    );
  },
  apply(cards) {
    return (cards || []).map((c) => {
      const r = this.get(c.id);
      return Object.assign({}, c, {
        reviewStatus: r.status,
        reviewChecked: r.checked,
        reviewNote: r.note,
      });
    });
  },
  label(status) {
    if (status === "verified" || status === "auto") return "Auto-extracted";
    if (status === "needs-review") return "Needs review";
    return "Needs review";
  },
};
`;

fs.writeFileSync(path.join(root, "assets/js/verification.js"), reviewJs);
console.log(`Generated cards-data.js (${data.cards.length}) + verification.js`);
