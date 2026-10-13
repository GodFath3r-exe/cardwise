/**
 * DOM / URL helpers — treat catalog + auth metadata as untrusted.
 */
(function () {
  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/\n/g, " ");
  }

  /** Allow only http(s) absolute URLs. */
  function safeHttpUrl(s) {
    try {
      const u = new URL(String(s || ""), window.location.origin);
      if (u.protocol !== "https:" && u.protocol !== "http:") return "";
      return u.href;
    } catch {
      return "";
    }
  }

  /** Google profile images (and similar https CDNs). */
  function safeAvatarUrl(s) {
    const href = safeHttpUrl(s);
    if (!href) return "";
    try {
      const h = new URL(href).hostname;
      if (
        h.endsWith("googleusercontent.com") ||
        h === "lh3.google.com" ||
        h.endsWith(".google.com")
      ) {
        return href;
      }
    } catch {
      /* ignore */
    }
    return "";
  }

  function safeCssColor(s) {
    const t = String(s || "").trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return t;
    if (/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+\s*)?\)$/.test(t)) return t;
    return "#0f172a";
  }

  function safeCssBackground(s) {
    const t = String(s || "").trim();
    if (/url\s*\(|expression\s*\(|javascript:|@import|<|>|\{|\}/i.test(t)) {
      return "linear-gradient(160deg,#0f172a,#111827)";
    }
    if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return t;
    if (/^linear-gradient\([^;]+?\)$/i.test(t)) return t;
    return "linear-gradient(160deg,#0f172a,#111827)";
  }

  window.CardWiseSafe = {
    escapeHtml,
    escapeAttr,
    safeHttpUrl,
    safeAvatarUrl,
    safeCssColor,
    safeCssBackground,
  };
})();
