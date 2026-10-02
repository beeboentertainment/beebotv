# Beebo desktop visual direction: The Control Room

**Owner:** Codex (visual direction)
**Build owner:** Claude
**Purpose:** A distinct, practical desktop-app direction for Beebo's home and library surfaces. It is not a recolour of the existing UI: it makes the household's current activity, media library, and connection state into deliberately arranged, movable work areas.

**Visual reference:** `assets/concepts/beebo-control-room-desktop-concept-2026-10-01.png` is a composition and hierarchy reference only. It is not a literal screen to reproduce, and it does not specify any product capability beyond this document.

## The feeling

Warm, calm and confidently technical. The app should feel like the household's media control room after dark: deep charcoal surfaces, ivory reading text, muted brass for actions, and a single restrained green signal for a healthy state. It should never resemble a monitoring dashboard, a streaming-catalogue clone, or a child-themed interface.

## Layout at a glance

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Beebo · household selector                    Search     Profile         │
├─────────────┬───────────────────────────────────────────┬────────────────┤
│ Library     │ NOW PLAYING / CONTINUE                     │ HOME PULSE     │
│ Home        │ large artwork, title, progress, Play       │ server health  │
│ Movies      ├───────────────────────────────────────────┤ connection     │
│ TV Shows    │ RECENTLY ADDED                             │ guests         │
│ Collections │ adjustable media shelf                     │                │
│ Downloads   ├───────────────────────────┬───────────────┴────────────────┤
│             │ QUEUE / UP NEXT            │ HOUSEHOLD MOMENTS              │
│             │ compact, moveable panel    │ photos, stories or Camp Mode   │
└─────────────┴───────────────────────────┴────────────────────────────────┘
```

The navigation rail is fixed. All other panels can be rearranged within the content canvas; Home Pulse and Household Moments can be hidden by the owner. A user who never moves anything sees the composition above.

## Grid and panel behaviour

- The content canvas uses a 12-column grid, an 8 px base unit, 24 px outer padding, and 16 px gutters.
- Panels snap to grid intersections after drag or resize. They may not overlap, cover the fixed rail, or leave the canvas bounds.
- Minimum sizes: Now Playing 6 × 5 grid units; media shelf 4 × 3; Queue 3 × 3; Home Pulse 3 × 4; Household Moments 4 × 3.
- A resize stops at the panel's content-safe minimum rather than compressing text or controls. Dense content scrolls inside its panel only after that minimum is reached.
- Dropping on an occupied area shifts the nearest compatible panel one snap position; if there is no valid placement, return the moved panel to its prior location with a short, non-alarming explanation.
- Layouts are saved per signed-in household profile. Provide **Reset layout** and a named **Cinema night** preset; neither changes media, profiles, or playback.

## Hierarchy and typography

1. **Now Playing** is the visual anchor: one large title, clear play/resume action, progress, and no more than two secondary actions.
2. Library shelves are secondary and must show at least three full poster cards at normal desktop width.
3. Health/state information stays compact and explanatory; use a text label as well as colour (for example, “Connected at home”, not a green dot alone).
4. Use an adult, highly legible sans serif. Body text is 16 px minimum; supporting text may reach 14 px only when line-height is at least 1.45.
5. Small all-caps labels are reserved for panel categories and must be at least 12 px with moderate tracking. Do not use them for essential content or actions.

## Palette and elevation

| Role | Direction |
| --- | --- |
| Canvas | Near-black blue-charcoal, never pure black |
| Panels | One slightly lighter charcoal, thin slate outline |
| Primary text | Soft ivory, high contrast against all panels |
| Muted text | Cool grey with at least AA contrast at its rendered size |
| Primary action | Brass fill with near-black label; never pale text on brass |
| Healthy / available | Deep green fill with pale mint text |
| Needs attention | Dark amber fill with warm cream text |
| Planned / informational | Navy fill with pale blue text |

Use flat or very low elevation. A single 1 px outline and a restrained hover outline are preferred to floating cards and large shadows.

## Accessible interaction requirements

- Every drag action has an equivalent keyboard action: “Move panel” opens a labelled list of valid positions; arrow keys move one grid unit; Enter confirms; Escape returns to the previous position.
- Resize handles have visible labels, a 44 × 44 px pointer target, and an equivalent keyboard resize action.
- Focus order follows the visible layout, never the original DOM order after a panel moves.
- Use `prefers-reduced-motion`: panels should snap immediately, with no sliding animation. Otherwise limit movement feedback to 150 ms.
- Status badges must pair icon/colour with text and preserve a minimum 4.5:1 contrast ratio. The public roadmap patch in `corporate-supporting-dark.css` is the matching website rule.
- Do not rely on poster art alone for title or progress information. Every actionable poster needs visible text or an accessible label.

## Acceptance checks for Claude

1. At 1280 × 800, the default layout shows Now Playing, a media shelf, Queue, and Home Pulse without horizontal scrolling.
2. At 1024 px wide, panels reflow to valid grid positions; none overlap or reduce essential text below its minimum size.
3. Move Queue beside Home Pulse, resize it to its minimum, restart the app, and verify the profile-specific arrangement returns exactly.
4. Keyboard-only users can move and resize one panel, discover its new position, and reset it without a pointer.
5. Verify status labels in the app and website in dark mode at normal zoom and 200% browser/app scaling.
6. Capture desktop screenshots at 1280 × 800 and 1024 × 768 plus one keyboard-focus state before visual sign-off.

## Build handoff

Implement this as a layout system, not as absolute-positioned screen art. Preserve the fixed navigation rail and default composition; store arrangement as grid coordinates and dimensions, validate collision-free placement before committing a move, and offer reset/preset recovery. Codex can review the first integrated build visually once the layout and keyboard behaviour are ready.
