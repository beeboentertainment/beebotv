# New Beebo website: review notes

## Candidate and page counts

This is a source-only review candidate based on public website main `8dce4c66d0ba94ee01ec9b727f40a34f22406ef0`. It has not been deployed. The assigned branch is `codex/new-site-astra-20261114`.

The new main site has **seven primary pages and three restyled legal pages**, for **10 redesigned pages**. Five HTML paths are newly added: `about.html`, `download.html`, `features.html`, `how-it-works.html` and `testing.html`. Five existing paths are replaced or restyled: Home, Help, Terms, Privacy Policy and Delete account.

All **210 pre-existing tracked HTML paths remain present**. Of those, **205 retain their original bytes** and sit outside the new navigation; five receive the new presentation. This inventory includes three old `_scratch` templates and other experimental or auxiliary pages, so 210 is a file count, not a count of primary visitor pages. Old pages still link to one another. No old page was deleted or redirected as part of this pass. The existing `privacy.html` redirect remains unchanged.

The existing legal policy still links to `docs/privacy-in-plain-words.html`; that body link is preserved verbatim. The new navigation otherwise uses the new main and legal pages. All 30 original Home fragment IDs are retained as aliases, so old Home section links still land on a relevant part of the replacement page.

## Preservation

The 11 protected files below have exactly the same Git blobs as the starting website. This was independently verified on implementation commit `f44ca30ee92f30313ab59fc80452e6c8f9a2cb76`; final validation is recorded separately below.

- `CNAME`
- `desktop-version.json`
- `downloads/desktop-version.json`
- `downloads/app-build.json`
- `downloads/auto-build.json`
- `downloads/BeeboEntertainment.apk`
- `downloads/BeeboAuto.apk`
- `downloads/Beebo-Test-Media-2026-09-26.zip`
- `downloads/Beebo-the-Mascot-2021.mp4`
- `robots.txt`
- `sitemap.xml`

Every file under `downloads/` and every existing `*-build.json` is included. No feed was moved, renamed, reformatted or regenerated. Existing images, release history, testing-status data and site-data records are retained. The preserved sitemap still describes the legacy site; this task explicitly keeps its bytes unchanged.

`llms.txt` stays at its existing path and now describes the new pages. Its Windows, Android and Auto versions, byte sizes, publication times and SHA-256 values were taken from the existing feeds. The download page also includes saved feed values and refreshes those dedicated fields from the unchanged feeds. Source commit references and raw release-note metadata are not copied into the new download presentation.

## Exact legal content

Terms and Privacy Policy retain the exact raw inner markup of their original `.wrap.doc` containers. Delete account retains the exact raw inner markup of its original `main.del-wrap` container inside the new shell. Its inline deletion script is also unchanged byte-for-byte. All 10 links inside those legal containers and all five form controls are unchanged. One semantic main element now surrounds each page. Old surrounding navigation, remote font requests and narration assets were removed.

| Preserved fragment | Bytes | SHA-256 |
| --- | ---: | --- |
| Terms inner markup | 9,776 | `a49244f2012c1814a5ded53d82f5cddc1ddf6f5c14ea775425321ab9bbf32448` |
| Privacy Policy inner markup | 7,177 | `759447efafa007c0d97fd167107a000f23978c0fb5beb38fe58b776679a7d0e8` |
| Delete-account inner markup | 3,913 | `e4b32017cf9e3ea61f5adbed0c103448523fa21abf8a6735f1ea91f934d59710` |
| Account-deletion script | 2,900 | `c27475c56d42cabb37f9e414c8933b71ac3ce00ee234f0ef7408b15ce565173c` |

The body text is unchanged, including legal contact links, the illustrative account-form placeholder, the liability amount, possible future paid-service wording, and child-related legal clauses. These pre-existing legal passages are exceptions to the fresh-copy scans, because the brief explicitly prohibits rewriting them. No contact address is repeated in these notes. The policy also retains its previous external-font statement, even though the new pages no longer request external fonts; correcting legal wording requires a separate decision. No account-deletion request was submitted during this work.

## Current facts and historical evidence

The available downloads are Windows **0.1.120**, Android **1.64 (build 136)** and Beebo Auto **1.22 (build 23)**, with their exact publication times kept in the feeds and download page. The testing snapshot was updated **Nov 14, 2026, 4:04 AM Eastern** and names Windows **0.1.119** and Android **1.62 (build 134)**. Its individual records can be older still. Newer downloads do not inherit old device acceptance.

The owner's brief controls current availability labels. Beebo Auto is Available as a sideload. Limited car checks were recorded on older builds on October 6 and October 27, 2026; **the current build (1.22) has not been tested in a real car**. The testing renderer retains the bounded October 27 record alongside the newer phone-emulator evidence. Earlier car observations do not establish current-build acceptance. Linux and Docker/NAS remain Beta with no download offered. Optional Relay, VPN, paid plans, hosting and rewards are not purchasable. Existing evidence values and records are not altered to fit the new presentation.

## Fixback 1

The independent review of `07045ede179f31224ac50ece92f806461c295b49` found three P2 defects. This fixback restores generated content ownership, migrates canonical shell generation and validation, and corrects the absolute Auto car-testing claim.

Home and Testing feature-list status and all 33 known-problem entries are generated from the unchanged `site-data/what-we-offer.json`, with the existing stricter-label rule and dated evidence limits retained. Home structured data and the machine-readable summary are also generated. The retained legacy feature-list page and all evidence JSON remain unchanged.

The shell generator uses an explicit redesigned profile for ten pages and preserves the old profile for retained pages. The checker covers 116 canonical pages and 99 unchanged exceptions, checks idempotence, and preserves legal/deletion content, feeds, old paths and Home fragments. New regression tests exercise missing shell markers, damaged new headers, legal changes and JSON-driven content updates.

The Auto copy consistently distinguishes earlier limited car checks on older builds from the absence of real-car testing on current build 1.22. No evidence JSON was edited. The renderer shows the earlier bounded owner observation and the newer 19 PASS / 0 FAIL / 6 NOT RUN emulator report with their separate limits.

### Verification

- `npm test`: **71 passed, 0 failed**, including the six evidence-renderer checks, three offer-generator regressions and redesigned-shell coverage. The original generator/evidence failures, Auto history failure and mixed-line-ending regression were reproduced before their fixes.
- All five legacy checks pass: `tools/build-status-page.mjs --check`, `site-data/check-progress-score.js`, `scripts/check-evidence-tiers.cjs`, `site-data/build-what-we-offer.js --check` and `tools/build-feature-pages.mjs --check`. The 70 evidence records and 70 legacy feature pages remain consistent.
- `scripts/check-site-shell.mjs --base 8dce4c66` passes: **116 canonical pages, 99 unchanged exceptions, 215 HTML files**. Re-running shell generation changes zero files. Generated blocks are idempotent; manual edits are rejected by check mode.
- Preservation checks pass: **210/210 old paths**, **205 unchanged old HTML blobs**, **21 unchanged protected files**, **30/30 original Home IDs**, all three download URLs, the exact required privacy sentence and 18+ wording. Legal raw markup, ten legal links, five deletion controls and the deletion script remain unchanged. `git diff --check` passes.
- Final headless Chrome verification passes **40/40 page/viewport/theme combinations** (ten pages, 390/1280 pixels, light/dark), **155/155 local links/fragments**, and zero automated WCAG A/AA violations, overflows, broken images, page errors, missing resources or external requests. Keyboard navigation, theme persistence, mobile menu/Escape, FAQ, feed refresh, evidence search/filter and no-JavaScript fallbacks pass. Expanded Auto history and all 33 generated known problems are also checked. All forty page screenshots plus one expanded Testing screenshot are refreshed in `site-check/screens/`. The command-owned browser and server were closed.
- Download feed fixtures pass **18/18 platform/scenario tests**, with multiple assertions per test: current feed, offline, malformed field, unexpected host, synthetic successor and retry recovery across Windows, Android and Auto. All fixture fetches were mocked.
- Independent source review found no remaining P1/P2/P3 issues in the three fixes. Its mixed-line-ending finding was corrected and independently rechecked. These are source and local-browser results, not installed-app or real-car acceptance.

### Review limits

This is a source-only review candidate, not a publication receipt. No deployment, GitHub comment, main update, app execution, device/car test or account-deletion submission was performed. Safari, Firefox, physical-phone layouts and a complete screen-reader audit were not run. Retained pages remain unchanged; the sitemap, old release history and legal wording are preserved.

Local QA scripts, raw receipts and refreshed screenshots remain in ignored `site-check/`. The generator, shell tooling and regression tests are tracked so their checks can be reproduced from the branch.

## Every old HTML path

“Retained” means original bytes kept at the same path, outside the new navigation. The new destination is the closest replacement for the visitor's question, not a new claim that an old feature is available. Old specialist instructions and historical evidence remain accessible at their existing URLs.

| Old path | Action in this pass | New destination |
| --- | --- | --- |
| `404.html` | Retained unchanged; outside new navigation | `index.html` |
| `_scratch/_tpl_footer.html` | Existing template retained unchanged; not a main visitor page | `index.html` |
| `_scratch/_tpl_head.html` | Existing template retained unchanged; not a main visitor page | `index.html` |
| `_scratch/_tpl_header.html` | Existing template retained unchanged; not a main visitor page | `index.html` |
| `about-beebo.html` | Retained unchanged; outside new navigation | `about.html` |
| `activated.html` | Retained unchanged; outside new navigation | `help.html` |
| `ai-test-results.html` | Retained unchanged; outside new navigation | `testing.html` |
| `android-tv.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `app-on-your-phone.html` | Retained unchanged; outside new navigation | `download.html#android` |
| `apple.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `become-a-tester.html` | Retained unchanged; outside new navigation | `help.html#report` |
| `beebo-products.html` | Retained unchanged; outside new navigation | `features.html` |
| `beebo-relay.html` | Retained unchanged; outside new navigation | `how-it-works.html#away` |
| `beebo-space-saver.html` | Retained unchanged; outside new navigation | `features.html#library` |
| `beebo-vs-other-apps.html` | Retained unchanged; outside new navigation | `features.html` |
| `beebovpn.html` | Retained unchanged; outside new navigation | `features.html#services` |
| `camp-stories.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `campsite-beta-tests/family-timeline.html` | Retained unchanged; outside new navigation | `testing.html` |
| `campsite-beta-tests/index.html` | Retained unchanged; outside new navigation | `testing.html` |
| `campsite-beta-tests/movie-game-night.html` | Retained unchanged; outside new navigation | `testing.html` |
| `can-i-run-beebo.html` | Retained unchanged; outside new navigation | `download.html` |
| `car-companion.html` | Retained unchanged; outside new navigation | `download.html#auto` |
| `cast-to-tv.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `cinema-mode.html` | Retained unchanged; outside new navigation | `features.html#library` |
| `compare/beebo-vs-service-a.html` | Retained unchanged; outside new navigation | `features.html` |
| `compare/beebo-vs-service-b.html` | Retained unchanged; outside new navigation | `features.html` |
| `compare/beebo-vs-service-c.html` | Retained unchanged; outside new navigation | `features.html` |
| `computer-voices-setup.html` | Retained unchanged; outside new navigation | `features.html` |
| `delete-account.html` | Restyled; exact legal content retained | `delete-account.html` |
| `design-lab/desktop-layouts.html` | Retained unchanged; outside new navigation | `index.html` |
| `direct-connection.html` | Retained unchanged; outside new navigation | `how-it-works.html#away` |
| `docs.html` | Retained unchanged; outside new navigation | `help.html` |
| `docs/away-from-home-options.html` | Retained unchanged; outside new navigation | `how-it-works.html#away` |
| `docs/backup-and-restore.html` | Retained unchanged; outside new navigation | `help.html` |
| `docs/campsite-mode.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `docs/connect-your-phone.html` | Retained unchanged; outside new navigation | `help.html#setup` |
| `docs/family-and-profiles.html` | Retained unchanged; outside new navigation | `help.html` |
| `docs/faq.html` | Retained unchanged; outside new navigation | `help.html#faq` |
| `docs/fix-connection-problems.html` | Retained unchanged; outside new navigation | `help.html#faq` |
| `docs/getting-started-windows.html` | Retained unchanged; outside new navigation | `help.html#setup` |
| `docs/interoperable-apps.html` | Retained unchanged; outside new navigation | `features.html#services` |
| `docs/karaoke-and-recordings.html` | Retained unchanged; outside new navigation | `testing.html` |
| `docs/phone-speakers.html` | Retained unchanged; outside new navigation | `testing.html` |
| `docs/playing-on-tvs.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `docs/privacy-in-plain-words.html` | Retained unchanged; existing legal-policy body link preserved | `how-it-works.html` |
| `docs/run-beebo-on-a-nas-or-linux-server.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `docs/skip-intros-and-credits.html` | Retained unchanged; outside new navigation | `testing.html` |
| `docs/sound-and-audio.html` | Retained unchanged; outside new navigation | `testing.html` |
| `docs/subtitles.html` | Retained unchanged; outside new navigation | `testing.html` |
| `docs/temporary-login.html` | Retained unchanged; outside new navigation | `help.html` |
| `docs/themes-and-appearance.html` | Retained unchanged; outside new navigation | `features.html#library` |
| `docs/trailers.html` | Retained unchanged; outside new navigation | `testing.html` |
| `docs/trip-journal.html` | Retained unchanged; outside new navigation | `features.html#journal` |
| `domain-sites/beeborelay.com/index.html` | Retained unchanged; outside new navigation | `how-it-works.html#away` |
| `domain-sites/beebospace.com/index.html` | Retained unchanged; outside new navigation | `about.html` |
| `domain-sites/beebovpn.com/index.html` | Retained unchanged; outside new navigation | `features.html#services` |
| `driving-safety.html` | Retained unchanged; outside new navigation | `download.html#auto` |
| `features/feature-android-phone-app-accessibility-choices-large-text-high-contrast-reduced-motion-talkback.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-android-tv-and-fire-tv-screens.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-audiobooks.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-away-from-home-direct-then-relay.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-beebo-auto-android-auto.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-campsite-games.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-campsite-host-start-and-stop.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-car-party-host-and-passengers.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-chromecast.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-collections-and-request-a-title.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-family-achievements-opt-in-milestones.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-family-dashboard-camp-jobs-and-star-chart.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-family-recipes-and-shopping-list.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-google-play-version.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-library-health.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-link-a-tv.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-music-on-the-phone-albums-songs-player-sleep-timer.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-opening-the-app-and-the-five-tabs.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-pack-for-a-trip-download-planner.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-packing-list-shared-between-phones.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-phone-help-show-your-screen-to-another-phone.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-photos-and-phone-backups-timeline-albums-viewer.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-playing-films-seeking-picture-in-picture.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-podcasts-and-radio.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-share-the-app-qr-over-the-hotspot.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-shared-photos-and-videos.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-stream-from-my-pc-old-button.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-surprise-me-playlists-watchlist-favourites.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-trip-journal-trips-recap-video-export.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-wake-my-pc.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-watch-together.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-android-phone-app-wireless-speakers.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-other-systems-linux-desktop-app.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-other-systems-linux-server-headless-docker.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-other-systems-macos-desktop.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-3d-characters-and-story-videos.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-beebo-play-hosted-game-servers.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-beebo-relay-fallback-connection.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-beebovpn.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-google-assistant-and-alexa.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-managed-hosting.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-online-games-play-with-others.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-our-own-servers-and-dns.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-password-reset-and-email-verification.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-portrait-party-turn-a-photo-into-a-card.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-rewards-ads-and-credit.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-trip-journal-link-away-from-home.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-walkie-talkie-from-anywhere.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-services-and-website-website-and-browser-games.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-converter-and-quality-speed-settings.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-home-layouts-and-customize-layout-desktop.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-installer-and-self-update.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-jellyfin-compatible-mode.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-keyboard-and-screen-reader-support.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-kitchen-announcements-messages-to-phones.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-languages-5-translated-with-machine-help-3-previews.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-library-player-and-web-player.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-library-sharing-with-another-household.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-live-tv-tuner-and-own-playlist.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-movie-night.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-music-on-the-pc-library-mixes-desktop-player.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-parental-controls-and-household-profiles.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-phone-speakers-phones-play-the-film-s-sound.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-picture-frame-photo-wall-for-a-tablet-or-tv.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-posters-and-info-tmdb.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-remote-desktop-see-and-control-the-pc.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-space-saver.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-story-studio.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-strong-volume-leveler.html` | Retained unchanged; outside new navigation | `testing.html` |
| `features/feature-windows-desktop-app-update-modes-and-start-with-windows.html` | Retained unchanged; outside new navigation | `testing.html` |
| `fire-tv-install.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `games.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `help.html` | Replaced with the new main page | `help.html` |
| `home-theater.html` | Retained unchanged; outside new navigation | `features.html#library` |
| `how-beebo-streams.html` | Retained unchanged; outside new navigation | `how-it-works.html` |
| `index.html` | Replaced with the new main page | `index.html` |
| `known-issues.html` | Retained unchanged; outside new navigation | `testing.html` |
| `legal-review.html` | Retained unchanged; outside new navigation | `terms.html` |
| `lg-install.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `library-sharing-terms.html` | Retained unchanged; outside new navigation | `terms.html` |
| `linux.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `local-first.html` | Retained unchanged; outside new navigation | `how-it-works.html` |
| `manage-users.html` | Retained unchanged; outside new navigation | `help.html` |
| `media-hub.html` | Retained unchanged; outside new navigation | `features.html#library` |
| `movie-night.html` | Retained unchanged; outside new navigation | `features.html#library` |
| `movie-privacy.html` | Restyled; exact legal content retained | `movie-privacy.html` |
| `music.html` | Retained unchanged; outside new navigation | `features.html#library` |
| `next-features.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `open-ports.html` | Retained unchanged; outside new navigation | `how-it-works.html#away` |
| `outdoors-kit.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `own-relay.html` | Retained unchanged; outside new navigation | `how-it-works.html#away` |
| `parental-controls.html` | Retained unchanged; outside new navigation | `help.html` |
| `phone-remote-control.html` | Retained unchanged; outside new navigation | `features.html` |
| `phone-speakers.html` | Retained unchanged; outside new navigation | `testing.html` |
| `photos.html` | Retained unchanged; outside new navigation | `features.html#library` |
| `platforms.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `play-games/checkers/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/chess/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/crazy-eights/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/dominoes/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/dots-and-boxes/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/drop-four/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/five-dice/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/go-fish/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/ludo/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/mancala/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/memory-match/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/nine-mens-morris/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/reversi/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/sea-battle/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/snakes-and-ladders/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/tic-tac-toe/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-games/war/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `play-testing-details.html` | Retained unchanged; outside new navigation | `testing.html` |
| `play/index.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `playlists.html` | Retained unchanged; outside new navigation | `features.html#library` |
| `portrait-party.html` | Retained unchanged; outside new navigation | `testing.html` |
| `posters-and-info.html` | Retained unchanged; outside new navigation | `features.html#library` |
| `privacy.html` | Existing policy redirect retained unchanged | `movie-privacy.html` |
| `progress-update.html` | Retained unchanged; outside new navigation | `testing.html` |
| `quality-and-subtitles.html` | Retained unchanged; outside new navigation | `testing.html` |
| `referrals.html` | Retained unchanged; outside new navigation | `features.html#services` |
| `relay-and-rewards.html` | Retained unchanged; outside new navigation | `features.html#services` |
| `release-evidence.html` | Retained unchanged; outside new navigation | `testing.html` |
| `release-history.html` | Retained unchanged; outside new navigation | `download.html` |
| `remote-desktop-test.html` | Retained unchanged; outside new navigation | `testing.html` |
| `roku-install.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `roku.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `samsung-lg-tv.html` | Retained unchanged; outside new navigation | `features.html#platforms` |
| `self-hosted-remote-viewing.html` | Retained unchanged; outside new navigation | `how-it-works.html#away` |
| `server-setup.html` | Retained unchanged; outside new navigation | `help.html#setup` |
| `story-writer.html` | Retained unchanged; outside new navigation | `features.html#campsite` |
| `stream-anywhere.html` | Retained unchanged; outside new navigation | `how-it-works.html#away` |
| `subscribe.html` | Retained unchanged; outside new navigation | `features.html#services` |
| `terms.html` | Restyled; exact legal content retained | `terms.html` |
| `test-builds.html` | Retained unchanged; outside new navigation | `download.html` |
| `tester-checklist.html` | Retained unchanged; outside new navigation | `help.html#report` |
| `tester-results.html` | Retained unchanged; outside new navigation | `testing.html` |
| `testing-evidence-2026-10-06.html` | Retained unchanged; outside new navigation | `testing.html` |
| `tmdb-key-guide.html` | Retained unchanged; outside new navigation | `help.html` |
| `tournaments.html` | Retained unchanged; outside new navigation | `features.html#services` |
| `try-layouts.html` | Retained unchanged; outside new navigation | `index.html` |
| `updates.html` | Retained unchanged; outside new navigation | `download.html` |
| `visual-tour.html` | Retained unchanged; outside new navigation | `features.html` |
| `watch-away-from-home.html` | Retained unchanged; outside new navigation | `how-it-works.html#away` |
| `watch-your-library.html` | Retained unchanged; outside new navigation | `how-it-works.html` |
| `what-beebo-can-do.html` | Retained unchanged; outside new navigation | `features.html` |
| `what-we-checked.html` | Retained unchanged; outside new navigation | `testing.html` |
| `what-we-offer.html` | Retained unchanged; outside new navigation | `features.html` |
| `whats-tested.html` | Retained unchanged; outside new navigation | `testing.html` |
| `will-beebo-work.html` | Retained unchanged; outside new navigation | `how-it-works.html#away` |
| `windows.html` | Retained unchanged; outside new navigation | `download.html#windows` |
