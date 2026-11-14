# Beebo: a smaller, quieter website

Plan written before implementation, November 14, 2026.

## Scope and starting point

This is a review candidate on `codex/new-site-astra-20261114`, based on website main `8dce4c66d0ba94ee01ec9b727f40a34f22406ef0`. The remote main and local base matched at the initial read. No deployment, pull request, app changes or release changes are part of this work.

The starting website has 210 tracked HTML files, including generated feature pages, guides, games and experiments. The new visitor journey will have seven main pages and three legal pages. Every old HTML path stays present. Unused pages remain unlinked in this first pass; a complete path-by-path inventory belongs in NEW-SITE-NOTES.md.

## Sitemap and content

| Page | Visitor question | Content and sources |
| --- | --- | --- |
| `index.html` | What is Beebo, and is it for me? | A free Windows media server, Android and browser players, own files, home computer stays on. Short introduction, three uses, three setup steps, download action. Existing About, setup, Features and owner brief. |
| `download.html` | What can I install today? | Windows, Android and Beebo Auto; versions, build numbers, bytes, SHA-256 and publication times taken directly from unchanged JSON feeds. Clear sideload and device-testing limits. Brief current-release notes from release history. |
| `features.html` | What can I do with it? | Library, away viewing, Campsite Mode, Trip Journal, Auto; concise complete platform/service status table using the owner's current labels. No shopping journey. Source: existing feature pages, what-we-offer data, owner brief. |
| `how-it-works.html` | Where are my files and what connects to what? | Three simple setup steps; home PC to player diagram; direct connection and optional Beta relay explained; required verbatim privacy sentence, with link to the unchanged policy. |
| `testing.html` | What has actually been checked? | Live reading of the existing testing JSON, feature evidence, dates and recorded limitations, searchable without inflated completion claims. Explicit distinction between the older evidence snapshot and newer downloadable builds. No private source hashes or raw internal prose dumped into the page. |
| `help.html` | How do I get started or solve a problem? | Short setup guide and expandable FAQ: computer stays on, local connection, sideload, offline preparation, unsupported platforms, reporting an issue. No exposed contact addresses, credentials or QR values. |
| `about.html` | Who makes this? | Made by a family man, not a data company; the real rabbit behind the name; simple values and an 18+ statement. Source: current About and owner brief. |
| `movie-privacy.html`, `terms.html`, `delete-account.html` | What are the legal terms and controls? | Retain exact existing legal content and deletion form/behavior; replace only surrounding presentation, fonts, navigation and voice assets. `privacy.html` remains the existing policy alias. |

Navigation: Features, How it works, Testing, Help and Download. About and the three legal pages live in the footer. No announcement stacks, mega-menus, narration, prices or repeated feature catalogues.

## Visual direction

Warm paper, ink-green text and a restrained sunny accent in light mode; deep green, warm white and the same accent in dark mode. Strong editorial type, generous space and thin rules. System fonts only. A small rabbit brand mark gives the site personality without making it a children's product. A large clear headline explains the product; lower sections explain distinct uses rather than repeating the pitch.

Use existing original brand artwork (`assets/beebo-badge-192.png`, `assets/beebo-badge-512.png`). Use the documented actual Galaxy S24 Ultra Campsite capture (`assets/guide-screenshots/campsite-start-real-2026-10-01.png`) with its October 1, 2026 date and historical-screen caption. An older real app screen (`assets/screens/app-surf.jpg`) may be used only with an explicit older-screen caption. No current desktop screenshot was verified. Existing generated lifestyle scenes, concepts, QR images and captures with retired game names will not be used.

Mobile navigation works without JavaScript. Respect system theme, allow a local theme choice, support reduced motion, visible keyboard focus and a skip link. Semantic headings, text labels, readable contrast, informative image captions and sensible touch targets. No framework, remote fonts, third-party CDN, analytics or tracker.

## Data and preservation

- Keep every byte under `downloads/`, root `desktop-version.json`, every `*-build.json`, `CNAME`, `robots.txt` and `sitemap.xml` unchanged. Keep `llms.txt` at its current path and update its text to the new pages and feed versions.
- Keep testing-status and site-data evidence unchanged. The November 14, 4:04 AM Eastern snapshot names Windows 0.1.119 and Android 1.62, earlier than current downloads. Its old platform labels are not current release availability.
- Use the owner's authoritative current status table. Beebo Auto is Available as a sideload and has never been tested in a real car. Linux and Docker/NAS are Beta with no download offered. Optional services are not purchasable.
- Required explanatory sentence: “video is end-to-end encrypted and the relay cannot see it; connection records (including IP addresses) are kept 7 days for abuse handling; nothing is sold.” This supplements, and does not rewrite, the legal policy.
- Preserve exact legal text and deletion behavior, including existing legal wording that this task does not authorize us to change.
- Do not display private source references from release feeds. Download details are read from dedicated public fields; notes are curated from the existing public release history.

## Verification and handoff

All five requested legacy checks passed on the untouched base. Run them again after implementation. Preserve the checks; document any failure caused solely by replacing their old presentation targets. Specifically the what-we-offer generator owns old Home and llms markers, so its old output cannot be treated as the new design.

Use a temporary local static server owned by the verification command and a headless browser; stop both when verification ends. No shared desktop or mouse interaction is needed. Check all ten pages at 390 and 1280 pixels, both themes, keyboard access, theme/menu/FAQ/evidence interactions, local destinations and resource failures. Never submit the account deletion form. Check new content for banned wording, addresses and accidental private data. Compare protected files and exact legal content to the base. Run applicable existing automated tests.

Commit the plan first, then implementation and validation in reviewable steps. Push only the assigned branch, without force. Finish with the requested full-SHA receipt and candid verification limits. This is source for Nick and OPS49 to review, not a published website.
