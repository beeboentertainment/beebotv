# Beebo Auto download card handoff — October 1, 2026

## Scope

Website root pages only. Adds a Beebo Auto test-download card to the homepage download grid and the Platforms page, plus a matching Platforms status row. The displayed version comes from the existing `/downloads/auto-build.json` feed, using the same release-label mechanism as the Android phone card. The direct fallback link is `/downloads/BeeboAuto.apk`.

## Honest status and safety copy

Both cards say this is a **Test download for Android Auto**, **not on Google Play**, and **never tested in a real car**. They link the existing driving-safety guidance and tell users to use it only when parked. This branch does not change the Auto app, claim real-car verification, or change `car-companion.html`; Claude has a separate approved rewrite for that page.

## Files and verification

- `index.html`: one additional card in the existing download grid.
- `platforms.html`: one additional download card and status-table row; grid adapts to four cards and narrow screens.
- `polish.js`: reads `auto-build.json`, updates Auto version labels, and accepts only same-origin `/downloads/*.apk` URLs for Auto download links.
- No file under `downloads/` or `desktop-version.json` was changed or staged.

Checked locally: `polish.js` syntax, HTML card/link presence, `git diff --check`, and that the existing `BeeboAuto.apk` file's size and SHA-256 match `auto-build.json` (14,830,017 bytes; `12263295db62ec6cb0ce4ba13d49c07a641ab48fb1b110237f1037d3f00635fc`). The app was **not** installed or tested in a vehicle, and the site was **not** pushed or deployed.

## Claude review

Please check the copy and responsive layout, confirm the live hosting serves both metadata and APK, and merge/publish only after your review. Keep this separate from the root-page QA and car/tournaments rewrites.
