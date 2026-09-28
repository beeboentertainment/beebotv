# Proposed Beebo Play web-games API contract

This is the implementation contract for the Worker that backs the static `/play/` client. Its configured API origin is `https://login.beebo.tv`, making the API base `https://login.beebo.tv/web-games/v1`.

## Security and identity

- The Worker is the authority for rooms, turns, bot moves, matchmaking, capacities, and presence. The browser never simulates a bot, room, count, or turn.
- Authentication is optional. Requests may carry the account session through `credentials: include`; guest actions include a 1–24 character `nickname` in the request body.
- A private invite is an opaque, revocable capability. It is only ever placed in the page fragment: `/play/#join=<invite>`. It must not be moved into a query parameter, page content, logs, analytics, or a referer.
- Successful room creation and invite join return a room-scoped `seatToken` JSON field. The client holds it only in page memory, sends it as `Authorization: Bearer <seatToken>` on `GET /rooms/:roomId`, moves, and leave, and never puts it in a URL, log, cookie, local storage, or session storage. A reload intentionally requires a fresh join from the invite.
- All mutation endpoints must validate the current room session, player ownership, game rules, and the action sequence atomically.

## Endpoints

### `GET /web-games/v1/lobby`

Returns only real, currently available lobby data. `openTables` should contain joinable matchmaking tables first. This browser MVP accepts and renders only the `tic-tac-toe` entries; existing Camp Mode games remain app-hosted and do not cross-play with browser rooms.

```json
{
  "openTables": [{"invite":"opaque-public-join-capability","gameName":"Tic-Tac-Toe","label":"One seat open","playerCount":1,"capacity":2}],
  "games": [{"id":"tic-tac-toe","name":"Tic-Tac-Toe","category":"Board game","description":"Three in a row.","openTables":1,"waitingPlayers":1,"supportsBot":true,"supportsPrivate":true,"supportsMatchmaking":true}]
}
```

### `POST /web-games/v1/rooms`

Body: `{ "gameId": "tic-tac-toe", "mode": "bot" | "private" | "matchmaking", "nickname": "…" }`. Returns `{ "room": <room snapshot>, "seatToken": "…" }`. A `private` room includes a private `invite`; bot and matchmaking rooms need not.

### `POST /web-games/v1/invites/join`

Body: `{ "invite": "opaque capability", "nickname": "…" }`. Validates the invitation and capacity, then returns `{ "room": <room snapshot>, "seatToken": "…" }`. Invite tokens are deliberately body data, never route or query values.

### `GET /web-games/v1/rooms/:roomId`

Requires `Authorization: Bearer <seatToken>` and returns the current player’s room snapshot. The client polls it every five seconds while the table is visible; a later Worker implementation may provide a server-sent event endpoint without changing the page contract.

### `POST /web-games/v1/rooms/:roomId/moves`

Requires `Authorization: Bearer <seatToken>`. Body: `{ "cell": 0 }`. Applies one legal move, then returns the next room snapshot. Rejected moves return a safe user-facing `message` and no state mutation.

### `POST /web-games/v1/rooms/:roomId/leave`

Requires `Authorization: Bearer <seatToken>`. Removes the current player from the room and returns success. The Worker owns cleanup and vacancy listing.

## Room snapshot

```json
{
  "id":"room_123",
  "game":{"id":"tic-tac-toe","name":"Tic-Tac-Toe"},
  "you":{"mark":"x"},
  "board":{"cells":["x","","","","o","","","",""],"turn":"x","winner":null},
  "invite":"opaque-private-capability-only-when-host-may-share"
}
```

The client currently renders a Tic-Tac-Toe board. Existing Camp Mode games remain separate. Future browser game renderers can be registered client-side only after their Worker rules and snapshots are defined.
