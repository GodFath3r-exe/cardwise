/**
 * My Cards — cloud-only when signed in.
 * No browser cache for the wallet (guests see nothing until login).
 */
(function () {
  const LEGACY_KEY = "cardwise_my_cards";
  const LEGACY_OWNER = "cardwise_wallet_owner";

  /** In-memory only for the current signed-in session */
  let memoryIds = [];
  let syncing = false;
  let loadedForUser = "";

  // Drop any old localStorage wallet so nothing leaks across sessions.
  try {
    localStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem(LEGACY_OWNER);
  } catch {
    /* ignore */
  }

  function authClient() {
    return window.CardWiseAuth && window.CardWiseAuth.client
      ? window.CardWiseAuth.client()
      : null;
  }

  function userId() {
    const u = window.CardWiseAuth && window.CardWiseAuth.user && window.CardWiseAuth.user();
    return u ? u.id : null;
  }

  function isLoggedIn() {
    return Boolean(userId());
  }

  function emit() {
    window.dispatchEvent(new CustomEvent("cardwise:mycards"));
  }

  function setMemory(ids) {
    memoryIds = Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
    emit();
  }

  async function fetchCloud() {
    const client = authClient();
    const uid = userId();
    if (!client || !uid) return [];
    const { data, error } = await client
      .from("user_cards")
      .select("card_id")
      .eq("user_id", uid)
      .order("added_at", { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => r.card_id);
  }

  async function replaceCloud(ids) {
    const client = authClient();
    const uid = userId();
    if (!client || !uid) return;

    const { error: delErr } = await client.from("user_cards").delete().eq("user_id", uid);
    if (delErr) throw delErr;

    if (!ids.length) return;

    const rows = ids.map((card_id) => ({ user_id: uid, card_id }));
    const { error: insErr } = await client.from("user_cards").insert(rows);
    if (insErr) throw insErr;
  }

  async function loadFromCloud() {
    const uid = userId();
    if (!uid || syncing) return memoryIds;
    syncing = true;
    try {
      const cloud = await fetchCloud();
      loadedForUser = uid;
      setMemory(cloud);
      return cloud;
    } catch (err) {
      console.warn("My Cards cloud fetch failed:", err);
      loadedForUser = uid;
      setMemory([]);
      return [];
    } finally {
      syncing = false;
    }
  }

  async function persist() {
    if (!isLoggedIn()) return;
    try {
      await replaceCloud(memoryIds);
    } catch (err) {
      console.warn("My Cards sync failed:", err);
    }
  }

  function onSignedOut() {
    loadedForUser = "";
    setMemory([]);
  }

  window.CardWiseWallet = {
    requiresLogin: true,
    isReady() {
      if (!isLoggedIn()) return true;
      return loadedForUser === userId();
    },
    list() {
      if (!isLoggedIn()) return [];
      return memoryIds.slice();
    },
    has(id) {
      if (!isLoggedIn()) return false;
      return memoryIds.includes(id);
    },
    add(id) {
      if (!isLoggedIn()) return memoryIds.slice();
      if (!memoryIds.includes(id)) {
        memoryIds = memoryIds.concat(id);
        emit();
        persist();
      }
      return memoryIds.slice();
    },
    remove(id) {
      if (!isLoggedIn()) return [];
      memoryIds = memoryIds.filter((x) => x !== id);
      emit();
      persist();
      return memoryIds.slice();
    },
    toggle(id) {
      if (!isLoggedIn()) return [];
      return this.has(id) ? this.remove(id) : this.add(id);
    },
    loadFromCloud,
    /** @deprecated use loadFromCloud */
    syncOnLogin: loadFromCloud,
  };

  function boot() {
    const auth = window.CardWiseAuth;
    if (!auth) return;
    let wasLoggedIn = false;

    auth.ready.then(() => {
      wasLoggedIn = auth.isLoggedIn();
      if (wasLoggedIn) loadFromCloud();
      else onSignedOut();
    });

    auth.onChange(({ user }) => {
      if (user) {
        wasLoggedIn = true;
        loadFromCloud();
      } else if (wasLoggedIn) {
        wasLoggedIn = false;
        onSignedOut();
      } else {
        onSignedOut();
      }
    });
  }

  if (window.CardWiseAuth) boot();
  else window.addEventListener("DOMContentLoaded", boot);
})();
