# Publishing Beebo updates

Public labels and download links follow `desktop-version.json` and `downloads/app-build.json`. Keep version, SHA-256, size, notes and publication time accurate. Store UTC timestamps with a timezone; the website displays Eastern time with seconds. Build time and publication time are different fields.

## Hosting

Current installers live at `https://origin.beebo.tv/downloads/` on OVH in `/srv/beebo-public/downloads/`. Publish only the current supported version for each product. Keep old installers and hashes privately, outside the public directory. Do not add binaries to this public Git repository or create another GitHub release.

The website itself currently uses GitHub Pages. That migration is separate; do not make its repository private while Pages is serving it. Old files may still exist in public Git history until that migration is complete.

## Release checks

1. Build and test. Check Android signing compatibility; report Windows code-signing status accurately.
2. Back up the old artifact privately and upload the new versioned artifact to OVH. Check its SHA-256 and byte count on the server.
3. Set `publishedAtUtc` to the actual time the new file became publicly available. Update both metadata feeds, embedded version/date fallbacks, release notes and download links. Never reuse an older release date. After updating `desktop-version.json`/`downloads/app-build.json`, run `node tools/stamp-release-footers.mjs` from the repo root -- it rewrites the baked-in `data-beebo-release-*` fallback text on every page in one pass so the "embedded version/date fallbacks" step above cannot be silently skipped again (`--check` reports drift without writing, for a pre-publish check). This was previously done by hand, if at all: pages went unstamped for several releases in a row (0.1.62/1.50-tester baked in while the live feeds had moved on to 0.1.66/1.51-tester3) before anyone noticed, purely because 69 pages is too many to edit manually every release.
4. Replace the legacy Windows download bucket object with the same installer, using the service copy tool. Verify the copy actually ran and its hash matches.
5. Test live downloads, range requests, metadata and the rendered pages. Publish the website and verify the deployment.
6. Withdraw superseded public artifacts after the new version works. Keep rollback copies privately. Removing a download cannot revoke copies already installed or shared.

`polish.js` refreshes release labels and supported OVH download links. Embedded links and labels remain usable if a metadata request fails. Do not publish credentials, signing keys, or private backup directories.

Expect up to a ~10 minute window right after a release where different visitors (or the same visitor loading two different pages) can see mismatched version numbers: GitHub Pages serves desktop-version.json/downloads/app-build.json through its Fastly CDN with Cache-Control: max-age=600, and different edge nodes refresh their cached copy at different times. `fetch(..., {cache:'no-store'})` in polish.js only bypasses the visitor's own browser cache, not that CDN layer, so this cannot be fixed from the page side. It self-heals within the window and is not the same bug as stale baked-in fallback text (which never self-heals without the stamping step above) -- do not spend time re-diagnosing this as a per-page bug if it is seen again shortly after a release.
