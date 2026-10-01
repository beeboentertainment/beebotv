# Site QA report — October 1, 2026

Scope: a static audit of 101 public HTML pages in the current `beebotv` main tree. This is not a live-browser, real-device or external-link test. `downloads/`, `desktop-version.json`, `.codex/`, `.claude/` and `_scratch/` were not changed.

## Checks that passed in the static audit

- All scanned pages have a local Downloads link.
- All general-site pages have a Feature status link. The three separate domain-site landing pages do not; see the findings below.
- No scanned `img` tag is missing an `alt` attribute.
- No broken local fragment link was found.
- Every embedded JSON-LD block parsed as JSON.
- Every URL in `sitemap.xml` points to a file in this checkout.

## Findings for Claude / the other Codex account

| Priority | Page and line | Finding | Proposed fix |
| --- | --- | --- | --- |
| High | `docs/campsite-mode.html:195` | The excluded Campsite guide describes Watch Together as built and reachable, while `next-features.html` calls Watch Together **In development** and says the service is switched off. | Owner/Claude should rewrite this as an in-development, unavailable feature or confirm a release-state change. This report does not alter the excluded file. |
| Medium | `activated.html:1`, `referrals.html:1`, `privacy.html:1`, `can-i-run-beebo.html:1` | These root pages have no meta description. | Add an accurate, page-specific meta description. |
| Medium | `can-i-run-beebo.html:58`, `privacy.html:17` | No `h1` was found. | Add one clear, visible `h1` before subordinate headings. |
| Medium | `cast-to-tv.html:58`, `visual-tour.html:8`, `what-beebo-can-do.html:17` | Heading levels jump from `h1` directly to `h3`. | Change the first subordinate section to `h2`, preserving its visual styling if necessary. |
| Medium | `sitemap.xml` | 23 public HTML paths are absent from the sitemap: `activated.html`, `beebovpn.html`, `can-i-run-beebo.html`, `delete-account.html`, `games.html`, `known-issues.html`, `next-features.html`, `portrait-party.html`, `privacy.html`, `referrals.html`, `relay-and-rewards.html`, `remote-desktop-test.html`, `self-hosted-remote-viewing.html`, `subscribe.html`, `tester-checklist.html`, `tester-results.html`, `tournaments.html`, `try-layouts.html`, `watch-your-library.html`, `docs/temporary-login.html`, and `play/index.html` (plus `404.html` and `index.html`, which may be intentionally represented by `/`). | Decide which public pages should be indexed, add those URLs to the sitemap, and explicitly `noindex` private/test-only paths. |
| Low | `domain-sites/beeborelay.com/index.html`, `domain-sites/beebospace.com/index.html`, `domain-sites/beebovpn.com/index.html` | These separate-domain landing pages do not link to the main Feature status page. | Add a Feature status link if those sites are intended to share the main Beebo navigation. |
| Needs owner decision | `docs/away-from-home-options.html:124,135-137,145` | The guide contains current and planned price statements. | Leave the wording untouched until Nick approves price copy. |
| Needs product verification | `docs/temporary-login.html:3-6` | The guide describes a future tester update, account-server update and temporary-login behavior. | Confirm the exact test-build availability before public release; no wording was changed beyond its heading. |

## Docs changed in this branch

- `docs/temporary-login.html`: changed the question-form heading to the clearer `Set up your temporary Beebo login`. No account-flow wording changed.

## What remains unverified

- External links, actual HTTP 404 responses, screen-reader behavior, mobile rendering and live deployment were not tested in this static pass.
- The issue above in the excluded Campsite guide is recorded only; it was not edited under the requested file boundary.
