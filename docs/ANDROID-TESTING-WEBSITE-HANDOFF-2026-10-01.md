# Feature verification website update — October 1, 2026

Prepared on the existing `codex/testing-transparency-page` branch, then transferred as content-only edits to `codex/android-testing-verified-2026-10-01`, based on the current website main at `b9e23a0`. No push, merge, publication or deployment was performed. The parent session will review and commit the handoff.

Assignment: the October 1, 08:59 UTC comment on standing coordination issue 39, expanded by the 09:04:40 UTC comment. `FEATURE-VERIFICATION-2026-10-01.md` in the app repository is the source for the feature tables. The original Android live-device reports and offline-state report preserve the exact phone-session scope and fix status.

## Changed pages

- `release-evidence.html`: replaces pending-record placeholders with dated Windows desktop (0.1.70), Android device and feature, phone-browser, and server tables. Separates automatic checks from real-device observations, retains every Not tested column, and uses the exact label `All listed checks passed` only for the checks recorded as passing. Keeps the walkie-talkie Planned / In development and undeployed server code separate from released features.
- `index.html`: Android Test download label, a short testing-update link, and the existing metadata version selector. The card's static fallback is neutral `Checking version…`; `polish.js` fills the offered version from release JSON. Removes old `build=1.50-tester` filters from the Android checklist/reviewer links and uses platform-specific link labels. Download metadata and artifacts are untouched.
- `app-on-your-phone.html`: a verified-paths block and accurate store/testing status.
- `platforms.html`: Android row and status legend match the limited real-phone record.

Evidence discrepancy to flag to Claude: the feature-verification Android playback row says the episode played end to end, but the original S24 report records a resume from 23:35 to about 24:50. Public copy follows the narrower original observation: picture, sound, advancing position and picture-in-picture; no complete-episode claim.

The S9+ test was the published 1.51-tester3 build (53), offline; its two fixes remain development changes awaiting a phone retest. This is the developer's own testing on two phones, not a broad beta, and Google Play testing has not started. Browser microphones passed on both phones, but camera verification applies only to the S24. Those Phase 0 pages are not a phone-generated certificate test or a released two-phone walkie feature. Painted-art status describes the published app; isolated front/side candidates are not claimed as integrated. No new screenshots, personal data, prices or safety claims were added.

## Validation

- `git diff --check`: passes.
- Browser review of all four pages at 1440 and 390 pixels: one main heading per page, no duplicate IDs or missing labelled-by targets, no whole-page horizontal overflow, no browser JavaScript errors. The phone testing table scrolls inside its section at phone width. New testing link fragments resolve. The download-card version renders from the existing `downloads/app-build.json` through `polish.js`; its Android checklist/reviewer URLs contain no stale build filter.
- With the Android metadata response held back at both widths, the card showed only `Checking version…`. After release of the response it showed the JSON's `1.51-tester3 (build 53)`. Observed label history contained only those two values, with no intervening incorrect release version.
- Verification sections have 10 desktop feature rows, two Android device rows plus nine Android feature rows, two browser rows and three server rows. Checked that the S9 camera claim is absent, phone retest limits remain explicit and no flat percentage claim was added. New desktop, browser and server sections were visually reviewed from browser captures.
- Desktop and phone-width testing-page captures were visually reviewed locally and are not site assets.
- The old preparation branch has no package test/lint runner. On the current-main content branch, the existing `node tools/stamp-release-footers.mjs --check` reports 69 stale embedded footers. The same checker against this branch's original HEAD also reports 69, confirming pre-existing release-label drift. Existing footers on all three edited pages with footers match current main byte-for-byte; release JSON and APK files have no diff. Footer stamping is left to the existing publishing workflow.

## Before publication

Review/merge the current-main content branch, preserving its current release metadata, APK, download URLs, SHA-256, timestamps and footer stamping. The old worktree was not published or used to replace newer release files. The current branch's existing release JSON, APK and embedded footers were preserved. The S9 test build number is historical testing evidence rather than a hard-coded offered download version.

New fixed version/date text appears only as source-record context: Windows 0.1.70 on October 1; S9+ 1.51-tester3 (53); and the recorded update-feed 0.1.70 check. These are testing evidence, not current-download labels. The current desktop release feed records 3:02 AM while the feature-verification source says 3:01 AM, so the public page gives the date without a minute; the live feed and embedded footers were not altered.

Regenerate or review affected page narration as part of the existing publishing workflow; audio was not regenerated here. App fixes, new phone builds and device retests remain Claude's work. No app-code or app-art worktree was modified for this update.
