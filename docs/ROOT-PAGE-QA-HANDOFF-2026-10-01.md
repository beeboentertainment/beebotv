# Root-page QA handoff — October 1, 2026

## Scope

This branch addresses the **website root-page** findings in `docs/CODEX2-SITE-QA-REPORT-2026-10-01.md` and the specifically named `play/index.html` sign-in link. It does not rewrite pricing, terms, privacy-policy substance, or Campsite Mode. No files under `downloads/` or `desktop-version.json` were changed.

## Completed

- Added page-specific meta descriptions to `activated.html`, `referrals.html`, `privacy.html`, and `can-i-run-beebo.html`. The latter two remain noindexed redirects; their visible fallback content now has an `h1` for visitors whose browser does not follow the redirect.
- Corrected the `h1` to `h3` jump on `cast-to-tv.html` and `visual-tour.html` by using `h2` for guide sections, retaining their previous visual styling through `guide-visuals.css`. Added a broad visible `h2` before the feature catalogue cards in `what-beebo-can-do.html`.
- Added 13 indexable, public pages to `sitemap.xml`: `beebovpn.html`, `games.html`, `known-issues.html`, `next-features.html`, `portrait-party.html`, `referrals.html`, `relay-and-rewards.html`, `self-hosted-remote-viewing.html`, `subscribe.html`, `tester-checklist.html`, `tester-results.html`, `try-layouts.html`, and `watch-your-library.html`.
- The Beebo Play preview's `/account/sign-in` target returned HTTP 404 on both the website and account host when checked. `play/index.html` now points its two visible links and JS-configured link target to the existing phone sign-in guide, labels them as a guide, says game sign-in is not available yet, and is `noindex,follow` until the browser-game service is real.
- `docs/temporary-login.html` is `noindex,follow` pending product verification. `tournaments.html` is temporarily `noindex,follow` because its current prize/account-credit wording remains unreviewed; Claude has a separate approved rewrite. Restore indexing only after that copy is corrected and reviewed.

## Deliberate sitemap exclusions

`/` already represents `index.html`; `404.html`, `activated.html`, `can-i-run-beebo.html`, `privacy.html`, and `remote-desktop-test.html` were already noindex or redirects. `delete-account.html` was already noindex and was left that way rather than silently changing policy discoverability; Claude/Nick should review that choice. `play/index.html`, `docs/temporary-login.html`, and `tournaments.html` are excluded for the reasons above. No other root `.html` page is missing from the revised sitemap.

## Verification and limits

Static checks: XML parsed, 90 sitemap URLs, zero duplicates, zero missing local target files; all four named metadata pages now have descriptions; all three named heading sequences start `h1` then `h2`; `git diff --check` passed. The two previously configured sign-in URLs returned HTTP 404. No live browser, screen-reader, mobile device, pricing/legal review, merge, push, or deployment was performed. `play/play.js` still contains an unused `/account/sign-in` fallback string, but this page supplies the corrected `data-sign-in-url`; Claude can remove that fallback when integrating the actual web-games sign-in route.
