# Website wording polish — in progress

Branch: `codex/site-copy-polish-2026-10-01`, based on beebotv main `d962a83`. Website HTML copy only. No push, merge, deploy, installer-feed change or app-code change.

## Reviewed and committed so far

- `index.html`: benefit-led title and description, consistent Campsite Mode name, honest distinction between a tested two-phone guest join and still-untested shared media/games, visible Feature status link.
- `docs/campsite-mode.html`: clearer benefit-first introduction, consistent name, simpler Beta badges, visible Feature status link; preserved real-phone evidence and all test caveats.
- `platforms.html`: shorter title, description and introduction, consistent name and Feature status link. Device-status table was not reclassified without fresh build evidence.
- `docs/faq.html`: shorter title/introduction, benefit-first Beebo explanation and corresponding structured data, adult-controls question instead of a child-safety promise, Feature status link. FAQ JSON-LD still parses.

The tracked public-page inventory contains 98 HTML pages, excluding scratch templates and domain-site copies. All 98 already had a download link by the current audit pattern, but only the homepage linked to `next-features.html` before this work. The remaining pages still need individual copy review and a visible Feature status link. This is a partial handoff, not a whole-site sign-off.

## Unclear claims left unchanged for Claude/Nick

- Homepage relay introductory month, free fallback, prices and rewards copy needs product approval; it was not rewritten.
- `platforms.html` says “any web browser” and lists Android TV/casting as Available despite narrower real-device test notes. Device and build evidence must decide whether to narrow that language.
- `docs/faq.html` contains planned relay prices, direct/UPnP access claims, and older build-specific statements. It also says specific parental controls are enforced by the PC. Those statements were left intact pending technical review.
- `docs/campsite-mode.html` describes simulated phone-speaker synchronization and prepared-video paths. The Beta labels and real-device caveats remain; do not present those paths as verified on the September 30 host/guest test.
- `story-writer.html` currently describes 17 premade stories in Android 1.11 and Windows 0.1.27. The public site has no page literally named Story Studio. Confirm current feature/version scope before renaming or revising that guide.

## Verification so far

`git diff --check` passed before each commit. The FAQ and Campsite JSON-LD blocks parse. No layout, visual, real-device or live-site test has been claimed for these copy-only commits. More pages and the site-wide link audit remain open.
