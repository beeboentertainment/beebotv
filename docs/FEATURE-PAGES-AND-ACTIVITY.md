# Feature pages and activity checkpoints

The feature list links to 70 customer pages under `features/`. Scores, status labels,
checkmarks and issue counts come from `testing-status.json`. Generating feature pages
does not change those marks. The separate dated percentage audit corrects evidence
wording and review timestamps while preserving every score and checkmark. Download
feeds, pricing and legal wording are unchanged.
The feature directory pins the existing evidence anchors, so future renaming needs
an explicit directory update without changing an established ID.

Each page has a customer explanation, the same visible progress as its card, related
help, remaining-check categories and collapsed technical context. Campsite hosting
has a scoped walkthrough and specific requirements/limits. Other pages link to
existing guides; those links do not claim a new feature-specific walkthrough.
Qualified planned, in-development and retired statuses do not offer current-use
instructions. The primary evidence record controls status if another guide differs.
For example, the Campsite host remains Beta, 90%, with two recorded open issues.

Empty galleries deliberately say **Screenshots coming soon**. Real images can be
added to the directory with `image`, `caption`, `alt`, `order`, `platform`, `build`
and `capturedAt`. The generator requires an existing local image and metadata.
No app screenshot or device acceptance was created by generating these pages.

## Activity is separate from readiness

The current activity feed is `site-data/feature-activity.json`. Its initial empty
record list means unknown activity for every feature. It is intentionally not a
synthetic demonstration of ongoing work. Historical activity and test counts stay
in the existing dated snapshot, behind an earlier-activity disclosure.

Only a fresh `running` record produces a green pulse. Waiting, blocked and completed
work steps have text labels without a pulse. Completion describes a work step, not
final feature acceptance. Reduced motion produces a static indicator. Every shown
confirmation includes a calendar date, Eastern time and GMT offset.

Feed and per-feature revisions are positive increasing integers. A given revision
is immutable; removing a row requires a new feed revision. Reintroducing a removed
or expired row requires a new feature revision to become active. Use a new feed
revision for every changed snapshot, including removals. Confirmation timestamps
are actual checkpoints, never build or publication times. Each record expires
within at most one hour of its update; publishers should choose the shorter period
appropriate to the confirmed task. Duplicates cannot extend this period.

The client keeps elapsed-time deadlines and expired revisions for the page lifetime.
It notices expiry and wall-clock jumps within a one-second visible-page timer.
Hidden pages make no requests and recheck on return. Offline, timeout or malformed
responses neutralize activity; the last confirmed next action remains labelled with
its old confirmation date. An older response cannot overwrite a newer revision.

## Checkpoint export and publication

`tools/export-feature-activity.mjs` reads a private coordinator packet from stdin and
prints only the public allowlist. Never place that private packet in this website
repository. Its root fields are `revision`, `updatedAt`, and `records`.

Each record has these public fields:

- `featureId`, `revision`, `state`, `stage`, `scope`, `deviceClass`
- `startedAt` (null when no actual start is known), `updatedAt`, `expiresAt`
- `nextAction` (one of the fixed customer-safe action codes)

Each also has private `source` attestation: matching `featureId`/`confirmedAt`, full
source `sha`, `taskId`, private issue-comment `evidence`, `verified: true`, and an
actual checkpoint `kind`. Running accepts START or PROGRESS; assignment or artifact
delivery is insufficient. Device running additionally requires
`exclusiveQaOwnerConfirmed: true`, `qaOwner`, and `action: testing-started`.

The exporter validates the packet and field binding. It does **not** contact the
private board or independently prove the truth of an attestation. The coordinator
must inspect the actual owner's receipt first. No private prose, URL, task identity,
hash, account, serial, media title or free-form next action is copied into public
output. Public prose comes from fixed enums in the activity client.

Run the exporter with the packet on stdin and review its output before handing it
to the authorized publisher. Preserve the previous public feed revision when
preparing the next packet. Publication remains a separate step; neither the exporter
nor page build deploys anything. There is no LLM heartbeat or new agent monitor.

The existing site hosting serves static files. This implementation checks one
same-origin JSON URL on initial load, then at most once per five minutes per visible
tab. Conditional cache revalidation uses `cache: no-cache`, no cache-busting query
and no credentials. Failures back off to 10, 20 and 30 minutes; switching tabs does
not bypass that deadline. There is one request in flight, with a ten-second timeout.
Expiry needs no network call. Response text is limited to 256 KiB after retrieval.

Batch meaningful verified changes into the existing publisher's next approved site
update. A static-host publication may rebuild the site even for one changed JSON
file; this change does not install a separately writable live endpoint, promise
instant updates or claim a measured monetary cost. Browser request counts and
hosting build duration must not be confused with model usage or billing.

## Rebuild and verify

1. `node tools/build-feature-pages.mjs`
2. `node tools/build-status-page.mjs`
3. Run each focused test file separately, or use `npm test` for serial files.
4. `npm run check:evidence`

`build-status-page` is deterministic and may maintain the existing responsive
markup of related evidence pages. Inspect the resulting file list before committing.
Generator tooling and tests are tracked explicitly despite their directory ignore
rules; carry them with the branch. Browser layout, actual cache revalidation on the
host and assistive-technology acceptance remain distinct from jsdom behavior tests.
# Percentage audit

`site-data/readiness-audit.json` records one outcome for every feature, separate from the activity feed. Its timestamp describes a review of dated evidence, not a new device test. Each outcome names the retained or revised mark, the evidence dates and the scope still unproved. Missing provenance is explicitly marked `evidence-gap`; it is not silently treated as a pass or a new failure.

The November 2 review examined all 70 rows and retained their percentages and checkmarks. Seven provenance gaps remain named in the public record. Existing owner acceptances remain limited to their original feature and tested subset; the review adds no new 100% mark.

The same-day follow-up reconciles all 23 rows citing November 2. Seek failures and inconclusive checks remain beside the passes, with public tester68 separated from unpublished tester69. Known issue counts rise from four to five for the distinct seek snap-back and from zero to two for separate VPN source-validation and renderer feedback/state-display issue families; the existing 90% and 55% caps keep both percentages unchanged. Inconclusive operator selections and unlocalized failures are not counted as additional proven defects.

When regenerating the evidence page, run `site-data/build-scoreboard.js` before the final `tools/build-status-page.mjs` pass. The latter normalizes the page's line endings. Run every publication checker afterward, including the footer checker from the maintained local tooling. A checker pass is separate from the required phone-width and desktop-width visual look.

The VPN renderer follow-up retains its original behavioral failures and the first repair result of 17 passes and one failure. A later narrow follow-up passed all 18 checks, while broader callback and connection-display review findings remain open. Failed assertions are not counted as separate product issues. Both VPN families remain source-level findings without repaired installed-artifact or native-tunnel acceptance.
