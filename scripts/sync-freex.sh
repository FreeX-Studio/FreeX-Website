#!/usr/bin/env bash
# Pulls everything the website shows about FreeX from the FreeX repositories
# into the site folder: logos, screenshots and the latest release of every app.
#
# Usage: scripts/sync-freex.sh <checkouts-dir> [site-dir]
#
# <checkouts-dir> holds (sparse) checkouts named server/ and kodi/
# (FreeX-Studio/Freex-Media-Server and FreeX-Studio/FreeX-Kodi-Addon).
# GITHUB_TOKEN is optional; without it the GitHub API rate limit for
# anonymous requests applies (fine for local use).

set -euo pipefail

SRC_DIR="${1:?directory with the FreeX checkouts required}"
SITE_DIR="${2:-$(dirname "$0")/../site}"
ORG="${FREEX_ORG:-FreeX-Studio}"

screens="$SITE_DIR/assets/screens"
brand="$SITE_DIR/assets/brand"
mkdir -p "$screens" "$brand"

# Brand: docs/brand of the server is the single source of truth.
for f in freex-logo.svg freex-app-icon.svg freex-app-icon-1024.png social-preview.png; do
  cp "$SRC_DIR/server/docs/brand/$f" "$brand/$f"
done

# Screenshots (made-up demo media) from the server (FreeX Web) and the Kodi add-on.
rm -f "$screens"/*
for s in home library movie show; do
  cp "$SRC_DIR/server/docs/screenshots/$s.png" "$screens/web-$s.png"
done
for s in home library show; do
  cp "$SRC_DIR/kodi/docs/screenshots/$s.jpg" "$screens/kodi-$s.jpg"
done

# Latest published release of every app (pre-releases included, drafts excluded),
# reduced to the fields the page needs. Written as release.json so visitors
# never talk to the GitHub API themselves.
auth=()
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  auth=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

declare -A REPOS=(
  [server]=Freex-Media-Server
  [desktop]=Freex-Desktop
  [tv]=FreeX-TV-Apps
  [mobile]=FreeX-Mobile
  [kodi]=FreeX-Kodi-Addon
  [ht]=FreeX-HT
)

out="{}"
for key in "${!REPOS[@]}"; do
  repo="${REPOS[$key]}"
  releases="$(curl -fsSL "${auth[@]}" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$ORG/$repo/releases?per_page=20" || echo '[]')"
  entry="$(echo "$releases" | jq --arg url "https://github.com/$ORG/$repo/releases" '
    ((if type == "array" then . else [] end) | map(select(.draft | not)) | first) as $r |
    if $r == null then { tag: null, releases_url: $url } else {
      tag: $r.tag_name,
      name: $r.name,
      prerelease: $r.prerelease,
      published_at: $r.published_at,
      html_url: $r.html_url,
      releases_url: $url,
      assets: [ $r.assets[] | { name, size, url: .browser_download_url } ]
    } end')"
  out="$(jq --arg k "$key" --argjson v "$entry" '. + {($k): $v}' <<<"$out")"
  echo "$repo: $(jq -r '.tag // "no release"' <<<"$entry")"
done
echo "$out" > "$SITE_DIR/release.json"

echo "Synced $(ls "$screens" | wc -l) screenshots, brand assets and release.json."
