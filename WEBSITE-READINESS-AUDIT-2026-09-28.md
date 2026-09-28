# Website readiness audit — 2026-09-28

## Scope and boundary

This is a read-only readiness review of the public marketing site and the related Worker routes. It does not publish a page, change a customer account, create a payment, or enable a feature flag.

## Verified public paths

| Path | Result | Notes |
| --- | --- | --- |
| `https://www.beeboentertainment.com/` | Reachable | Public setup, download, help and Camp Mode information are available. |
| `https://login.beebo.tv/health` | Reachable | Returned an `ok` health response at review time. This is not an account-flow test. |
| Local static asset/link scan | Passed except two intentional/actionable findings below | Checked 2,087 local HTML references after resolving site-root paths. |

## Role-by-role readiness

### Guest

Ready for an information-first visit: a visitor can learn about Beebo, download an available build, read support material, and use local Camp Mode as a guest where the installed app offers it.

Not ready as a public online-games experience: the proposed Web Games API is protected by `BEEBO_WEB_GAMES_ENABLED` and is off by default. Its live route returned 404 at review time, which is the safe state until the migration, deployment, and end-to-end checks are complete.

### Ordinary account holder

The desktop/app flow has account behavior, but the public marketing site is not yet a complete account portal. There is no verified public ordinary-account sign-in page or account dashboard from the site.

The proposed `play/index.html` contains links to `/account/sign-in`; that route returned 404 both on the public site and on `login.beebo.tv` at review time. Do not publish Beebo Play until this is replaced by a deliberately designed and tested account-authentication path, or the signed-in option is removed from the public client.

`https://login.beebo.tv/account/access` does exist, but it is for owner-issued temporary accounts and must not be presented as ordinary account sign-in.

### Paid-service customer

Not ready for public sale. The pricing page correctly describes Relay and VPN as planned/in verification and does not expose a checkout action. Before paid activation, the actual offer must be reviewed and tested for price, billing period, taxes, cancellation, refund handling, entitlement changes, receipts, and payment-webhook failure/retry behavior.

### Tester applicant

The new application UI and Worker support a 60 approved / 60 waiting capacity when JavaScript is enabled. `assets/tester-program.js` updates the older static 30/30 copy on load, so the application flow needs a browser-level verification after deployment.

Two follow-ups remain:

1. Change the static HTML fallback from 30/30 to 60/60 so visitors without JavaScript, and visitors during initial render, are not shown outdated capacity text.
2. Complete the documented activation order: publish the approved website form, apply the Worker migration, deploy with the Discord flag off, then have Nick configure the private-channel webhook secret and explicitly enable the flag.

### Owner / administrator

Owner endpoints and dashboards exist in source, but they cannot be declared production-ready without a controlled owner acceptance test. That test should cover sign-in, tester review, approve/reject, the 60-person cap, application deletion, and the private Discord notification—confirming specifically that passwords and password-derived values never leave the application system.

## Other actionable finding

`docs/temporary-login.html` links to `become-a-tester.html` as though it were in the same directory. The target should resolve to the site-root tester page; the current relative link is broken from the `/docs/` location.

## Recommended launch order

1. Fix and test the ordinary account entry/sign-in path.
2. Complete the owner acceptance test for tester intake and correct its static 60/60 fallback copy.
3. Validate email delivery for verification, reset, support, and receipts using non-production test accounts.
4. Complete a payment-provider sandbox test covering purchase, renewal, cancellation, refund and failed webhook recovery; only then decide whether to expose checkout.
5. Apply and test Web Games migrations with the flag still off; run a controlled guest, friend-QR, signed-account and deletion test before enabling it.
6. Add monitoring/alerts and a plainly worded service-status route before inviting broad public use.

## Nick decisions required before public paid launch

- Final paid Relay/VPN prices, included capacity, taxes, cancellation and refund policy.
- The email sender/domain and support-response workflow.
- Whether Web Games should be enabled after end-to-end testing.
- Which account pages should be public: sign-in only, self-service account recovery, subscription management, and/or a full account portal.
