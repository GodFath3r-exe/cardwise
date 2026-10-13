/**
 * Category search — match spend intent to card offers, rank high → low.
 * Merchant/product routes stay specific (Reliance Digital ≠ Pantaloons/Zara).
 */
(function () {
  const CATEGORIES = [
    {
      id: "swiggy",
      label: "Swiggy",
      synonyms: ["swiggy", "swiggy food", "food delivery", "food app", "instamart", "swiggy dineout"],
      patterns: [/swiggy|instamart/i],
    },
    {
      id: "zomato",
      label: "Zomato",
      synonyms: ["zomato", "zomato food", "zomato gold"],
      patterns: [/zomato/i],
    },
    {
      id: "dining",
      label: "Dining / restaurants",
      synonyms: ["dining", "restaurant", "restaurants", "eat out", "dineout", "food"],
      patterns: [/dining|restaurant|dineout/i],
      merchantIds: ["dining"],
    },
    {
      id: "movies",
      label: "Movies",
      synonyms: ["movie", "movies", "movie ticket", "cinema", "pvr", "bookmyshow", "bms"],
      patterns: [/movie|pvr|bookmyshow|\bbms\b|cinema|entertainment/i],
      merchantIds: ["movies"],
    },
    {
      id: "fuel",
      label: "Petrol / fuel",
      synonyms: ["petrol", "fuel", "diesel", "bpcl", "iocl", "hpcl", "indianoil", "indian oil", "petrol pump", "gas station", "petrol bunk"],
      patterns: [/fuel|petrol|diesel|bpcl|iocl|hpcl|indianoil|lubricant|bharatgas/i],
    },
    {
      id: "amazon",
      label: "Amazon",
      synonyms: ["amazon", "amazon pay", "amazon in", "amazon.in"],
      patterns: [/amazon/i],
      merchantIds: ["amazon"],
    },
    {
      id: "flipkart",
      label: "Flipkart",
      synonyms: ["flipkart", "shopsy"],
      patterns: [/flipkart|shopsy/i],
      merchantIds: ["flipkart"],
    },
    {
      id: "myntra",
      label: "Myntra",
      synonyms: ["myntra"],
      patterns: [/myntra/i],
      merchantIds: ["myntra"],
      // Do not treat Reliance Trends / Digital as Myntra
      excludePatterns: [/reliance\s*digital|reliance\s*retail|jiomart/i],
    },
    {
      id: "reliance-digital",
      label: "Reliance Digital",
      synonyms: ["reliance digital", "reliance retail", "my jio", "jiomart digital"],
      patterns: [/reliance\s*digital|reliance\s*retail|\bmy\s*jio\b|jiomart\s*digital/i],
      merchantIds: ["reliance-digital", "reliance-retail", "my-jio", "jiomart-digital"],
      strict: true,
      excludePatterns: [/pantaloons|\bzara\b|lifestyle|myntra|shoppers?\s*stop/i],
    },
    {
      id: "reliance-trends",
      label: "Reliance Trends / Ajio",
      synonyms: ["reliance trends", "ajio", "azorte"],
      patterns: [/reliance\s*trends|\bajio\b|azorte|fashion factory/i],
      merchantIds: ["reliance-trends", "ajio"],
      strict: true,
      excludePatterns: [/reliance\s*digital|pantaloons|\bzara\b|lifestyle(?!\s*card)/i],
    },
    {
      id: "fashion",
      label: "Fashion / apparel",
      synonyms: ["fashion", "apparel", "clothing", "clothes"],
      // Only fashion-specific wording — not generic “online” or Reliance Digital
      patterns: [/myntra|fashion|apparel|nykaa|westside|cliq|\bajio\b|trends|clothing/i],
      excludePatterns: [/reliance\s*digital|jiomart(?!\s)|fuel|petrol/i],
      strict: true,
    },
    {
      id: "travel",
      label: "Travel / flights",
      synonyms: ["travel", "flight", "flights", "cleartrip", "yatra", "indigo", "airline"],
      patterns: [/cleartrip|yatra|travel|flight|indigo|airline|ola/i],
    },
    {
      id: "trains",
      label: "Train tickets (IRCTC)",
      synonyms: ["train", "trains", "irctc", "railway"],
      patterns: [/irctc|train|railway|ac train/i],
    },
    {
      id: "bills",
      label: "Bills / utilities",
      synonyms: ["bill", "bills", "utility", "utilities", "electricity", "recharge", "dth", "google pay", "gpay"],
      patterns: [/utility|utilities|google pay|gpay|recharge|broadband|electricity|bill/i],
    },
    {
      id: "online",
      label: "Online shopping",
      synonyms: ["online", "online shopping", "ecommerce", "e-commerce", "online spend", "shopping online"],
      patterns: [/online spend|other online|10x partner|partner apps|\bonline\b/i],
      excludePatterns: [/reliance\s*digital|reliance\s*trends/i],
    },
    {
      id: "grocery",
      label: "Grocery",
      synonyms: ["grocery", "groceries", "bigbasket", "jiomart", "supermarket", "instamart"],
      patterns: [/grocery|jiomart|bigbasket|instamart/i],
      merchantIds: ["jiomart"],
    },
    {
      id: "quickcommerce",
      label: "Zepto / Blinkit",
      synonyms: ["zepto", "blinkit", "quick commerce", "quickcommerce"],
      patterns: [/zepto|blinkit|quick commerce/i],
    },
    {
      id: "nykaa",
      label: "Nykaa",
      synonyms: ["nykaa", "beauty", "cosmetics"],
      patterns: [/nykaa|beauty|cosmetic/i],
      merchantIds: ["nykaa"],
    },
    {
      id: "tata",
      label: "Tata / Neu",
      synonyms: ["tata", "neu", "croma", "titan", "westside"],
      patterns: [/tata|neu|croma|cliq|westside|titan|1mg|bigbasket/i],
      excludePatterns: [/reliance\s*digital|pantaloons|\bzara\b/i],
    },
    {
      id: "phonepe",
      label: "PhonePe",
      synonyms: ["phonepe", "phone pe", "upi bills"],
      patterns: [/phonepe|pincode/i],
    },
  ];

  /**
   * Store/product → only relevant checkout paths.
   * Reliance Digital must not bleed into Pantaloons/Zara.
   */
  const INTENT_ROUTES = [
    {
      id: "phones-gadgets",
      test: /\b(iphone|ipad|macbook|airpods|apple\s*watch|samsung|oneplus|pixel|laptop|smartphone|mobile\s*phone|gadget)\b/i,
      synonyms: ["iphone", "ipad", "macbook", "laptop", "mobile", "smartphone", "gadgets"],
      label: "Phones / electronics — buy on Amazon or Flipkart",
      queries: ["Amazon", "Flipkart", "Online shopping"],
      tip: "No card lists “iPhone” as a category. Ranked for buying it on Amazon, Flipkart, or general online checkout.",
    },
    {
      id: "reliance-digital",
      test: /reliance\s*digital/i,
      synonyms: ["reliance digital"],
      label: "Reliance Digital (in-store / app)",
      queries: ["Reliance Digital", "Amazon", "Flipkart"],
      tip: "Prefer cards that list Reliance Digital. Amazon / Flipkart are alternatives if you buy the same product online instead.",
    },
    {
      id: "electronics-other-stores",
      test: /vijay\s*sales|poorvika|sangeetha|apple\s*store|\bcroma\b/i,
      synonyms: ["vijay sales", "poorvika", "sangeetha", "croma", "apple store", "electronics"],
      label: "Electronics stores — Croma / Amazon / Flipkart",
      queries: ["Tata / Neu", "Amazon", "Flipkart", "Online shopping"],
      tip: "For Croma, Tata Neu often applies; otherwise Amazon / Flipkart usually win for electronics checkout.",
    },
    {
      id: "fashion-unrelated",
      test: /pantaloons|\bzara\b|lifestyle|shoppers?\s*stop|\bmax\b|zudio|h\s*&\s*m|\bh\s*m\b|uniqlo|marks\s*&\s*spencer|\bm\s*&\s*s\b/i,
      synonyms: [
        "pantaloons",
        "zara",
        "lifestyle",
        "shoppers stop",
        "max",
        "zudio",
        "h&m",
        "hm",
        "h and m",
        "uniqlo",
        "marks and spencer",
        "m&s",
        "fashion",
        "apparel",
        "clothes",
      ],
      label: "Fashion stores — Myntra / Amazon / Flipkart",
      queries: ["Myntra", "Amazon", "Flipkart", "Online shopping"],
      tip: "No card in our catalog lists this store by name. Ranked for related fashion / online partners (Myntra, Amazon, Flipkart).",
    },
    {
      id: "reliance-fashion",
      test: /reliance\s*trends|\bajio\b/i,
      synonyms: ["reliance trends", "ajio"],
      label: "Reliance Trends / Ajio",
      queries: ["Reliance Trends / Ajio", "Myntra", "Amazon", "Flipkart"],
      tip: "Showing cards with Trends / Ajio offers, plus related fashion / online checkouts.",
    },
    {
      id: "westside-tata",
      test: /westside/i,
      synonyms: ["westside"],
      label: "Westside — Tata Neu",
      queries: ["Tata / Neu", "Myntra", "Amazon", "Flipkart"],
      tip: "Westside usually pairs with Tata Neu; Amazon / Flipkart / Myntra are other options.",
    },
    {
      id: "general-shopping",
      test: /\b(shopping\s*mall|retail\s*store|department\s*store)\b/i,
      synonyms: ["shopping mall"],
      label: "Shopping — online & marketplace cards",
      queries: ["Online shopping", "Amazon", "Flipkart"],
      tip: "For general shopping, online / Amazon / Flipkart offers are usually the strongest in our catalog.",
    },
  ];

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function offerText(o) {
    const merchants = Array.isArray(o.merchants) ? o.merchants.join(" ") : "";
    return [o.title, o.hint, o.rate, o.capLabel, merchants].filter(Boolean).join(" ");
  }

  function cardText(c) {
    return [c.name, c.shortName, c.tagline, c.bestFor, c.bank].filter(Boolean).join(" ");
  }

  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** Strip “not X / excluding X” so negative hints don’t create false matches. */
  function positiveOfferBlob(offer) {
    let blob = offerText(offer);
    // Drop common negation phrases before matching brand names
    blob = blob
      .replace(/\bnot\s+(?:at\s+|for\s+|on\s+)?[^.]{0,80}/gi, " ")
      .replace(/\b(?:excluding|excludes|except|unlike|unrelated[^.]{0,40})\b[^.]{0,80}/gi, " ")
      .replace(/\b(?:does\s+not\s+apply|don'?t\s+apply)[^.]{0,80}/gi, " ");
    return norm(blob);
  }

  /** True if this offer positively names the searched brand/store (not “not Zara”). */
  function offerMentionsQuery(offer, q) {
    if (!offer || !q) return false;

    const aliases = [q];
    if (q === "h and m") aliases.push("hm", "h m", "h&m");

    // merchants[] is an explicit allowlist — always trusted
    if (Array.isArray(offer.merchants) && offer.merchants.length) {
      const hit = offer.merchants.some((m) => {
        const nm = normQuery(String(m).replace(/-/g, " "));
        return aliases.some(
          (a) => nm === a || nm.includes(a) || (a.length >= 4 && a.includes(nm))
        );
      });
      if (hit) return true;
    }

    const titleBlob = normQuery(offer.title || "");
    if (titleBlob && aliases.some((a) => (a.length <= 3 ? new RegExp(`(?:^|\\s)${escapeRegExp(a)}(?:\\s|$)`).test(titleBlob) : titleBlob.includes(a)))) {
      return true;
    }

    // Hints only after stripping negations (e.g. “Not Pantaloons / Zara”)
    const blob = positiveOfferBlob(offer);
    if (!blob) return false;
    return aliases.some((a) =>
      a.length <= 3
        ? new RegExp(`(?:^|\\s)${escapeRegExp(a)}(?:\\s|$)`).test(blob)
        : blob.includes(a)
    );
  }

  /**
   * Scan every offer for an explicit merchant/brand mention (e.g. “Zara”, “Reliance Digital”).
   * This is the primary match — we only invent category fallbacks when nothing in the catalog mentions it.
   */
  /** Normalize brand quirks: H&M → "h and m", keep searchable. */
  function normQuery(query) {
    let s = String(query || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Common brand shorthand
    if (s === "hm" || s === "h m") s = "h and m";
    if (s === "m s") s = "m and s";
    return s;
  }

  function searchDirectMerchant(query, cardList, opts) {
    const q = normQuery(query);
    if (!q || q.length < 2) return { results: [], unclear: [], hits: 0 };

    const onlyMine = opts && opts.onlyMine;
    const mine = new Set((opts && opts.myCardIds) || []);
    let list = cardList || [];
    if (onlyMine) list = list.filter((c) => mine.has(c.id));

    const results = [];
    const unclear = [];
    for (const card of list) {
      const matched = (card.offers || []).filter((o) => offerMentionsQuery(o, q));
      if (!matched.length) continue;
      const rankable = matched.filter(isRankableOffer);
      const pool = rankable.length ? rankable : matched;
      const offer = pool.slice().sort((a, b) => (b.rateValue || 0) - (a.rateValue || 0))[0];
      if (!offer) continue;
      const row = {
        card,
        offer,
        score: Number(offer.rateValue) || 0,
        isMine: mine.has(card.id),
        matchedLabels: [`Mentions “${String(query).trim()}\"`],
        rankable: isRankableOffer(offer),
        directMerchant: true,
      };
      if (row.rankable) results.push(row);
      else unclear.push(row);
    }

    results.sort((a, b) => b.score - a.score || a.card.shortName.localeCompare(b.card.shortName));
    unclear.sort((a, b) => a.card.shortName.localeCompare(b.card.shortName));
    return { results, unclear, hits: results.length + unclear.length };
  }

  function resolveCategory(query) {
    const q = norm(query);
    if (!q) return null;

    for (const cat of CATEGORIES) {
      if (cat.synonyms.some((s) => q === norm(s) || q.includes(norm(s)) || (norm(s).length >= 4 && norm(s).includes(q)))) {
        return cat;
      }
    }
    for (const cat of CATEGORIES) {
      if (cat.patterns.some((p) => p.test(q))) return cat;
    }
    return { id: "_free", label: query.trim(), synonyms: [q], patterns: [], free: q, strict: true };
  }

  function expandQuery(query) {
    const raw = String(query || "").trim();
    const q = normQuery(raw);
    if (!q) return null;

    for (const route of INTENT_ROUTES) {
      if (route.test && route.test.test(raw)) {
        return {
          label: route.label,
          queries: route.queries.slice(),
          tip: route.tip,
          routed: true,
          routeId: route.id,
        };
      }
      if (
        (route.synonyms || []).some((s) => {
          const ns = normQuery(s);
          return q === ns || q.includes(ns) || (ns.length >= 4 && ns.includes(q));
        })
      ) {
        return {
          label: route.label,
          queries: route.queries.slice(),
          tip: route.tip,
          routed: true,
          routeId: route.id,
        };
      }
    }

    const cat = resolveCategory(raw);
    return {
      label: cat.label,
      queries: [raw],
      tip: null,
      routed: false,
      category: cat,
    };
  }

  function offerMatches(cat, offer) {
    const text = offerText(offer);
    if (cat.excludePatterns && cat.excludePatterns.some((p) => p.test(text))) return false;

    // Precise merchant tags win when both sides declare them
    if (cat.merchantIds && Array.isArray(offer.merchants) && offer.merchants.length) {
      return offer.merchants.some((m) => cat.merchantIds.includes(m));
    }

    if (cat.free) {
      const words = cat.free.split(" ").filter((w) => w.length >= 3);
      // Ignore tiny tokens (h, m) — they match everything and create junk results
      if (!words.length) return false;
      return words.every((w) => norm(text).includes(w));
    }
    return (cat.patterns || []).some((p) => p.test(text));
  }

  function cardMatchesFallback(cat, card) {
    if (cat.strict || cat.merchantIds) return false;
    const text = cardText(card);
    if (cat.free) return norm(text).includes(cat.free);
    return (cat.patterns || []).some((p) => p.test(text));
  }

  function isVagueRate(rate) {
    const r = String(rate || "")
      .toLowerCase()
      .trim();
    if (!r) return true;
    if (!/\d/.test(r)) return true;
    return /^(boosted|varies|tbd|n\/?a|confirm|see\s)/i.test(r) || /\bsee\s+(bank|hdfc|axis|sbi|icici|amex|au|indusind|sc)\b/i.test(r);
  }

  function isVagueCap(capLabel, capAmount, noCap) {
    if (noCap === true) return false;
    if (capAmount != null && Number.isFinite(Number(capAmount))) return false;
    const c = String(capLabel || "")
      .toLowerCase()
      .trim();
    if (!c || c === "—" || c === "-") return true;
    return /^(see\s|confirm|tbd|n\/?a|caps?\s*apply)/i.test(c) || /\bsee\s+(bank|hdfc|axis|sbi|icici|amex|au|indusind|sc)\b/i.test(c);
  }

  function isRankableOffer(offer) {
    if (!offer) return false;
    const rv = Number(offer.rateValue);
    if (!Number.isFinite(rv) || rv <= 0 || rv > 40) return false;
    if (isVagueRate(offer.rate)) return false;
    if (isVagueCap(offer.capLabel, offer.capAmount, offer.noCap)) return false;
    return true;
  }

  function bestOfferFor(cat, card, opts) {
    const rankableOnly = !opts || opts.rankableOnly !== false;
    const offers = card.offers || [];
    const matched = offers.filter((o) => offerMatches(cat, o));
    // Never invent a match from card name alone for strict / merchant categories
    const pool = matched.length ? matched : cardMatchesFallback(cat, card) ? offers : [];
    if (!pool.length) return null;

    const usable = rankableOnly ? pool.filter(isRankableOffer) : pool;
    if (!usable.length) {
      const soft = pool
        .filter((o) => o && o.rateValue != null && Number(o.rateValue) > 0)
        .sort((a, b) => (b.rateValue || 0) - (a.rateValue || 0))[0];
      return soft ? { offer: soft, rankable: false } : null;
    }

    const offer = usable.slice().sort((a, b) => (b.rateValue || 0) - (a.rateValue || 0))[0];
    return { offer, rankable: true };
  }

  function searchOneCategory(cat, cardList, opts) {
    if (!cat) return { category: null, results: [], unclear: [] };

    const onlyMine = opts && opts.onlyMine;
    const mine = new Set((opts && opts.myCardIds) || []);
    let list = cardList || [];
    if (onlyMine) list = list.filter((c) => mine.has(c.id));

    const results = [];
    const unclear = [];
    for (const card of list) {
      const hit = bestOfferFor(cat, card);
      if (!hit) continue;
      const row = {
        card,
        offer: hit.offer,
        score: Number(hit.offer.rateValue) || 0,
        isMine: mine.has(card.id),
        matchedLabels: [cat.label],
        rankable: hit.rankable,
      };
      if (hit.rankable) results.push(row);
      else unclear.push(row);
    }

    results.sort((a, b) => b.score - a.score || a.card.shortName.localeCompare(b.card.shortName));
    unclear.sort((a, b) => a.card.shortName.localeCompare(b.card.shortName));
    return { category: cat, results, unclear };
  }

  function mergeSearchParts(parts, cardList, opts) {
    const byId = new Map();
    const unclearById = new Map();
    const labels = [];
    for (const q of parts) {
      const cat = resolveCategory(q);
      const { category, results, unclear } = searchOneCategory(cat, cardList, opts);
      if (category && category.label) labels.push(category.label);
      for (const r of results) {
        const prev = byId.get(r.card.id);
        if (!prev || r.score > prev.score) {
          byId.set(r.card.id, {
            ...r,
            matchedLabels: Array.from(
              new Set([...(prev && prev.matchedLabels ? prev.matchedLabels : []), ...(r.matchedLabels || [])])
            ),
          });
        } else if (prev) {
          prev.matchedLabels = Array.from(
            new Set([...(prev.matchedLabels || []), ...(r.matchedLabels || [])])
          );
        }
        unclearById.delete(r.card.id);
      }
      for (const r of unclear || []) {
        if (byId.has(r.card.id)) continue;
        if (!unclearById.has(r.card.id)) unclearById.set(r.card.id, r);
      }
    }

    const results = Array.from(byId.values()).sort(
      (a, b) => b.score - a.score || a.card.shortName.localeCompare(b.card.shortName)
    );
    const unclear = Array.from(unclearById.values()).sort((a, b) =>
      a.card.shortName.localeCompare(b.card.shortName)
    );
    const uniqLabels = Array.from(new Set(labels));
    return {
      category: { id: "_multi", label: uniqLabels.join(" · "), multi: true, labels: uniqLabels },
      results,
      unclear,
    };
  }

  function search(query, cardList, opts) {
    const raw = String(query || "").trim();
    if (!raw) return { category: null, results: [], unclear: [] };

    // 1) Strong path: any offer that literally names this merchant/brand (title, hint, or merchants[])
    const direct = searchDirectMerchant(raw, cardList, opts);
    if (direct.hits > 0) {
      return {
        category: {
          id: "_merchant",
          label: `Cards with offers on “${raw}”`,
          tip: `Matched from offer text / partner lists that mention “${raw}”. We don’t invent benefits for other stores.`,
          routed: false,
          direct: true,
        },
        results: direct.results,
        unclear: direct.unclear,
      };
    }

    // 2) Nothing in the catalog lists this name → related checkouts only
    const expanded = expandQuery(raw);
    if (!expanded) return { category: null, results: [], unclear: [] };

    if (expanded.queries.length > 1) {
      const packed = mergeSearchParts(expanded.queries, cardList, opts);
      const primaryCat = resolveCategory(expanded.queries[0]);
      const primaryLabel = primaryCat && primaryCat.label;
      if (primaryLabel) {
        packed.results.forEach((r) => {
          if ((r.matchedLabels || []).includes(primaryLabel)) {
            r.score = Number(r.score) + 100;
            r.primaryMatch = true;
          }
        });
        packed.results.sort(
          (a, b) => b.score - a.score || a.card.shortName.localeCompare(b.card.shortName)
        );
      }
      const tip = expanded.tip
        ? expanded.tip
        : `No card in our catalog currently lists “${raw}” by name. Showing the closest related checkouts.`;
      packed.category = {
        id: expanded.routeId || "_routed",
        label: expanded.label,
        multi: true,
        labels: expanded.queries,
        tip,
        routed: true,
      };
      packed.results = packed.results.map((r) => ({
        ...r,
        routeTip: tip,
      }));
      return packed;
    }

    const cat = expanded.category || resolveCategory(expanded.queries[0]);
    const packed = searchOneCategory(cat, cardList, opts);
    if (!packed.results.length && !packed.unclear.length) {
      packed.category = {
        ...(packed.category || cat || {}),
        tip: `No offer in our catalog mentions “${raw}” yet. Try a related chip, or report the bank page that lists it.`,
      };
    }
    return packed;
  }

  function searchMany(queries, cardList, opts) {
    const parts = (queries || []).map((q) => String(q || "").trim()).filter(Boolean);
    if (!parts.length) return { category: null, results: [], unclear: [] };
    if (parts.length === 1) return search(parts[0], cardList, opts);

    const flat = [];
    const tips = [];
    const labels = [];
    for (const q of parts) {
      const ex = expandQuery(q);
      if (!ex) continue;
      labels.push(ex.label);
      if (ex.tip) tips.push(ex.tip);
      for (const part of ex.queries) flat.push(part);
    }
    const uniq = Array.from(new Set(flat));
    const packed = mergeSearchParts(uniq, cardList, opts);
    packed.category = {
      id: "_multi",
      label: Array.from(new Set(labels)).join(" · "),
      multi: true,
      labels: Array.from(new Set(labels)),
      tip: tips[0] || null,
      routed: tips.length > 0,
    };
    return packed;
  }

  window.CardWiseCategories = {
    list: CATEGORIES,
    search,
    searchMany,
    resolveCategory,
    expandQuery,
    searchDirectMerchant,
    isRankableOffer,
  };
})();
