# Website server-entry handoff

Branch: `codex/website-server-login`

## What changed

- The home-page primary action now offers **Open my library**.
- The new `/watch-your-library.html` page accepts a visitor's own Beebo server
  address and opens it in the same browser tab so the server's existing sign-in
  screen handles credentials and library access.
- The public website does not collect, proxy, or receive a username/password.
  It only stores the entered server origin locally in that browser to save
  typing next time; query strings and fragments are discarded rather than
  retaining invitation, reset, or other URL tokens.
- The entry form accepts ordinary `https` or `http` server URLs, including a
  local `http://192.168...:47811` address. It rejects malformed URLs and URLs
  containing credentials.

## Verification

- `node --check watch-your-library.js`
- `git diff --check`

Manual review should open the new page from the homepage on desktop and phone,
then try a permanent `.beebo.tv` address and a local address shown by Beebo's
Get Started screen.
