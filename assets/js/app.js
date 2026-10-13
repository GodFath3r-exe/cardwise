(async function () {
  const offersGrid = document.getElementById("offers-grid");
  const rankList = document.getElementById("rank-list");
  const myGrid = document.getElementById("my-cards-grid");
  const myEmpty = document.getElementById("my-cards-empty");
  const filterCount = document.getElementById("filter-count");
  const catalogBlock = document.getElementById("catalog-block");
  const rankBlock = document.getElementById("rank-block");
  const searchInput = document.getElementById("cat-search");
  const searchForm = document.getElementById("cat-search-form");
  const onlyMineEl = document.getElementById("only-mine");
  const chipRow = document.getElementById("cat-chips");
  const chipMore = document.getElementById("cat-chips-more");
  const verifyStrip = document.getElementById("verify-strip");
  const mySearchInput = document.getElementById("my-cat-search");
  const mySearchForm = document.getElementById("my-cat-search-form");
  const myChipRow = document.getElementById("my-cat-chips");
  const myChipMore = document.getElementById("my-cat-chips-more");
  const myFilterCount = document.getElementById("my-filter-count");
  const myVerifyStrip = document.getElementById("my-verify-strip");
  const myRankBlock = document.getElementById("my-rank-block");
  const myRankList = document.getElementById("my-rank-list");
  const myWalletHeading = document.getElementById("my-wallet-heading");
  const tabButtons = document.querySelectorAll("[data-tab]");
  const panels = document.querySelectorAll("[data-panel]");
  let activeQuery = "";
  let myActiveQuery = "";
  let currentTab = "offers";
  const selectedExplore = new Set();
  const selectedMy = new Set();

  const PRIMARY_CHIPS = ["Swiggy", "Amazon", "Flipkart", "Petrol", "Electronics"];
  const MORE_CHIPS = ["Zomato", "Fashion", "Movies", "Grocery", "Zepto", "Bills", "Travel", "IRCTC", "Nykaa"];
  const clearBtn = document.getElementById("clear-search");
  const myClearBtn = document.getElementById("my-clear-search");

  if (!offersGrid) return;

  function hasExploreQuery() {
    return Boolean((searchInput && searchInput.value.trim()) || selectedExplore.size);
  }

  function hasMyQuery() {
    return Boolean((mySearchInput && mySearchInput.value.trim()) || selectedMy.size);
  }

  function syncClearButtons() {
    if (clearBtn) clearBtn.hidden = !hasExploreQuery();
    if (myClearBtn) myClearBtn.hidden = !hasMyQuery();
  }

  function paintChipSelection(rows, selected) {
    (rows || []).forEach((row) => {
      if (!row) return;
      row.querySelectorAll("[data-cat]").forEach((btn) => {
        const on = selected.has(btn.getAttribute("data-cat"));
        btn.classList.toggle("is-selected", on);
        btn.setAttribute("aria-pressed", String(on));
      });
    });
  }

  function syncExploreChips() {
    paintChipSelection([chipRow, chipMore], selectedExplore);
  }

  function syncMyChips() {
    paintChipSelection([myChipRow, myChipMore], selectedMy);
  }

  function queriesFromSelection(selected, inputEl) {
    if (selected.size) return Array.from(selected);
    const typed = inputEl && inputEl.value.trim();
    return typed ? [typed] : [];
  }

  function labelFromQueries(queries, category) {
    if (category && category.label) return category.label;
    return queries.join(" · ");
  }

  const S = window.CardWiseSafe || {
    escapeHtml: (s) => String(s ?? ""),
    escapeAttr: (s) => String(s ?? ""),
    safeCssColor: (s) => s,
    safeCssBackground: (s) => s,
    safeHttpUrl: (s) => s,
  };
  const escapeHtml = S.escapeHtml.bind(S);

  if (window.CardWiseData) {
    await window.CardWiseData.load();
  }
  if (window.CardWiseAuth) {
    await window.CardWiseAuth.ready;
  }

  function cards() {
    return window.CARDWISE_CARDS || [];
  }

  function isLoggedIn() {
    return Boolean(window.CardWiseAuth && window.CardWiseAuth.isLoggedIn());
  }

  function verifiedLabel() {
    const meta = window.CARDWISE_META || {};
    return meta.lastVerifiedLabel || meta.lastVerified || "recently";
  }

  function showVerifyStrip(el, visible) {
    if (!el) return;
    if (!visible) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.innerHTML = `Last updated: <strong>${escapeHtml(verifiedLabel())}</strong> · always confirm on the bank’s page before you spend.`;
  }

  function normQ(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findCatalogCard(query) {
    const q = normQ(query);
    if (!q || q.length < 2) return null;
    return (
      cards().find((c) => {
        const names = [c.id, c.shortName, c.name, c.bank].map(normQ);
        return names.some((n) => n === q || n.includes(q) || q.includes(n));
      }) || null
    );
  }

  /** True when the query is naming a card product, not just a merchant/category chip. */
  function isStrongCardNameQuery(query, card) {
    if (!card) return false;
    const q = normQ(query);
    const short = normQ(card.shortName);
    const name = normQ(card.name);
    const idWords = normQ(String(card.id || "").replace(/-/g, " "));
    if (!q || q.length < 3) return false;
    if (q === short || q === name || q === idWords) return true;
    const chipish = new Set(
      [...PRIMARY_CHIPS, ...MORE_CHIPS].map((s) => normQ(s))
    );
    if (chipish.has(q)) return false;
    if (q.split(" ").length >= 2 && (short.includes(q) || name.includes(q) || q.includes(short))) {
      return true;
    }
    // Distinctive single token (e.g. "millennia", "octane") — not a short merchant word
    if (q.length >= 5 && (short.includes(q) || name.includes(q))) return true;
    return false;
  }

  function cardNameSearchHit(query) {
    const card = findCatalogCard(query);
    if (!isStrongCardNameQuery(query, card)) return null;
    const offer =
      (card.offers || []).find((o) => o && o.tier === "high" && o.rateValue != null) ||
      (card.offers || []).find((o) => o && o.rateValue != null) ||
      (card.offers || [])[0];
    if (!offer) return null;
    return {
      card,
      offer,
      score: 1e6,
      isMine: myIds().includes(card.id),
      matchedLabels: ["Card name"],
    };
  }

  function myIds() {
    return window.CardWiseWallet ? window.CardWiseWallet.list() : [];
  }

  function cardHref(id) {
    return `cards/view.html?id=${encodeURIComponent(id)}`;
  }

  function cardTile(card, opts) {
    const removable = opts && opts.removable;
    const accent = S.safeCssColor(card.accent);
    const gradient = S.safeCssBackground(card.gradient);
    const status =
      card.reviewStatus === "verified" || card.reviewStatus === "auto"
        ? `Auto-extracted${card.reviewChecked ? " · " + card.reviewChecked : ""}`
        : "Needs review";
    return `
      <article class="card-tile" style="--tile-accent:${escapeHtml(accent)}">
        <a class="card-tile-link" href="${cardHref(card.id)}">
          <div class="card-mini" style="background:${escapeHtml(gradient)}" aria-hidden="true">
            <div class="chip"></div>
            <div>
              <div class="label">${escapeHtml(card.bank)}</div>
              <div class="title">${escapeHtml(card.shortName)}</div>
            </div>
            <div class="network">${escapeHtml(card.network)}</div>
          </div>
          <div class="card-tile-body">
            <h3>${escapeHtml(card.shortName)}</h3>
            <p>${escapeHtml(card.tagline)}</p>
            <div class="card-tile-meta">
              <span>${escapeHtml(card.bestFor)}</span>
              <span>${escapeHtml(status)}</span>
            </div>
          </div>
        </a>
        ${
          removable
            ? `<button type="button" class="btn-remove" data-remove="${escapeHtml(card.id)}">Remove</button>`
            : ""
        }
      </article>
    `;
  }

  function primarySource(card) {
    const s = (card.sources || [])[0];
    return s && s.url ? s : null;
  }

  function reportHref(card) {
    const subject = encodeURIComponent(`CardWise correction: ${card.shortName}`);
    const body = encodeURIComponent(
      `Card: ${card.name} (${card.id})\nWhat looks wrong:\n\nOfficial source I checked:\n`
    );
    return `mailto:hello.cardwise@gmail.com?subject=${subject}&body=${body}`;
  }

  function getSpend(which) {
    const id = which === "my" ? "my-spend-amount" : "spend-amount";
    const el = document.getElementById(id);
    const n = Math.max(0, Number(el && el.value) || 0);
    return n;
  }

  function moneyInr(n) {
    return "₹" + Math.round(n).toLocaleString("en-IN");
  }

  /** Approximate ₹ back for this spend, after monthly/statement caps when known. */
  function estimateRupees(offer, spend) {
    if (!offer || offer.rateValue == null || !spend) return null;
    const rv = Number(offer.rateValue);
    if (!Number.isFinite(rv) || rv <= 0) return null;
    const raw = (spend * rv) / 100;
    const cap = offer.capAmount != null ? Number(offer.capAmount) : null;
    if (cap != null && Number.isFinite(cap)) {
      return { value: Math.min(raw, cap), raw, capped: raw > cap, spend };
    }
    return { value: raw, raw, capped: false, spend };
  }

  function rankRow(item, index, spend) {
    const { card, offer, isMine } = item;
    const src = primarySource(card);
    const checked = card.reviewChecked ? ` · verified ${card.reviewChecked}` : "";
    const est = estimateRupees(offer, spend);
    const why = [
      `Why #${index + 1}: ${offer.rate || "—"} on ${offer.title || "offer"}`,
      offer.capLabel ? `Cap: ${offer.capLabel}` : "Cap: see card",
      `Fee: ${card.annualFee || "see card"}`,
      card.waiver && card.waiver !== "Lifetime free" ? `Waiver: ${card.waiver}` : null,
      card.earnLabel ? `Earn: ${card.earnLabel}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const hint = offer.hint ? escapeHtml(offer.hint) : "";
    const estLine = est
      ? `${moneyInr(est.spend)} × ${offer.rateValue}% = ${moneyInr(est.raw)}${
          est.capped ? ` → capped ${moneyInr(est.value)}` : ""
        }`
      : "";

    const accent = S.safeCssColor(card.accent);
    const gradient = S.safeCssBackground(card.gradient);
    const srcUrl = src ? S.safeHttpUrl(src.url) : "";
    const heroClass = index === 0 ? " rank-card-hero" : "";
    return `
      <article class="rank-card${heroClass}" style="--tile-accent:${escapeHtml(accent)}">
        <a class="rank-card-main" href="${cardHref(card.id)}">
          <span class="rank-num">${index + 1}</span>
          <div class="rank-mini" style="background:${escapeHtml(gradient)}" aria-hidden="true">
            <span>${escapeHtml(card.shortName)}</span>
          </div>
          <div class="rank-body">
            <div class="rank-title-row">
              <h3>${escapeHtml(card.shortName)}</h3>
              ${isMine ? `<span class="mine-pill">My card</span>` : ""}
              ${index === 0 ? `<span class="best-pill">Best match</span>` : ""}
            </div>
            <p class="rank-match">${escapeHtml(offer.title)}${
              item.matchedLabels && item.matchedLabels.length
                ? ` · via ${escapeHtml(item.matchedLabels.slice(0, 2).join(", "))}`
                : ""
            }</p>
            <p class="rank-bank">${escapeHtml(card.bank)}${escapeHtml(checked)}</p>
            ${
              est
                ? `<p class="rank-earn">≈ <strong>${escapeHtml(moneyInr(est.value))}</strong> back${
                    est.capped ? " (cap hit)" : ""
                  }</p>
                   <p class="rank-earn-math">${escapeHtml(estLine)}</p>`
                : ""
            }
            <p class="rank-why">${escapeHtml(why)}</p>
            ${hint ? `<p class="rank-hint">${hint}</p>` : ""}
          </div>
          <div class="rank-score">
            <span class="rank-rate">${escapeHtml(offer.rate)}</span>
            <span class="rank-cap">${escapeHtml(offer.capLabel || "—")}</span>
          </div>
        </a>
        <div class="rank-links">
          ${
            srcUrl
              ? `<a class="rank-link" href="${escapeHtml(srcUrl)}" target="_blank" rel="noopener noreferrer">Official terms</a>`
              : ""
          }
          <a class="rank-link" href="${reportHref(card)}">Report wrong info</a>
        </div>
      </article>
    `;
  }

  function routeTipHtml(category) {
    if (!category || !category.tip) return "";
    return `<p class="route-tip" role="note">${escapeHtml(category.tip)}</p>`;
  }

  function unclearBlockHtml(unclear) {
    if (!unclear || !unclear.length) return "";
    const rows = unclear
      .map((item) => {
        const { card, offer } = item;
        return `
          <a class="unclear-row" href="${cardHref(card.id)}">
            <span class="unclear-name">${escapeHtml(card.shortName)}</span>
            <span class="unclear-reason">Matches “${escapeHtml(offer.title)}” but rate/cap not verified enough to rank (${escapeHtml(offer.rate || "—")} · ${escapeHtml(offer.capLabel || "no cap")})</span>
          </a>`;
      })
      .join("");
    return `
      <div class="unclear-block">
        <p class="unclear-heading">Details unclear — not ranked</p>
        <p class="unclear-sub muted">We won’t guess. Open the card or bank page to confirm.</p>
        <div class="unclear-list">${rows}</div>
      </div>`;
  }

  function renderRankList(listEl, results, unclear, category, spendWhich) {
    const spend = getSpend(spendWhich);
    const ranked = (results || []).map((r, i) => rankRow(r, i, spend)).join("");
    listEl.innerHTML = routeTipHtml(category) + ranked + unclearBlockHtml(unclear);
  }

  function logEmptySearch(query, context) {
    try {
      const key = "cardwise_empty_searches";
      const prev = JSON.parse(localStorage.getItem(key) || "[]");
      prev.push({ q: query, context, at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(prev.slice(-100)));
    } catch {
      /* ignore */
    }
  }

  function chipHtml(labels, extraClass) {
    return labels
      .map(
        (label) =>
          `<button type="button" class="cat-chip ${extraClass || ""}" data-cat="${label}" aria-pressed="false">${label}</button>`
      )
      .join("");
  }

  function renderChips() {
    if (chipRow) chipRow.innerHTML = chipHtml(PRIMARY_CHIPS, "cat-chip-primary");
    if (chipMore) chipMore.innerHTML = chipHtml(MORE_CHIPS, "cat-chip-more");
    if (myChipRow) myChipRow.innerHTML = chipHtml(PRIMARY_CHIPS, "cat-chip-primary");
    if (myChipMore) myChipMore.innerHTML = chipHtml(MORE_CHIPS, "cat-chip-more");
    syncExploreChips();
    syncMyChips();
  }

  function bindChipToggle(row, selected, onChange) {
    if (!row) return;
    row.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      const cat = btn.getAttribute("data-cat");
      if (selected.has(cat)) selected.delete(cat);
      else selected.add(cat);
      onChange();
    });
  }

  function renderCatalog() {
    if (!catalogBlock || !offersGrid) return;
    catalogBlock.hidden = false;
    if (rankBlock) rankBlock.hidden = true;
    showVerifyStrip(verifyStrip, false);

    const list = cards();
    offersGrid.innerHTML = list.map((c) => cardTile(c)).join("");

    if (filterCount) {
      filterCount.textContent = `${list.length} top / most-used cards in India — tap for details · verified ${verifiedLabel()}`;
    }
    syncClearButtons();
  }

  function catalogRecsFor(query, limit) {
    if (!window.CardWiseCategories) return [];
    const mine = new Set(myIds());
    const { results } = window.CardWiseCategories.search(query, cards(), {
      onlyMine: false,
      myCardIds: [],
    });
    return results.filter((r) => !mine.has(r.card.id)).slice(0, limit || 5);
  }

  function recommendBlockHtml(label, recs) {
    if (!recs.length) return "";
    const safeLabel = escapeHtml(label);
    const spend = getSpend("my");
    return `
      <div class="rec-block">
        <p class="rec-heading">Top picks for “${safeLabel}” (not in your wallet)</p>
        <p class="rec-sub muted">You can use these cards instead — tap to view &amp; add.</p>
        <div class="rank-list rec-list">
          ${recs.map((r, i) => rankRow({ ...r, isMine: false }, i, spend)).join("")}
        </div>
      </div>`;
  }

  function emptyStateHtml(query, label, opts) {
    const mineOnly = opts && opts.mineOnly;
    const recs = (opts && opts.recs) || [];
    const known = findCatalogCard(query);
    const safeLabel = escapeHtml(label);
    const suggestions = PRIMARY_CHIPS.map(
      (s) =>
        `<button type="button" class="cat-chip cat-chip-primary" data-cat="${escapeHtml(s)}">${escapeHtml(s)}</button>`
    ).join("");

    if (mineOnly && !myIds().length) {
      return `
        <div class="empty-state">
          <p>Add cards to your wallet first.</p>
          <p class="muted">Meanwhile, here are strong options for “${safeLabel}”.</p>
        </div>
        ${recommendBlockHtml(label, recs.length ? recs : catalogRecsFor(query))}
        <p class="empty-actions" style="margin-top:1rem">
          <button type="button" class="btn btn-ghost" data-go-explore>Explore all cards</button>
        </p>`;
    }

    if (mineOnly) {
      return `
        <div class="empty-state">
          <p>None of your cards have a strong match for “${safeLabel}”.</p>
          <p class="muted">Consider these recommended cards, or explore the full catalog.</p>
        </div>
        ${recommendBlockHtml(label, recs)}
        <p class="empty-actions">
          <button type="button" class="btn btn-ghost" data-go-explore>Explore cards</button>
        </p>`;
    }

    if (known) {
      return `
        <div class="empty-state">
          <p>We have <strong>${escapeHtml(known.shortName)}</strong>, but no strong offer match for “${safeLabel}”.</p>
          <p class="muted">Open the card for fees &amp; offers, or try these categories:</p>
          <div class="cat-chips empty-chips" role="group" aria-label="Try these categories">${suggestions}</div>
          <p class="empty-actions">
            <a class="btn btn-primary" href="${cardHref(known.id)}">View ${escapeHtml(known.shortName)}</a>
            <button type="button" class="btn btn-ghost" id="empty-clear">Browse all cards</button>
          </p>
        </div>`;
    }

    return `
      <div class="empty-state">
        <p>No match for “${safeLabel}” — try these categories</p>
        <p class="muted">Or clear search to browse all ${cards().length} cards.</p>
        <div class="cat-chips empty-chips" role="group" aria-label="Try these categories">${suggestions}</div>
        <p class="empty-actions">
          <button type="button" class="btn btn-ghost" id="empty-clear">Browse all cards</button>
        </p>
      </div>`;
  }

  function wireEmptyActions(root, onChip, onClear) {
    if (!root) return;
    const clearEmpty = root.querySelector("#empty-clear");
    if (clearEmpty && onClear) clearEmpty.addEventListener("click", onClear);
    const goExplore = root.querySelector("[data-go-explore]");
    if (goExplore) goExplore.addEventListener("click", () => setTab("offers"));
    const emptyChips = root.querySelector(".empty-chips");
    if (emptyChips && onChip) {
      emptyChips.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-cat]");
        if (!btn) return;
        onChip(btn.getAttribute("data-cat"));
      });
    }
  }

  function clearExploreSearch() {
    selectedExplore.clear();
    syncExploreChips();
    if (searchInput) searchInput.value = "";
    activeQuery = "";
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    history.replaceState(null, "", url);
    renderCatalog();
  }

  function runSearch(query) {
    const fromArg = (query || "").trim();
    if (fromArg && !selectedExplore.size && searchInput) {
      searchInput.value = fromArg;
    }

    const queries = selectedExplore.size
      ? Array.from(selectedExplore)
      : queriesFromSelection(selectedExplore, searchInput);

    if (!queries.length) {
      renderCatalog();
      return;
    }

    if (!window.CardWiseCategories || !rankList || !rankBlock) {
      renderCatalog();
      return;
    }

    activeQuery = queries.join(" · ");
    if (searchInput && selectedExplore.size) {
      searchInput.value = activeQuery;
    }

    const searchFn = window.CardWiseCategories.searchMany || window.CardWiseCategories.search;
    const packed =
      searchFn === window.CardWiseCategories.searchMany
        ? window.CardWiseCategories.searchMany(queries, cards(), {
            onlyMine: onlyMineEl && onlyMineEl.checked,
            myCardIds: myIds(),
          })
        : window.CardWiseCategories.search(queries[0], cards(), {
            onlyMine: onlyMineEl && onlyMineEl.checked,
            myCardIds: myIds(),
          });
    let { category, results } = packed;
    const unclear = packed.unclear || [];

    const nameHit =
      queries.length === 1 && !(onlyMineEl && onlyMineEl.checked)
        ? cardNameSearchHit(queries[0])
        : null;
    if (nameHit) {
      const rest = (results || []).filter((r) => r.card && r.card.id !== nameHit.card.id);
      results = [nameHit, ...rest];
      if (!category) {
        category = { id: "_card", label: nameHit.card.shortName };
      }
    }

    catalogBlock.hidden = true;
    rankBlock.hidden = false;
    showVerifyStrip(verifyStrip, true);
    syncExploreChips();
    syncClearButtons();

    const label = labelFromQueries(queries, category);
    if (filterCount) {
      const unclearNote = unclear.length ? ` · ${unclear.length} not ranked (unclear data)` : "";
      filterCount.textContent = results.length
        ? `${results.length} verified matches for “${label}”${unclearNote} · Last updated: ${verifiedLabel()}`
        : unclear.length
          ? `No verified match for “${label}” · ${unclear.length} cards need clearer data`
          : `No match for “${label}” — try a category below`;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("q", activeQuery);
    history.replaceState(null, "", url);

    if (!results.length && !unclear.length) {
      logEmptySearch(activeQuery, "explore");
      rankList.innerHTML = emptyStateHtml(activeQuery, label);
      wireEmptyActions(
        rankList,
        (cat) => {
          selectedExplore.clear();
          selectedExplore.add(cat);
          runSearch();
        },
        () => clearExploreSearch()
      );
      return;
    }

    if (!results.length) logEmptySearch(activeQuery, "explore");
    renderRankList(rankList, results, unclear, category, "explore");
  }

  function clearMySearch() {
    selectedMy.clear();
    syncMyChips();
    myActiveQuery = "";
    if (mySearchInput) mySearchInput.value = "";
    if (myRankBlock) myRankBlock.hidden = true;
    if (myRankList) myRankList.innerHTML = "";
    showVerifyStrip(myVerifyStrip, false);
    if (myFilterCount) myFilterCount.textContent = "";
    if (myWalletHeading) myWalletHeading.textContent = "Your wallet";
    const url = new URL(window.location.href);
    url.searchParams.delete("mq");
    history.replaceState(null, "", url);
    syncClearButtons();
  }

  function runMySearch(query) {
    const fromArg = (query || "").trim();
    if (fromArg && !selectedMy.size && mySearchInput) {
      mySearchInput.value = fromArg;
    }

    const queries = selectedMy.size
      ? Array.from(selectedMy)
      : queriesFromSelection(selectedMy, mySearchInput);

    if (!queries.length) {
      clearMySearch();
      return;
    }

    if (!window.CardWiseCategories || !myRankList || !myRankBlock) return;

    myActiveQuery = queries.join(" · ");
    if (mySearchInput && selectedMy.size) {
      mySearchInput.value = myActiveQuery;
    }

    const searchFn = window.CardWiseCategories.searchMany || window.CardWiseCategories.search;
    const packed =
      searchFn === window.CardWiseCategories.searchMany
        ? window.CardWiseCategories.searchMany(queries, cards(), {
            onlyMine: true,
            myCardIds: myIds(),
          })
        : window.CardWiseCategories.search(queries[0], cards(), {
            onlyMine: true,
            myCardIds: myIds(),
          });
    const { category, results } = packed;
    const unclear = packed.unclear || [];
    const recs = catalogRecsFor(queries[0], 5);

    myRankBlock.hidden = false;
    showVerifyStrip(myVerifyStrip, true);
    if (myWalletHeading) myWalletHeading.textContent = "Your wallet";
    syncMyChips();
    syncClearButtons();

    const label = labelFromQueries(queries, category);
    if (myFilterCount) {
      const unclearNote = unclear.length ? ` · ${unclear.length} unclear` : "";
      myFilterCount.textContent = results.length
        ? `${results.length} of your cards for “${label}” (verified rates)${unclearNote} · Last updated: ${verifiedLabel()}`
        : `No verified match in your wallet for “${label}” · showing catalog picks below`;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("mq", myActiveQuery);
    history.replaceState(null, "", url);

    if (!results.length && !unclear.length) {
      logEmptySearch(myActiveQuery, "my-cards");
      myRankList.innerHTML = emptyStateHtml(myActiveQuery, label, { mineOnly: true, recs });
      wireEmptyActions(myRankList, (cat) => {
        selectedMy.clear();
        selectedMy.add(cat);
        runMySearch();
      });
      return;
    }

    const spend = getSpend("my");
    const also = recs.slice(0, 3);
    const alsoHtml = also.length
      ? `<div class="rec-block rec-block-soft">
            <p class="rec-heading">Also strong for “${escapeHtml(label)}”</p>
            <div class="rank-list rec-list">${also.map((r, i) => rankRow({ ...r, isMine: false }, i, spend)).join("")}</div>
          </div>`
      : "";
    myRankList.innerHTML =
      routeTipHtml(category) +
      (results || []).map((r, i) => rankRow(r, i, spend)).join("") +
      unclearBlockHtml(unclear) +
      alsoHtml;
  }

  function renderMyCards() {
    const loginGate = document.getElementById("my-cards-login-gate");
    const loggedInBlock = document.getElementById("my-cards-logged-in");
    const intro = document.getElementById("my-cards-intro");
    const loggedIn = isLoggedIn();

    if (loginGate) loginGate.hidden = loggedIn;
    if (loggedInBlock) loggedInBlock.hidden = !loggedIn;
    if (intro) intro.hidden = !loggedIn;

    if (!loggedIn) {
      if (myGrid) myGrid.innerHTML = "";
      clearMySearch();
      return;
    }

    if (!myGrid || !myEmpty || !window.CardWiseWallet) return;

    const ids = window.CardWiseWallet.list();
    const mine = ids.map((id) => window.CARDWISE_byId(id)).filter(Boolean);

    if (!mine.length) {
      myGrid.innerHTML = "";
      myEmpty.hidden = false;
      if (myActiveQuery || selectedMy.size) runMySearch();
      syncClearButtons();
      return;
    }

    myEmpty.hidden = true;
    myGrid.innerHTML = mine.map((c) => cardTile(c, { removable: true })).join("");
    if (myActiveQuery || selectedMy.size) runMySearch();
    syncClearButtons();
  }

  function defaultTabForAuth() {
    return isLoggedIn() ? "my-cards" : "offers";
  }

  /** Guest: Explore → My Cards. Logged in: My Cards → Explore. */
  function reorderTabsForAuth() {
    const nav = document.getElementById("main-tabs");
    const explore = document.getElementById("tab-offers");
    const mine = document.getElementById("tab-my-cards");
    if (!nav || !explore || !mine) return;
    if (isLoggedIn()) {
      nav.insertBefore(mine, explore);
    } else {
      nav.insertBefore(explore, mine);
    }
  }

  function setTab(name) {
    currentTab = name;
    reorderTabsForAuth();
    tabButtons.forEach((btn) => {
      const on = btn.getAttribute("data-tab") === name;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", String(on));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.getAttribute("data-panel") !== name;
    });
    if (name === "my-cards") renderMyCards();

    const url = new URL(window.location.href);
    const def = defaultTabForAuth();
    if (name === def) url.searchParams.delete("tab");
    else url.searchParams.set("tab", name);
    history.replaceState(null, "", url);
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.getAttribute("data-tab")));
  });

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!selectedExplore.size) {
        // free-text submit; chips stay off
      }
      runSearch(searchInput.value);
    });
    searchInput.addEventListener("input", () => {
      if (selectedExplore.size) {
        selectedExplore.clear();
        syncExploreChips();
      }
      syncClearButtons();
      if (!searchInput.value.trim()) {
        activeQuery = "";
        const url = new URL(window.location.href);
        url.searchParams.delete("q");
        history.replaceState(null, "", url);
        renderCatalog();
      }
    });
  }

  if (mySearchForm && mySearchInput) {
    mySearchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      runMySearch(mySearchInput.value);
    });
    mySearchInput.addEventListener("input", () => {
      if (selectedMy.size) {
        selectedMy.clear();
        syncMyChips();
      }
      syncClearButtons();
      if (!mySearchInput.value.trim()) clearMySearch();
    });
  }

  if (onlyMineEl) {
    onlyMineEl.addEventListener("change", () => {
      if (activeQuery || selectedExplore.size) runSearch();
    });
  }

  const spendAmountEl = document.getElementById("spend-amount");
  if (spendAmountEl) {
    spendAmountEl.addEventListener("input", () => {
      if (activeQuery || selectedExplore.size) runSearch();
    });
  }
  const mySpendAmountEl = document.getElementById("my-spend-amount");
  if (mySpendAmountEl) {
    mySpendAmountEl.addEventListener("input", () => {
      if (myActiveQuery || selectedMy.size) runMySearch();
    });
  }

  bindChipToggle(chipRow, selectedExplore, () => {
    syncExploreChips();
    if (selectedExplore.size) runSearch();
    else clearExploreSearch();
  });
  bindChipToggle(chipMore, selectedExplore, () => {
    syncExploreChips();
    if (selectedExplore.size) runSearch();
    else clearExploreSearch();
  });
  bindChipToggle(myChipRow, selectedMy, () => {
    syncMyChips();
    if (selectedMy.size) runMySearch();
    else clearMySearch();
  });
  bindChipToggle(myChipMore, selectedMy, () => {
    syncMyChips();
    if (selectedMy.size) runMySearch();
    else clearMySearch();
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => clearExploreSearch());
  }
  if (myClearBtn) {
    myClearBtn.addEventListener("click", () => clearMySearch());
  }

  const myLoginBtn = document.getElementById("my-cards-login-btn");
  if (myLoginBtn) {
    myLoginBtn.addEventListener("click", async () => {
      if (!window.CardWiseAuth) return;
      myLoginBtn.disabled = true;
      myLoginBtn.textContent = "Opening Google…";
      try {
        await window.CardWiseAuth.signInWithGoogle();
      } catch (err) {
        console.error(err);
        myLoginBtn.disabled = false;
        myLoginBtn.textContent = "Sign in with Google";
        alert("Sign-in failed: " + (err.message || err));
      }
    });
  }

  if (myGrid) {
    myGrid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove]");
      if (!btn) return;
      e.preventDefault();
      window.CardWiseWallet.remove(btn.getAttribute("data-remove"));
      renderMyCards();
      if (activeQuery) runSearch(activeQuery);
    });
  }

  window.addEventListener("cardwise:mycards", () => {
    renderMyCards();
    if (activeQuery) runSearch(activeQuery);
  });

  window.addEventListener("cardwise:auth", () => {
    renderMyCards();
    if (activeQuery) runSearch(activeQuery);
    // Login → My Cards first; logout → Explore first (order + default)
    const params = new URLSearchParams(window.location.search);
    if (!params.get("tab")) setTab(defaultTabForAuth());
    else {
      reorderTabsForAuth();
    }
  });

  const banner = document.getElementById("verify-banner");
  if (banner) {
    banner.hidden = false;
    const source = window.CARDWISE_DATA_SOURCE || "local";
    if (source === "supabase") {
      banner.innerHTML = `Loaded from <strong>Supabase</strong> · ${cards().length} cards · offers verified <strong>${escapeHtml(verifiedLabel())}</strong>.`;
    } else if (source === "local-fallback") {
      banner.innerHTML = `Using <strong>local backup</strong> (Supabase failed: ${escapeHtml(window.CARDWISE_LOAD_ERROR || "unknown")}) · verified <strong>${escapeHtml(verifiedLabel())}</strong>.`;
      banner.style.background = "#fff7ed";
      banner.style.borderColor = "#fdba74";
      banner.style.color = "#9a3412";
    } else {
      banner.innerHTML = `Using <strong>local data</strong> · ${cards().length} cards · verified <strong>${escapeHtml(verifiedLabel())}</strong>.`;
    }
  }

  renderChips();

  const params = new URLSearchParams(window.location.search);
  const startTab = params.get("tab") || defaultTabForAuth();
  setTab(startTab === "my-cards" ? "my-cards" : "offers");

  const q = params.get("q");
  if (q && searchInput) {
    searchInput.value = q;
    // Restore multi-select if URL looks like chip join
    q.split(" · ").map((s) => s.trim()).filter(Boolean).forEach((part) => {
      if (PRIMARY_CHIPS.includes(part) || MORE_CHIPS.includes(part)) selectedExplore.add(part);
    });
    syncExploreChips();
    runSearch(q);
  } else {
    renderCatalog();
  }

  const mq = params.get("mq");
  if (mq && mySearchInput) {
    mySearchInput.value = mq;
    mq.split(" · ").map((s) => s.trim()).filter(Boolean).forEach((part) => {
      if (PRIMARY_CHIPS.includes(part) || MORE_CHIPS.includes(part)) selectedMy.add(part);
    });
    syncMyChips();
    if (currentTab === "my-cards") runMySearch(mq);
    else myActiveQuery = mq;
  }

  syncClearButtons();
})();
