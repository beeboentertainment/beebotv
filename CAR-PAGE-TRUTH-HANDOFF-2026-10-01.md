# Car companion and championships copy handoff

Branch `codex/car-page-truth-2026-10-01`, based on beebotv main `eb1a322`. Copy-only changes; no push, merge or deployment.

Claude confirmed on issue #39 that Beebo Auto 1.9 is a sideload test build, not Google Play and not real-car-tested; Watch Together and Car Party are switched off; car QR join and synchronization are in development. The revised `car-companion.html` uses those facts, labels the hero image as a concept, keeps an explicit driver-safety instruction, and links the Beebo Auto test APK and current Android download area. The local `downloads/BeeboAuto.apk` path exists in this branch; earlier hash verification matched `downloads/auto-build.json`. Claude should recheck the release file and public URL before publishing.

Removed unsupported statements that every passenger screen is synchronized, audio is lip-synced, browser guests can join by QR today, the car speakers are verified, the feature is safe for kids, or the product was tested in a car. Passenger games are labelled In development and for passengers only, never drivers.

`tournaments.html` now says Planned/no open event. Removed account-credit rewards, prizes, cash/entry assurances and promised winner terms pending Nick's approval. It retains clearly conditional future event ideas. No real event, prize or timeline is asserted.

Checks: `git diff --check`; searched both pages for removed prize/cash and kid-safety claims; verified local APK path exists. Not run through a live site, real car, or end-to-end product test. `driving-safety.html` was not edited because its safety/legal wording needs a separate owner/Claude review; it may still describe unavailable features too strongly.
