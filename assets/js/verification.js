/**
 * Auto / review status — GENERATED from data/review.json
 * Do not edit by hand. Run: node scripts/generate-cards-data.mjs
 */
window.CARDWISE_REVIEW = {
  "hdfc-freedom": {
    "status": "auto",
    "checked": "2026-10-13",
    "note": "10X = BookMyShow/Swiggy/Uber/BigBasket/OYO; 2,500 CP/month cap; ~₹0.15/CP cash redeem.",
    "source": "manual-bootstrap"
  },
  "au-lit": {
    "status": "auto",
    "checked": "2026-10-13",
    "note": "Pack-based; grocery/apparel 5% capped ₹500/30 days; base ~0.25% without packs.",
    "source": "manual-bootstrap"
  },
  "reliance-sbi-prime": {
    "status": "auto",
    "checked": "2026-10-13",
    "note": "10 RP/₹100 at participating Reliance Retail (~2.5% @ ₹0.25/RP). Partner discounts: Trends/Ajio/JioMart capped — not Pantaloons/Zara. Confirm sbicard.com.",
    "source": "manual-bootstrap"
  }
};

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
