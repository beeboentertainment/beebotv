# Beebo visual audit and Claude handoff — October 1, 2026

## Completed by Codex

### Public feature-status page

The dark public theme was overriding page-level roadmap badge colours. The resulting labels were pale `rgb(243, 242, 236)` text on pale state fills at 10.88 px, making **Available now**, **Beta / testing**, **In development**, and **Planned** effectively unreadable.

`corporate-supporting-dark.css` now provides a scoped dark treatment for the three page states:

- Available / healthy: dark green with mint text
- Beta and in development: dark amber with warm cream text
- Planned / informational: dark navy with pale blue text

The labels now render at 12 px with a 1.25 line-height. This selector wins over the shared paragraph-colour rule that caused the issue, while leaving light-theme page styling unchanged.

### Responsive observation

The currently live `next-features.html` was checked at 390 × 844. Its cards reflow to a single 339 px column, no document-level horizontal overflow was present, and every status label stayed within the viewport. The live URL still has the old CSS until the changed stylesheet is deployed.

### Desktop visual direction

- Specification: `docs/CODEX-DESKTOP-CONTROL-ROOM-VISUAL-DIRECTION-2026-10-01.md`
- Reference concept: `assets/concepts/beebo-control-room-desktop-concept-2026-10-01.png`
- Working prototype: `design-lab/desktop-layouts.html`

The Control Room is a genuinely new desktop direction, not a colour pass: a fixed library rail frames a grid-based working canvas with movable, resizable Now Playing, shelf, queue, connection, and household panels. The specification includes collision-safe snap rules, keyboard alternatives, minimum panel sizes, reduced-motion behaviour, and test acceptance criteria.

`design-lab/desktop-layouts.html` now makes the three supplied visual directions tangible: **Control Room**, **Library Table**, and **Wayfinder** can be switched in place. Its Arrange mode uses bounded 12-column grid coordinates, rejects overlaps, supports safe resize controls, saves per-direction placement locally, and restores each direction's default arrangement. Full desktop and 390 px phone-width checks found no default panel overflow or horizontal clipping.

## Claude implementation order

1. Include the `corporate-supporting-dark.css` change in the next website build and verify the four roadmap labels at normal zoom and 200% zoom on a dark-system browser.
2. Run a desktop and phone visual check of `/next-features.html` after deployment. Confirm the badge colours appear as dark green, amber, and navy—not pale fills.
3. Treat the Control Room document as the visual specification for the next desktop-home layout work. Implement panel movement as persisted grid coordinates with collision validation, not with absolute screen positions.
4. Start from the verified local design lab rather than reproducing the concept art by eye. Its three themes and safe layout behaviour are an interaction reference, not production code to copy wholesale.
5. Return one integrated desktop build with 1280 × 800 and 1024 × 768 captures plus a keyboard panel-move capture for Codex visual review.

## Non-goals

- This handoff does not claim a public release, deploy a site, change product availability, or alter legal/pricing text.
- The concept image is a visual-composition reference only; it is not a literal implementation screen or a claim that the illustrated media exists in Beebo.
