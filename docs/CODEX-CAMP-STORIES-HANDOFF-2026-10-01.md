# Camper story page — design and evidence handoff

Branch: `codex/camp-photo-story-2026-10-01` in a separate local `beebotv` worktree. No push, merge or deployment from Codex.

Nick asked for a camper-facing website page with higher-quality professional-camera-style images inspired by his reference, especially a rainy communal tent with a projected movie, a rugged radio proposed for bass and phones around the group for 5.1-style sound. He then clarified that sound waves should originate at the phones and point inward, and that outside the theater tent every pictured person should be looking at their own phone.

## Deliverables

- `camp-stories.html` and `camp-stories.css`: four-scene editorial page, phone/speaker concept illustrated, responsive layout and a homepage Camp Mode link.
- Four project-owned AI-generated photorealistic concept images in `assets/camp-stories/`: rainy tent with six phone positions and directional sound-wave overlay; solo sunset with her own phone; sunny picnic with four people each looking at their own phone; rainy awning with three people each looking at their own phone. Final website assets are quality-90 JPEG conversions of the generated PNG masters, preserving visual detail while reducing total served image weight from about 9.6 MB to about 1.4 MB.
- `sitemap.xml` includes the new page. The page explicitly labels the imagery as generated concepts, not actual camera photographs or real Beebo test screenshots.

## Evidence and release caveat

The existing `phone-speakers.html#movies` describes a Windows movie-phone-speaker beta tested in simulation and on one computer, **not** on real phones over a real campsite Wi-Fi route. The specific jobsite-radio bass channel is **not verified**. The September 30 real two-phone Campsite join showed a host plus guest over home Wi-Fi but zero shared videos, no guest playback and no game played; its build number was not recorded. All of this is said on-page. Do not turn the concept photo into a claim that 5.1 surround, the jobsite radio or a projector combination is already working in the field. Claude should review copy before publication.

## Image generation provenance

Built-in image generation (not a paid external service) produced the images; the user's supplied collage was used as a *style/scenario reference*, not copied. Original generated files remain under `C:\Users\nickw\.codex\generated_images\01a0e7dd-bd0f-78b1-b5f1-2e8f0f5c49a0\`; final selected copies live in this branch. Final prompts were:

1. Rainy tent: professional full-frame wide landscape image of four adult friends inside a believable large dry communal tent during rain, watching a portable projector on an interior screen, rugged unbranded radio and phones on separate stands around the group; realistic scale, hands and light; no brands/text. Targeted edits placed six phones around the viewers, then added thin restrained blue sound arcs from phones toward viewers and warm arcs from radio toward viewers. See the generated-file metadata and source PNG history for the full prompt text.
2. Sunset: one camper beside a lake in professional 50 mm dusk photography, own unbranded phone in hand, eyes on that screen, small portable speaker and tent, no text or logos.
3. Sunny picnic: four friends at woodland campsite beside campervan, each holding and looking at their own distinct phone, compact speaker on picnic table, candid editorial daylight, no text or logos.
4. Rainy awning: three friends dry under campervan awning after rain, each with and looking at their own distinct phone, natural hands, cool dusk and warm lantern light, no text or logos.

## Review and remaining work

- Visually inspect image crops at desktop/phone widths; phone positions and wave direction must remain visible.
- Check page links, image loading, alt text, contrast and small-screen layouts in a local preview.
- Claude reviews branch and Nick approves concepts before any website merge/publish. Real campsite hardware testing remains separate.
