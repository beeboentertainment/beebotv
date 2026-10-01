# Website wording polish — in progress

Branch: `codex/site-copy-polish-2026-10-01`, based on beebotv main `d962a83`. Website HTML copy only. No push, merge, deploy, installer-feed change or app-code change.

## Reviewed and committed so far

- `index.html`: benefit-led title and description, consistent Campsite Mode name, honest distinction between a tested two-phone guest join and still-untested shared media/games, visible Feature status link.
- `docs/campsite-mode.html`: clearer benefit-first introduction, consistent name, simpler Beta badges, visible Feature status link; preserved real-phone evidence and all test caveats.
- `platforms.html`: shorter title, description and introduction, consistent name and Feature status link. Device-status table was not reclassified without fresh build evidence.
- `docs/faq.html`: shorter title/introduction, benefit-first Beebo explanation and corresponding structured data, adult-controls question instead of a child-safety promise, Feature status link. FAQ JSON-LD still parses.
- `app-on-your-phone.html`: shorter title and description, benefit-first opening, and the Android Test download / Google Play limit stated up front. The detailed setup steps were not changed.
- `index.html`: the Campsite Mode spotlight no longer promises unverified shared-media or game paths; the session example uses the consistent feature name.
- `next-features.html`: clearer title, description and benefit-first introduction to the Available, Beta, In development and Planned sections. Individual feature status classifications were not changed.
- `camp-stories.html`: clearer concept-first opening and consistent Campsite Mode name, while keeping the generated-image and untested-audio disclosures.
- `known-issues.html`, `tester-checklist.html`, `tester-results.html`: descriptive public-page titles and search descriptions. Issue/test data and reporting behavior were not changed.

The tracked public-page inventory contains 98 HTML pages, excluding scratch templates and domain-site copies. All 98 already had a download link by the current audit pattern, but only the homepage linked to `next-features.html` before this work. A separate mechanical pass now adds a visible **Feature status** link to the shared desktop and mobile header on every tracked public HTML page, and normalizes the header label to **Campsite Mode**. All 98 now have both links by the current audit pattern. Individual copy review still remains open; this is not a whole-site sign-off.

## Unclear claims left unchanged for Claude/Nick

- Homepage relay introductory month, free fallback, prices and rewards copy needs product approval; it was not rewritten.
- `platforms.html` says “any web browser” and lists Android TV/casting as Available despite narrower real-device test notes. Device and build evidence must decide whether to narrow that language.
- `docs/faq.html` contains planned relay prices, direct/UPnP access claims, and older build-specific statements. It also says specific parental controls are enforced by the PC. Those statements were left intact pending technical review.
- `docs/campsite-mode.html` describes simulated phone-speaker synchronization and prepared-video paths. The Beta labels and real-device caveats remain; do not present those paths as verified on the September 30 host/guest test.
- `story-writer.html` currently describes 17 premade stories in Android 1.11 and Windows 0.1.27. The public site has no page literally named Story Studio. Confirm current feature/version scope before renaming or revising that guide.
- `app-on-your-phone.html` still says the browser install works on iPhone/iPad and uses absolute-sounding family-address and away-from-home language farther down the page. Those instructions need live compatibility and network review before stronger wording changes.
- `next-features.html` calls Story Mode available, while other public copy refers to Story Studio; the feature name and availability need confirmation before renaming the status card.
- `help.html` still advertises a lifetime streaming pass for testers and older September 26 build numbers. Reward approval and current-build evidence are needed before that page is rewritten.

## Verification so far

`git diff --check` passed before each commit. The FAQ and Campsite JSON-LD blocks parse. A local Chrome check at desktop and phone widths found both links on the homepage, Campsite guide, and story guide with no page-width overflow; it is not a whole-site visual regression test. No real-device or live-site test has been claimed. More individual page copy reviews remain open.
