/**
 * CardWise Auth — Supabase session + Google OAuth
 */
(function () {
  const cfg = window.CARDWISE_SUPABASE || {};
  let client = null;
  let user = null;
  let session = null;
  const listeners = new Set();

  function emit() {
    listeners.forEach((fn) => {
      try {
        fn({ user, session });
      } catch (e) {
        console.warn("auth listener error", e);
      }
    });
    window.dispatchEvent(
      new CustomEvent("cardwise:auth", { detail: { user, session } })
    );
  }

  function configured() {
    return Boolean(
      cfg.url &&
        cfg.anonKey &&
        window.supabase &&
        typeof window.supabase.createClient === "function"
    );
  }

  async function init() {
    if (!configured()) {
      window.CARDWISE_AUTH_READY = true;
      return { user: null, session: null };
    }

    client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });

    const { data } = await client.auth.getSession();
    session = data.session || null;
    user = session && session.user ? session.user : null;

    client.auth.onAuthStateChange((_event, next) => {
      session = next || null;
      user = session && session.user ? session.user : null;
      emit();
    });

    window.CARDWISE_AUTH_READY = true;
    emit();
    return { user, session };
  }

  const ready = init();

  function redirectTo() {
    const url = new URL(window.location.href);
    url.hash = "";
    return url.toString();
  }

  window.CardWiseAuth = {
    ready,
    configured,
    client() {
      return client;
    },
    user() {
      return user;
    },
    session() {
      return session;
    },
    isLoggedIn() {
      return Boolean(user);
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    async signInWithGoogle() {
      await ready;
      if (!client) throw new Error("Auth not configured");
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo(),
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    },
    async signOut() {
      await ready;
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw error;
      user = null;
      session = null;
      emit();
    },
    displayName() {
      if (!user) return "";
      const meta = user.user_metadata || {};
      return meta.full_name || meta.name || user.email || "You";
    },
    avatarUrl() {
      if (!user) return "";
      const meta = user.user_metadata || {};
      return meta.avatar_url || meta.picture || "";
    },
  };

  function renderAuthBar() {
    const bar = document.getElementById("auth-bar");
    if (!bar) return;

    if (!configured()) {
      bar.innerHTML = "";
      bar.hidden = true;
      return;
    }

    bar.hidden = false;

    if (!user) {
      bar.innerHTML = `
        <button type="button" class="btn btn-ghost btn-auth" id="btn-login">
          Sign in with Google
        </button>`;
      const btn = document.getElementById("btn-login");
      if (btn) {
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          btn.textContent = "Opening Google…";
          try {
            await window.CardWiseAuth.signInWithGoogle();
          } catch (err) {
            console.error(err);
            btn.disabled = false;
            btn.textContent = "Sign in with Google";
            alert(
              "Sign-in failed. Finish Google setup in Supabase (see db/AUTH_SETUP.md).\n\n" +
                (err.message || err)
            );
          }
        });
      }
      return;
    }

    const S = window.CardWiseSafe || {
      escapeHtml: (s) => String(s ?? ""),
      safeAvatarUrl: () => "",
    };
    const name = window.CardWiseAuth.displayName();
    const avatar = S.safeAvatarUrl
      ? S.safeAvatarUrl(window.CardWiseAuth.avatarUrl())
      : "";
    const first = (name || "?").trim().split(/\s+/)[0] || "?";
    const initial = first.charAt(0).toUpperCase();

    bar.innerHTML = `
      <div class="auth-user">
        ${
          avatar
            ? `<img class="auth-avatar" src="${S.escapeHtml(avatar)}" alt="" referrerpolicy="no-referrer" />`
            : `<span class="auth-avatar auth-avatar-fallback" aria-hidden="true">${S.escapeHtml(initial)}</span>`
        }
        <span class="auth-name" title="${S.escapeHtml(name)}">${S.escapeHtml(first)}</span>
        <button type="button" class="btn btn-ghost btn-auth" id="btn-logout">Sign out</button>
      </div>`;

    const out = document.getElementById("btn-logout");
    if (out) {
      out.addEventListener("click", async () => {
        out.disabled = true;
        try {
          await window.CardWiseAuth.signOut();
        } catch (err) {
          console.error(err);
          out.disabled = false;
          alert("Sign out failed: " + (err.message || err));
        }
      });
    }
  }

  ready.then(renderAuthBar);
  window.CardWiseAuth.onChange(renderAuthBar);
})();
