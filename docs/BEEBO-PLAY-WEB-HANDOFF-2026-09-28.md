# Beebo Play web client handoff

Branch: `codex/beebo-play-web-client`

## What is included

- A new responsive public `/play/` page: a Beebo Play ecosystem entry point with a Tic-Tac-Toe browser MVP, real-count/open-table presentation, guest nickname flow, optional account sign-in entry point, private QR invite UI, and an accessible Tic-Tac-Toe table view. Existing Camp Mode games stay app-hosted; there is no cross-play claim.
- A single isolated Worker adapter in `play/play.js`, configured for `https://login.beebo.tv/web-games/v1`. It shows no invented counts, users, rooms, bot behaviour, or launch claim on an unavailable service.
- Private invite capabilities use `#join=<token>` only; they never enter a query string. The Worker’s room `seatToken` remains in page memory only and is sent in `Authorization: Bearer`; reload intentionally requires a fresh invite join.
- `docs/WEB-GAMES-V1-PROPOSED-CONTRACT.md` gives the planned `/web-games/v1` contract, state shape, security requirements, and endpoint behaviour for the Worker owner.

## Follow-up needed

1. Provision the Worker and configure the deployed page’s `data-api-origin`.
2. Implement the contract’s session, invite, matchmaking, bot, and authoritative Tic-Tac-Toe rules server-side.
3. Test two physical devices: QR private join, account and guest paths, offline/error states, matchmaking vacancy ordering, and turn updates.

No deployment, push, merge, legal/pricing wording change, profile, chat, leaderboard, fake activity, or backend service is included in this branch.
