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

The owner's brief controls current availability labels. In particular, Beebo Auto is Available as a sideload and **has never been tested in a real car**. Some retained historical prose mentions an earlier parked look; it is not used to support a current car-test claim. Linux and Docker/NAS remain Beta with no download offered. Optional Relay, VPN, paid plans, hosting and rewards are not purchasable. Existing evidence values and records are not altered to fit the new presentation.

## Legacy checks and validation

All five requested checks passed on the untouched base:

- `node tools/build-status-page.mjs --check`
- `node site-data/check-progress-score.js`
- `node scripts/check-evidence-tiers.cjs`
- `node site-data/build-what-we-offer.js --check`
- `node tools/build-feature-pages.mjs --check`

The existing check implementations remain unchanged. The old what-we-offer generator also owns presentation blocks in `index.html` and `llms.txt`. Those legacy markers were removed when replacing the two documents, so its old-presentation guard fails. The retained `what-we-offer.html` page and source data remain unchanged. Final command outcomes and verification boundaries follow.

### Final verification

Source implementation: `d836e1ebb6c766c114a5294679b6ab425b368d3e`. Later commits add review documentation only.

| Requested command | Result | Meaning |
| --- | --- | --- |
| `node tools/build-status-page.mjs --check` | PASS | Retained evidence presentation matches unchanged data. |
| `node site-data/check-progress-score.js` | PASS | All 70 source records follow the existing scoring rule. |
| `node scripts/check-evidence-tiers.cjs` | Legacy Home mismatch | Stops at `home callout counts: Windows app` (line 199). It requires the removed homepage percentage callout. Data and retained evidence pages were not edited. |
| `node site-data/build-what-we-offer.js --check` | Legacy Home mismatch | `index.html: markers <!-- WWO:HOME:START --> / <!-- WWO:HOME:END --> not found`. The new Home and llms text intentionally replace that generator's old presentation. |
| `node tools/build-feature-pages.mjs --check` | PASS | All 70 retained generated detail pages match unchanged source evidence. |

`npm ci --ignore-scripts` completed before work because dependencies were absent. `npm test` completed with **54 passed, 2 failed**. Both failures are old-shell contract assertions in `scripts/site-checks.test.mjs` (lines 58 and 64): they require the previous banner/header/footer/assets and the fixed 210-page inventory. The replacement deliberately has a different shell and 215 HTML paths. Those tests and all generator/check implementations are left unchanged. There is no claim of a completely green legacy suite.

Browser verification used a temporary command-owned static server and **headless Chrome 157.0.8103.78**. The server and browser were closed after each run; no shared desktop or mouse was used. All ten redesigned pages were opened at **390 and 1280 pixels**, in **light and dark** appearance: **40 page/viewport/theme combinations passed**. After the final input-validation adjustment, the testing page was checked again in all four combinations. Results:

- No horizontal overflow, missing images, JavaScript page errors, failed resource requests or external network requests from these pages.
- **154 local link and fragment checks passed**, including all new pages, legal destinations, downloads and evidence links. Each local target returned HTTP 200. No installer or APK was executed.
- Automated WCAG A/AA checks reported **zero violations in all 40 combinations**, and zero in the four final testing-page checks. This is an automated accessibility result, not a complete manual assistive-technology audit.
- Keyboard skip link, persistent light/dark switch, mobile menu and Escape, FAQ expansion, three feed refreshes, feature search/filter and no-JavaScript navigation/download/evidence fallback passed.
- The account-deletion form was never submitted. No login, subscription, payment, app, phone, car or production-server action was performed.
- Visual inspection covered Home, Download, Features, How it works, Testing, Help, About and all three legal pages. Two initial layout overflows were corrected. Lazy images were explicitly loaded for screenshot verification.

Independent source review identified and corrected an outdated Auto no-emulator sentence, missing detailed test limits, and leaked internal scoring directions. The current page distinguishes the public Auto 1.22 (23) **Nov 13, 8:49 PM Eastern phone-emulator check: 19 passed, 0 failed, 6 not run**, from unverified real-car use. Trip Journal's narrow older pass is followed by its later partial export record, including the 1080p selection producing 720p and unverified final video/audio.

Six meaningful evidence-renderer regression tests pass. The earlier implementation demonstrably failed the Trip Journal scope assertions. Download refresh/error validation passed **18 assertions** across current-feed, offline, malformed-value, unexpected-host and successor-feed cases. Additional probes reproduced and closed privacy and presentation gaps: the real data renders, while contact-like feature names, group names and evidence timestamps are rejected; source identifiers joined to surrounding text are omitted; and old editorial scoring instructions are excluded. Evidence prose is escaped and private references are omitted without discarding the whole explanation. The final testing page was rechecked in all four browser combinations after these corrections.

Final fresh-copy scans found no `kid-safe`, `100%`, narration name, dollar amount, price wording, private network address, email address or `2099` in the seven main pages. The unchanged legal passages retain the exceptions described above. `git diff --check` passes. All 11 protected files and all testing/site-data source files remain unchanged against the base; all 210 original HTML paths and 30 original Home fragment IDs remain present.

Two independent final source reviews cleared the corrected implementation at `d836e1ebb6c766c114a5294679b6ab425b368d3e`: one verified preservation and the editorial-text correction, and the other independently verified evidence scope, identifier redaction, safe labels and retained failures. Their clearance is limited to source/DOM review. They did not claim to have independently repeated the browser run or accepted an installed app or release.

### Review limits and release-tool follow-up

This branch is ready for design/source review, not a publication receipt. No PR was opened, no deployment was made, no GitHub settings were changed, and no push to main was made. Safari, Firefox, physical-phone layouts and a complete screen-reader audit were not run. Existing legacy pages were preserved rather than audited or rewritten; their old wording and old asset behavior remain outside the new visitor navigation.

Before adopting the replacement for publication, the website owner should migrate the old Home/llms generators and canonical-shell contract to the new presentation. Running old writing generators can fail on removed markers or restore the old shell. This task keeps those checks intact rather than weakening them. The saved sitemap and old release-history pages also remain unchanged as requested. Legal inconsistencies, including the retained external-font statement and historical contact/billing text, were not rewritten.

Local QA scripts, raw receipts and screenshots are in the ignored `site-check/` folder; they are not part of the public branch. These review notes record the results without publishing local tooling or private source history.

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
