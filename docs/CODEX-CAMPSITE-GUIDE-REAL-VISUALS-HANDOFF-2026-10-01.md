# Campsite guide visual correction — October 1, 2026

Branch: `codex/campsite-guide-real-visuals-2026-10-01`, local `beebotv` worktree. No push, merge or deploy by Codex.

Nick pointed to two sections of the current public `docs/campsite-mode.html`: the old flat campfire illustration and the “Screenshot coming” box in Step 1. This branch replaces the illustration with a higher-quality generated rainy communal-tent concept image, clearly labeled as concept, and replaces the Step 1 placeholder with a **real** Android Campsite start-screen capture. The start capture is `C:\BeeboEntertainment\docs\ANDROID-LIVE-DEVICE-TEST-2026-10-01-10-campsite.png`, copied unaltered into the website asset folder; it contains no displayed private IP or account identifier.

I inspected the two September 30 real guest/host screenshots but did **not** publish them as assets because both visibly contain a private local IP address. Their evidence is summarized in copy only. The original guide incorrectly claimed a guest had played games and watched downloads. The capture notes establish only an S24 Ultra host and S9+ guest joining over home Wi-Fi, guest empty-library state (0 shared videos) and host count of one; the exact build was not recorded. The public status paragraph is corrected to that narrower claim. Step 1 wording now matches the real capture.

The hero image is a copied, project-bound JPEG of the camper-photo concept produced on the separate `codex/camp-photo-story-2026-10-01` branch. It depicts a proposed projector/phone/radio arrangement with sound-wave overlay, but real multi-phone movie surround and jobsite-radio bass remain unverified. The public caption states that plainly. Generated image prompt/provenance are recorded in that branch's `docs/CODEX-CAMP-STORIES-HANDOFF-2026-10-01.md`.

Review remaining guide instructions and JSON-LD before publication. Several older instructions still describe designed or code-level capabilities beyond the real two-phone test; this visual correction does not certify those steps. Claude should decide whether to synchronize the rest of the guide with the current Android build and evidence in the same reviewed release.
