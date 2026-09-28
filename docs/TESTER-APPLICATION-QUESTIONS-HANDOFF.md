# Tester application questions — review handoff

Branch: `codex/tester-application-intake`

## What changed

`assets/tester-program.js` augments the existing tester application form with three required, bounded questions:

1. Devices, builds, and test setup.
2. Realistic testing availability.
3. How the applicant would report a useful, reproducible finding.

It also adds an explicit acknowledgement that, when Nick enables the optional private Discord intake, application fields—but never a password—go to Discord for his private review. The existing public availability copy is updated at runtime from 30/30 to the requested 60 approved / 60 waiting places.

## Paired release

This branch must be released with `codex/tester-discord-intake` in the private application repository. Publish this static-site branch first, then run the Worker migration and deploy that Worker branch. The Worker is intentionally not compatible with the old form after its required-plan validation is deployed.

## Verification

- `node --check assets/tester-program.js`
- `git diff --check`

No website publish, merge, or push was performed.
