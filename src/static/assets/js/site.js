// FreeX website behaviour: screenshot tour, copy button and release links.
// release.json is generated at deploy time by scripts/sync-freex.sh, so
// visitors never contact the GitHub API directly.

(function () {
  "use strict";

  const LANG = document.documentElement.lang === "de" ? "de" : "en";
  const BASE = document.documentElement.dataset.base || "";

  const STRINGS = {
    de: {
      noRelease: (url) => `Noch keine Version auf GitHub veröffentlicht – neue Versionen erscheinen auf der <a href="${url}">Release-Seite</a>.`,
      version: (v, date) => `Version ${v}${date ? ` vom ${date}` : ""}`,
      copied: "Kopiert",
      locale: "de-DE",
    },
    en: {
      noRelease: (url) => `No version published on GitHub yet – new versions appear on the <a href="${url}">releases page</a>.`,
      version: (v, date) => `Version ${v}${date ? `, released ${date}` : ""}`,
      copied: "Copied",
      locale: "en-GB",
    },
  };
  const T = STRINGS[LANG];

  // ---------- Language switcher ----------
  // Remember an explicit choice so the automatic detection in <head>
  // doesn't send the visitor back.
  document.querySelectorAll("[data-set-lang]").forEach((link) => {
    link.addEventListener("click", () => {
      try { localStorage.setItem("freex-lang", link.dataset.setLang); } catch (_) { /* private mode */ }
      if (location.hash) link.href = link.href.split("#")[0] + location.hash;
    });
  });

  // ---------- Screenshot tour ----------
  function initTour(root) {
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    const img = root.querySelector(".tour__img");
    const caption = root.querySelector(".tour__caption");
    if (!tabs.length || !img) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const srcOf = (tab) => `${BASE}assets/screens/${tab.dataset.shot}`;

    // Warm the cache so switching feels instant.
    const warm = () => tabs.forEach((t) => { new Image().src = srcOf(t); });
    if ("requestIdleCallback" in window) requestIdleCallback(warm); else setTimeout(warm, 1500);

    function select(tab, focus) {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      if (focus) tab.focus();

      const apply = () => {
        img.src = srcOf(tab);
        img.alt = `FreeX: ${tab.textContent.trim()}`;
        caption.textContent = tab.dataset.caption || "";
      };
      if (reduceMotion) { apply(); return; }
      img.classList.add("is-swapping");
      setTimeout(() => {
        apply();
        const show = () => img.classList.remove("is-swapping");
        if (img.complete) show(); else img.addEventListener("load", show, { once: true });
      }, 160);
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab, false));
      tab.addEventListener("keydown", (e) => {
        let next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  }

  // ---------- Copy button ----------
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener("click", async () => {
      const code = btn.parentElement.querySelector("code");
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.textContent);
        btn.textContent = T.copied;
        setTimeout(() => { btn.textContent = label; }, 1800);
      } catch (_) { /* clipboard not available */ }
    });
  });

  // ---------- Release links ----------
  const ASSET_PATTERNS = {
    win: [/setup\.exe$/i, /\.exe$/i],
    dmg: [/\.dmg$/i],
    apk: [/^FreeX-Android-.*\.apk$/i, /\.apk$/i],
    ipa: [/\.ipa$/i],
    tvapk: [/^FreeX-TV-Android-.*\.apk$/i, /\.apk$/i],
    tizen: [/Tizen.*\.zip$/i, /\.wgt$/i],
    webos: [/\.ipk$/i],
    zip: [/^plugin\.video\.freex-.*\.zip$/i, /\.zip$/i],
    rpi: [/-rpi\.img\.xz$/i],
    x86: [/-x86_64\.img\.xz$/i],
  };

  function findAsset(assets, patterns) {
    for (const re of patterns) {
      const hit = assets.find((a) => re.test(a.name));
      if (hit) return hit;
    }
    return null;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(T.locale, { day: "numeric", month: "long", year: "numeric" });
    } catch (_) { return ""; }
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    return `${(bytes / 1048576).toLocaleString(T.locale, { maximumFractionDigits: 0 })} MB`;
  }

  async function initReleases() {
    if (!document.querySelector("[data-repo], [data-release-status]")) return;
    let releases = null;
    try {
      const res = await fetch(`${BASE}release.json`, { cache: "no-cache" });
      if (res.ok) releases = await res.json();
    } catch (_) { /* keep the static fallback links */ }
    if (!releases) return;

    document.querySelectorAll("[data-release-status]").forEach((el) => {
      const r = releases[el.dataset.releaseStatus];
      if (!r) return;
      // Only the server card explains a missing release; the app cards stay quiet
      // (their links already lead to the releases page).
      if (!r.tag) { if (el.dataset.releaseStatus === "server") el.innerHTML = T.noRelease(r.releases_url); return; }
      const version = r.tag.replace(/^v/i, "");
      el.textContent = T.version(version, r.published_at ? formatDate(r.published_at) : "");
    });

    document.querySelectorAll("[data-repo][data-asset]").forEach((link) => {
      const r = releases[link.dataset.repo];
      if (!r || !r.tag) return;
      const asset = findAsset(Array.isArray(r.assets) ? r.assets : [], ASSET_PATTERNS[link.dataset.asset] || []);
      if (asset) {
        link.href = asset.url;
        const size = formatSize(asset.size);
        link.title = size ? `${asset.name} (${size})` : asset.name;
      } else {
        link.href = r.html_url || r.releases_url;
      }
    });
  }

  document.querySelectorAll("[data-tour]").forEach(initTour);
  initReleases();
})();
