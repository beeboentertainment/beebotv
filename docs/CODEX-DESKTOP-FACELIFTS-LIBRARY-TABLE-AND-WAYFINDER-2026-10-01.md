# Two distinct Beebo desktop facelifts

**Visual owner:** Codex
**Implementation owner:** Claude
**Status:** concept references and build specifications; neither is a release claim.

These directions deliberately avoid the Control Room's dark fixed-rail command-centre approach. They must remain separate themes rather than becoming palette variants of the same screen.

---

## 1. Library Table

**Reference:** `assets/concepts/beebo-library-table-desktop-concept-2026-10-01.png`

### Character

An editorial reading room for a household collection: warm ivory canvas, ink-charcoal reading text, moss-green navigation cues, restrained oxblood primary actions, thin sepia rules, and near-flat surfaces. It is quiet and tactile, built for browsing rather than monitoring.

### Layout

```
Beebo / Home / Browse / My shelves / Collections / Search
─────────────────────────────────────────────────────────
Tonight's pick — large landscape card     Details column
─────────────────────────────────────────────────────────
Continue watching                          From your shelves
three medium cards                         four compact cards
```

- Use a 12-column page grid with a fixed 72 px top bar; there is no permanent side rail.
- The feature card takes 8 columns and the Details column takes 4. On narrower windows the Details column moves directly below the feature card.
- Below 960 px, Continue watching and From your shelves each become their own full-width shelf. At phone width, retain the top menu through an accessible Menu button rather than shrinking the reading type.
- Cards remain rectangular with a 1 px rule; use a 2–4 px corner radius at most. Do not introduce floating pills, soft glass, or dashboard shadows.

### Interaction and accessibility

- Feature card contains one dominant **Play/Continue** action. Detail links and shelf actions remain visible text links, not art-only hotspots.
- A card is movable only in an explicit owner-enabled “Arrange shelves” mode. In that mode use discrete 4-column shelf slots, keyboard move controls, and a visible Reset shelves action.
- Text uses a readable sans body face (16 px minimum) with optional serif display faces only for titles. All essential labels remain sans serif.
- Oxblood buttons use warm-ivory text and must pass 4.5:1 contrast. Moss is a navigation signifier, never the only selected-state cue.

### Claude acceptance check

At 1280 × 800, the feature, details and both lower shelves are visible without browser/app horizontal scrolling. At 1024 px, no title is clipped and the Details content reflows under the feature. Keyboard focus moves left-to-right through the top navigation, feature action, details, and shelf cards in visual order.

---

## 2. Wayfinder

**Reference:** `assets/concepts/beebo-wayfinder-desktop-concept-2026-10-01.png`

### Character

A bright, graphic household wayfinding board. Mineral blue provides a full canvas; crisp off-white panels, strong cobalt type, deep-teal utility states, and a single coral-orange action give it immediate clarity. It is optimistic and compositional, rather than editorial or technical.

### Layout

```
Beebo / Search / Library tools
─────────────────────────────────────────────────────────
WHAT NEXT  ·  [six recent media thumbnails]  →
─────────────────────────────────────────────────────────
Pick up where you left off   Tonight with   Downloads ready
wide 6-column panel          3 columns     3 columns
─────────────────────────────────────────────────────────
Flexible small media mosaic (2 × 2 column-aligned tiles)
```

- Use a 12-column mosaic with 16 px gutters. The default top ribbon is full width; it never scrolls automatically.
- Each modular tile occupies 2, 3, 4, or 6 columns. Tile dimensions snap to this set in Arrange mode; collisions push only within the current row, with no free-form overlap.
- At 1024 px, the wide panel becomes 7 columns and the two utility tiles stack in the remaining 5. At 760 px, show the wide panel first, then each utility tile; the media mosaic becomes a two-column grid.
- Do not copy the Library Table hierarchy into this screen. Wayfinder uses a current-choice ribbon and visual blocks, not shelves and a Details column.

### Interaction and accessibility

- The What next ribbon has visible previous/next buttons, never hidden horizontal swipe as the only control. Each thumbnail names its title in an accessible label.
- Coral is reserved for a primary progress action such as **Continue**. Cobalt and teal are semantic structure, not success/error-only colour codes.
- Give each movable tile a labelled Move control and keyboard grid coordinates. Announce a completed move, rejected position, and Reset action to assistive technology.
- Ensure text over image panels has an opaque or near-opaque backing surface; do not place cobalt or white title text directly on arbitrary cover art.

### Claude acceptance check

At 1280 × 800, the top ribbon, three major tiles, and one row of smaller tiles fit in the first view. A keyboard-only user can move a 3-column tile to a valid position, receive its new placement, and reset the arrangement. At 390 px, no panel content is horizontally clipped and the top ribbon's controls remain 44 px minimum targets.

---

## Choice guide

| If the household prioritizes… | Start with… |
| --- | --- |
| calm browsing, collecting, and reading | Library Table |
| quick resumption, downloads, and group planning | Wayfinder |
| rearrangeable home operations and health context | Control Room |

Claude should choose one direction for the first integrated desktop build; do not blend all three at once. Codex will review the selected implementation for hierarchy, contrast, responsive reflow, and keyboard-safe panel movement.
