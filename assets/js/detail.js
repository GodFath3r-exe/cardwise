(async function () {
  const root = document.getElementById("card-detail");
  if (!root) return;

  const S = window.CardWiseSafe || {
    escapeHtml: (s) => String(s ?? ""),
    safeCssBackground: (s) => s,
    safeHttpUrl: (s) => s,
  };
  const escapeHtml = S.escapeHtml.bind(S);

  root.innerHTML = `<div class="handy"><p class="handy-sub">Loading…</p></div>`;

  if (window.CardWiseAuth) {
    await window.CardWiseAuth.ready;
  }
  if (window.CardWiseData) {
    await window.CardWiseData.load();
  }
  if (window.CardWiseWallet && window.CardWiseAuth && window.CardWiseAuth.isLoggedIn()) {
    await window.CardWiseWallet.loadFromCloud();
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "axis-flipkart";
  const card = window.CARDWISE_byId ? window.CARDWISE_byId(id) : null;
  const meta = window.CARDWISE_META || {};

  if (!card) {
    root.innerHTML = `
      <div class="handy">
        <h1>Card not found</h1>
        <p class="handy-sub">Source: ${escapeHtml(window.CARDWISE_DATA_SOURCE || "unknown")}</p>
        <a class="btn btn-primary" href="../index.html">Back to offers</a>
      </div>`;
    return;
  }

  document.title = `${card.shortName} — CardWise`;
  const inWallet = window.CardWiseWallet && window.CardWiseWallet.has(card.id);
  const offers = card.offers || [];
  const review = window.CardWiseReview
    ? window.CardWiseReview.get(card.id)
    : { status: "unverified", checked: null };
  const reviewOk = review.status === "verified" || review.status === "auto";
  const reviewBadge = reviewOk
    ? `<span class="review-pill is-ok">Auto-extracted ${escapeHtml(review.checked || "")}</span>`
    : `<span class="review-pill is-warn">Needs review — confirm bank page</span>`;

  function money(n) {
    return "₹" + Math.round(n).toLocaleString("en-IN");
  }

  function rankRow(o, i) {
    const tier = String(o.tier || "base").replace(/[^a-z0-9_-]/gi, "");
    return `
      <li class="pay-row tier-${escapeHtml(tier)}" data-rate="${escapeHtml(o.rateValue)}" data-cap="${escapeHtml(o.capAmount ?? "")}">
        <span class="pay-rank">${i + 1}</span>
        <div class="pay-main">
          <div class="pay-title">${escapeHtml(o.title)}</div>
          ${o.hint ? `<div class="pay-hint">${escapeHtml(o.hint)}</div>` : ""}
        </div>
        <div class="pay-nums">
          <span class="pay-rate">${escapeHtml(o.rate)}</span>
          <span class="pay-cap">${escapeHtml(o.capLabel || "—")}</span>
        </div>
      </li>`;
  }

  const sourceNote =
    window.CARDWISE_DATA_SOURCE === "supabase"
      ? "Loaded from Supabase"
      : window.CARDWISE_DATA_SOURCE === "local-fallback"
        ? "Local backup (Supabase unavailable)"
        : "Local data";

  const gradient = S.safeCssBackground(card.gradient);

  root.innerHTML = `
    <div class="handy">
      <header class="handy-top">
        <div>
          <p class="eyebrow">${escapeHtml(card.bank)}</p>
          <h1>${escapeHtml(card.shortName)}</h1>
          <p class="handy-sub">${escapeHtml(card.tagline)} · ${escapeHtml(card.network)}</p>
          <p class="review-row">${reviewBadge}</p>
        </div>
        <div class="handy-card" style="background:${escapeHtml(gradient)}" aria-hidden="true">
          <span>${escapeHtml(card.shortName)}</span>
        </div>
      </header>

      <section class="block" id="fees">
        <div class="block-head">
          <h2>1. Fee</h2>
          <span class="chip-soft">${escapeHtml(card.bestFor)}</span>
        </div>
        <div class="fee-strip">
          <div class="fee-cell">
            <span class="fee-k">Join</span>
            <span class="fee-v">${escapeHtml(card.joiningFee)}</span>
          </div>
          <div class="fee-cell">
            <span class="fee-k">Yearly</span>
            <span class="fee-v">${escapeHtml(card.annualFee)}</span>
          </div>
          <div class="fee-cell fee-cell-ok">
            <span class="fee-k">Waiver</span>
            <span class="fee-v">${escapeHtml(card.waiver)}</span>
          </div>
        </div>
        ${card.feeHint ? `<p class="fee-hint">${escapeHtml(card.feeHint)}</p>` : ""}
      </section>

      <section class="block" id="pays">
        <div class="block-head">
          <h2>2. Where it pays more</h2>
          <span class="chip-soft">High → low</span>
        </div>
        <ol class="pay-list">
          ${offers.map(rankRow).join("")}
        </ol>
      </section>

      <section class="block calc-block" id="calc">
        <div class="block-head">
          <h2>3. Quick math</h2>
        </div>
        <div class="calc">
          <label class="calc-field">
            <span>Spend</span>
            <div class="calc-input">
              <span>₹</span>
              <input id="calc-spend" type="number" min="0" step="500" value="10000" inputmode="numeric" />
            </div>
          </label>
          <label class="calc-field">
            <span>Category</span>
            <select id="calc-cat">
              ${offers
                .map(
                  (o, i) =>
                    `<option value="${i}">${escapeHtml(o.title)} · ${escapeHtml(o.rate)}</option>`
                )
                .join("")}
            </select>
          </label>
        </div>
        <div class="calc-out" id="calc-out" aria-live="polite"></div>
      </section>

      <div class="handy-actions">
        <button type="button" class="btn btn-primary" id="wallet-toggle">
          ${inWallet ? "Remove from My Cards" : "Add to My Cards"}
        </button>
        <a class="btn btn-ghost" href="../index.html">Browse all cards</a>
      </div>

      <details class="sources-fold">
        <summary>Official sources · ${escapeHtml(sourceNote)}</summary>
        <div class="sources">
          ${(card.sources || [])
            .map((s) => {
              const href = S.safeHttpUrl(s.url);
              if (!href) return "";
              return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a>`;
            })
            .join("")}
        </div>
        <p class="verified">${escapeHtml(meta.note || "")}</p>
      </details>
    </div>
  `;

  const spendEl = document.getElementById("calc-spend");
  const catEl = document.getElementById("calc-cat");
  const outEl = document.getElementById("calc-out");

  function runCalc() {
    const spend = Math.max(0, Number(spendEl.value) || 0);
    const o = offers[Number(catEl.value)] || offers[0];
    if (!o || !o.rateValue) {
      outEl.textContent = "";
      return;
    }
    const raw = (spend * o.rateValue) / 100;
    const capped = o.capAmount != null ? Math.min(raw, o.capAmount) : raw;
    const hitCap = o.capAmount != null && raw > o.capAmount;
    const spendForCap =
      o.capAmount != null && o.rateValue
        ? Math.ceil((o.capAmount * 100) / o.rateValue)
        : null;

    const unit = escapeHtml(card.earnLabel || "cashback");
    outEl.innerHTML = `
      <div class="calc-result">
        <div>
          <span class="calc-label">You get ~</span>
          <strong class="calc-earn">${escapeHtml(money(capped))}</strong>
          <span class="calc-label">${unit}</span>
        </div>
        <div class="calc-breakdown">
          ${escapeHtml(money(spend))} × ${escapeHtml(o.rateValue)}% = ${escapeHtml(money(raw))}
          ${hitCap ? ` → capped at ${escapeHtml(money(o.capAmount))}` : ""}
          ${o.capLabel ? ` · ${escapeHtml(o.capLabel)}` : ""}
        </div>
        ${
          spendForCap
            ? `<div class="calc-tip">Cap fills at about <strong>${escapeHtml(money(spendForCap))}</strong> spend in this category (${escapeHtml(o.capPeriod || "period")}).</div>`
            : `<div class="calc-tip">No fixed cashback cap listed for this category.</div>`
        }
      </div>`;
  }

  spendEl.addEventListener("input", runCalc);
  catEl.addEventListener("change", runCalc);
  runCalc();

  const toggle = document.getElementById("wallet-toggle");
  if (toggle && window.CardWiseWallet) {
    const loggedIn = window.CardWiseAuth && window.CardWiseAuth.isLoggedIn();
    if (!loggedIn) {
      toggle.textContent = "Sign in to save card";
    }
    toggle.addEventListener("click", async () => {
      if (!window.CardWiseAuth || !window.CardWiseAuth.isLoggedIn()) {
        try {
          toggle.disabled = true;
          toggle.textContent = "Opening Google…";
          await window.CardWiseAuth.signInWithGoogle();
        } catch (err) {
          console.error(err);
          toggle.disabled = false;
          toggle.textContent = "Sign in to save card";
          alert("Sign-in failed: " + (err.message || err));
        }
        return;
      }
      window.CardWiseWallet.toggle(card.id);
      toggle.textContent = window.CardWiseWallet.has(card.id)
        ? "Remove from My Cards"
        : "Add to My Cards";
    });
  }
})();
