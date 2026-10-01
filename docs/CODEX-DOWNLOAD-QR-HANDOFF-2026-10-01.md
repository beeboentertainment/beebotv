# Beebo download QR — Claude review handoff (October 1, 2026)

Branch: `codex/download-qr-camp-invite-2026-10-01`

## What this branch changes

- Adds one static, self-hosted SVG QR asset at `assets/beebo-download-qr.svg`.
- Places it in the homepage downloads section and beside the **unaltered real** Campsite Mode opening-screen capture in the guide's Step 1.
- Labels it as a **download-page QR**, not a Campsite guest invitation. The QR opens `https://www.beeboentertainment.com/#download`, where the visitor chooses a platform. Android is described as a Test download, not a Google Play listing.
- Keeps guest instructions separate: guests join a Campsite host from a browser, without installing the app.
- Uses no QR network service, no QR-generating runtime script on these pages, and no Wi-Fi name, password, room code, private IP, or invitation payload.

## Checks completed

- Verified the homepage really has `id="download"` and the public site contains the downloads section.
- Generated the static SVG offline from the site's existing vendored QR generator, then independently decoded a browser rendering with a local barcode decoder. Result: `https://www.beeboentertainment.com/#download`.
- Viewed the homepage QR card and Campsite Step 1 at desktop and phone widths; a second read-only reviewer checked clarity, contrast, QR payload and overflow.
- No real phone camera scan has been recorded yet. Please test a physical phone before publishing.

## Still needed

- Claude review, then Claude/Nick decide whether to publish. Do not treat this local branch as live.
- Nick also asked for an explanatory picture of scanning a **Campsite invite**. The real invite-screen capture is still pending. Do not replace its real local-session QR with this website-download QR and present it as an actual app screenshot. If a labelled concept diagram is wanted, use this same harmless downloads QR as a sample and explicitly say it is not a working guest invitation. A genuine guest-invite QR must stay private and must not be placed on the public site.
