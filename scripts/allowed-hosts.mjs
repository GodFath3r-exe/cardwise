/** Official bank / issuer hosts the refresh bot may fetch. */
export const ALLOWED_SOURCE_HOSTS = [
  "hdfcbank.com",
  "hdfc.bank.in",
  "axisbank.com",
  "axis.bank.in",
  "sbicard.com",
  "icicibank.com",
  "icici.bank.in",
  "americanexpress.com",
  "aubank.in",
  "au.bank.in",
  "indusind.com",
  "sc.com",
  "federalbank.co.in",
  "federal.bank.in",
  "scapia.cards",
  "kotak.com",
  "getonecard.app",
  "onecard.app",
  "bankofbaroda.in",
  "yesbank.in",
  "rblbank.com",
  "idfcfirstbank.com",
  "hsbc.co.in",
  "unionbankofindia.co.in",
];

export function isAllowedSourceUrl(url) {
  try {
    const u = new URL(String(url || ""));
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.replace(/^www\./, "");
    return ALLOWED_SOURCE_HOSTS.some((d) => h === d || h.endsWith("." + d));
  } catch {
    return false;
  }
}
