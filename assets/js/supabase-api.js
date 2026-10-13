(function () {
  function cfg() {
    return window.CARDWISE_SUPABASE || {};
  }

  function configured() {
    const c = cfg();
    return Boolean(c.url && c.anonKey && c.anonKey.length > 20);
  }

  function headers() {
    const { anonKey } = cfg();
    return {
      apikey: anonKey,
      Authorization: "Bearer " + anonKey,
      Accept: "application/json",
    };
  }

  function mapOffer(o) {
    return {
      title: o.title,
      rate: o.rate,
      rateValue: o.rate_value != null ? Number(o.rate_value) : null,
      capLabel: o.cap_label,
      capAmount: o.cap_amount != null ? Number(o.cap_amount) : null,
      capPeriod: o.cap_period,
      tier: o.tier || "base",
      hint: o.hint || undefined,
    };
  }

  function mapCard(row) {
    const offers = (row.card_offers || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(mapOffer);
    const sources = (row.card_sources || []).map((s) => ({
      label: s.label,
      url: s.url,
    }));
    return {
      id: row.id,
      name: row.name,
      shortName: row.short_name,
      bank: row.bank,
      network: row.network,
      tagline: row.tagline,
      bestFor: row.best_for,
      group: row.card_group || "popular",
      joiningFee: row.joining_fee,
      annualFee: row.annual_fee,
      waiver: row.waiver,
      feeHint: row.fee_hint,
      earnLabel: row.earn_label || "cashback",
      accent: row.accent,
      gradient: row.gradient,
      offers,
      sources,
    };
  }

  async function fetchCards() {
    const { url } = cfg();
    const endpoint =
      url.replace(/\/$/, "") +
      "/rest/v1/cards?select=*,card_offers(*),card_sources(*)&is_active=eq.true&order=short_name.asc";
    const res = await fetch(endpoint, { headers: headers() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error("Supabase " + res.status + ": " + text.slice(0, 180));
    }
    const rows = await res.json();
    return rows.map(mapCard);
  }

  /** Load catalog into window.CARDWISE_* — Supabase first, local JS fallback */
  window.CardWiseData = {
    configured,
    async load() {
      window.CARDWISE_META = window.CARDWISE_META || {
        lastVerifiedLabel: "from database",
        note: "Always confirm on the bank’s page before you apply or spend.",
      };

      // Local catalog is the latest curated set (top India cards).
      const localCards = window.CARDWISE_CARDS || [];

      if (configured()) {
        try {
          const remote = await fetchCards();
          if (!remote.length) throw new Error("No cards returned");
          // Prefer Supabase only when it has the latest catalog marker card.
          const remoteIsCurrent =
            remote.some((c) => c.id === "indianoil-axis") &&
            remote.some((c) => c.id === "hpcl-icici");
          if (remoteIsCurrent) {
            window.CARDWISE_CARDS = remote;
            window.CARDWISE_DATA_SOURCE = "supabase";
            // Keep curated verify date from local meta when present.
            if (localCards.length && window.CARDWISE_META) {
              /* lastVerifiedLabel already set from cards-data.js */
            }
            window.CARDWISE_META.note =
              (window.CARDWISE_META.note || "") + " · Loaded from Supabase.";
          } else {
            window.CARDWISE_CARDS = localCards;
            window.CARDWISE_DATA_SOURCE = "local";
            window.CARDWISE_LOAD_ERROR =
              "Supabase still has the old catalog — run db/seed.sql in the SQL Editor to sync.";
          }
        } catch (err) {
          console.warn("Supabase load failed, using local data:", err);
          window.CARDWISE_CARDS = localCards;
          window.CARDWISE_DATA_SOURCE = "local-fallback";
          window.CARDWISE_LOAD_ERROR = String(err.message || err);
        }
      } else {
        window.CARDWISE_DATA_SOURCE = "local";
      }

      if (!window.CARDWISE_CARDS) window.CARDWISE_CARDS = [];

      if (window.CardWiseReview) {
        window.CARDWISE_CARDS = window.CardWiseReview.apply(window.CARDWISE_CARDS);
      }

      window.CARDWISE_byId = function (id) {
        return (window.CARDWISE_CARDS || []).find((c) => c.id === id) || null;
      };

      return {
        source: window.CARDWISE_DATA_SOURCE,
        count: window.CARDWISE_CARDS.length,
        error: window.CARDWISE_LOAD_ERROR || null,
      };
    },
  };
})();
