# FreeX website

Source of [freex.mirranet.de](https://freex.mirranet.de), the product page of [FreeX](https://github.com/FreeX-Studio) – the self-hosted media system with FreeX Media Server and its apps. Plain HTML, CSS and a little JavaScript, in English and German – no framework, no external requests from the visitor's browser.

## Languages

English is the default and lives at the root (`/`), German under `/de/`. Both are rendered from the same templates in `src/pages/`, where each text holds both languages side by side:

```html
<h2>{{de}}Herunterladen{{en}}Download{{/}}</h2>
```

[`scripts/build.py`](scripts/build.py) (Python standard library only) renders `src/` into `site/`. The supported placeholders are documented at the top of the script.

Which language a visitor gets:

1. An explicit choice from the DE/EN switcher in the header wins. It is kept in `localStorage` (`freex-lang`), nothing else is stored.
2. Otherwise the browser's preferred language decides: German (`de-*`) gets `/de/`, everything else gets English.
3. German pages never redirect a visitor who hasn't chosen, so shared `/de/` links stay German.

All pages carry `hreflang` alternates for search engines.

## How it stays in sync

Logos, screenshots and release information are **not** stored in this repository. They come from the FreeX repositories every time the site is deployed:

| What | Source | Lands in |
| --- | --- | --- |
| Logo, app icon, social preview | [Freex-Media-Server](https://github.com/FreeX-Studio/Freex-Media-Server) `docs/brand/` | `site/assets/brand/` |
| Screenshots of FreeX Web | Freex-Media-Server `docs/screenshots/{home,library,movie,show}.png` | `site/assets/screens/web-*.png` |
| Screenshots of FreeX for Kodi | [FreeX-Kodi-Addon](https://github.com/FreeX-Studio/FreeX-Kodi-Addon) `docs/screenshots/{home,library,show}.jpg` | `site/assets/screens/kodi-*.jpg` |
| Latest release of every app (version, date, download links) | GitHub Releases API of Freex-Media-Server, Freex-Desktop, FreeX-TV-Apps, FreeX-Mobile, FreeX-Kodi-Addon, FreeX-HT | `site/release.json` |

The workflow [`deploy.yml`](.github/workflows/deploy.yml) builds the pages, runs [`scripts/sync-freex.sh`](scripts/sync-freex.sh) and publishes `site/` to GitHub Pages:

- on every push to `main`,
- every three hours (picks up new releases and screenshots automatically),
- manually via *Actions › Deploy website › Run workflow*,
- on a `repository_dispatch` event of type `freex-updated` (optional, see below).

The download buttons link straight to the matching release asset (`*setup.exe`, `.dmg`, `FreeX-Android-*.apk`, `*.ipa`, `FreeX-TV-Android-*.apk`, `*Tizen*.zip`, `*.ipk`, `plugin.video.freex-*.zip`, `*-rpi.img.xz`, `*-x86_64.img.xz`). Without a published release they fall back to the repository's releases page. The server and FreeX Desktop on Linux are installed from the APT repository at `apt.mirranet.de`.

## One-time setup

1. **Pages:** *Settings › Pages › Build and deployment › Source:* **GitHub Actions**.
2. **Custom domain:** *Settings › Pages › Custom domain:* `freex.mirranet.de`, then tick *Enforce HTTPS* once the certificate is issued.
3. **DNS (Hetzner):** add a record in the `mirranet.de` zone:

   ```
   freex   CNAME   freex-studio.github.io.
   ```

4. Optional – **verify the domain** for the organization (*Organization settings › Pages › Add a domain*) so nobody else can claim it. GitHub shows a TXT record to add at Hetzner.

### Optional: deploy immediately after a release

The three-hourly schedule is enough for most cases. To update the site the moment a release is published, add a step to an app's release workflow (or Jenkins job) using a fine-grained token with *Contents: read & write* on this repository (stored as secret `WEBSITE_DISPATCH_TOKEN`):

```yaml
- name: Update website
  run: |
    curl -fsSL -X POST \
      -H "Authorization: Bearer ${{ secrets.WEBSITE_DISPATCH_TOKEN }}" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/repos/FreeX-Studio/FreeX-Website/dispatches \
      -d '{"event_type":"freex-updated"}'
```

## Local preview

```sh
mkdir -p .freex
git clone --depth 1 https://github.com/FreeX-Studio/Freex-Media-Server.git .freex/server
git clone --depth 1 https://github.com/FreeX-Studio/FreeX-Kodi-Addon.git .freex/kodi
python3 scripts/build.py
scripts/sync-freex.sh .freex site      # needs bash 4+, curl and jq
python3 -m http.server -d site 8080
```

## Layout

```
src/
  pages/              index, legal (Impressum), privacy (Datenschutz) – both languages
  partials/           head (language detection), header (with DE/EN switch), footer
  static/             copied as-is: CSS, JS, font (Manrope, SIL OFL 1.1), 404, CNAME
scripts/
  build.py            renders src/ into site/ (en at /, de at /de/)
  sync-freex.sh       adds logo, screenshots and release.json from the FreeX repos
site/                 build output, not committed
```

| Page | English | German |
| --- | --- | --- |
| Home | `/` | `/de/` |
| Legal notice | `/legal-notice.html` | `/de/impressum.html` |
| Privacy | `/privacy.html` | `/de/datenschutz.html` |

## License

The website code is licensed under the [GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/lgpl-3.0.html), like FreeX itself. The Manrope font is licensed under the SIL Open Font License 1.1 (`src/static/assets/fonts/OFL.txt`).
