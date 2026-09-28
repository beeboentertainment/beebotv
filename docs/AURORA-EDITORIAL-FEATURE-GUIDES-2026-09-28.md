# Aurora Editorial feature-guide migration — 2026-09-28

## Scope

Branch: `codex/aurora-remaining-pages`

This batch moves six structurally identical plain-language feature guides onto
the existing shared `data-aurora` system:

- `media-hub.html`
- `beebo-space-saver.html`
- `car-companion.html`
- `driving-safety.html`
- `local-first.html`
- `stream-anywhere.html`

The page bodies, links, pricing text, legal text and status-label wording are
unchanged. The change is limited to the visual document head and shared CSS.

## What changed

`aurora-editorial.css` now provides a scoped adapter for the existing guide
markup (`.wrap`, `.page-hero`, `.feature`, `.callout`, `.apps` and image
surfaces). It maps the older structural stylesheet's variables to Aurora roles,
so the guide pages retain their responsive layout while receiving the shared
canvas, typography, card, callout, focus and control treatments.

Each migrated page opts in with `data-aurora`, uses the shared stylesheet and
sets its browser theme color to the Aurora canvas. The redundant per-page
presentation stack was removed from this batch:

- Google font requests that Aurora does not use
- `refresh.css`
- `corporate-supporting-dark.css`
- `rectangular-buttons.css`

`site.css`, guide behavior and the shared shell remain because they provide
structure or behavior rather than the duplicated visual layer.

## Verification

- A static migration check passed for all six pages: each has the Aurora opt-in
  and stylesheet, none retains the removed presentation references, and every
  page body is byte-for-byte unchanged after normalizing repository line
  endings.
- `git diff --check` passed with the repository's CRLF-aware setting.
- The local browser surface refuses `file:` pages and its security policy
  prohibits a local-server workaround, so a reviewer should complete a normal
  desktop and narrow-phone visual check before merge.

## Remaining migration work

This is one coherent guide-page batch, not a claim that the remaining website
is done. The other page families still need to be grouped by shared markup,
migrated one family at a time, and visually checked before their legacy visual
layers are removed.

No branch was pushed, merged or deployed.
