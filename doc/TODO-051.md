
### TODO-051 [COMPLETE]

In Auction Forty-Fives, when a game is complete, we display "New Game" button". 

This TODO is to add another button "Auction Home" which returns to the primary Auction page where links for Config and Stats reside. In this way, the user doesn't have to abandon a new game to navigate there.

* bump version to 0.2.51

**Status: complete** (implemented 2026-07-07).

### Implementation notes (done)

* The "primary Auction page" is the intro screen (`/auction` with `game === null`),
  which already holds the `Configure →` and `Stats →` links. Returning there just
  means setting `game` to `null`, which is exactly what the existing `quitGame()`
  handler does (clears the AI timer, `lastTrick`, `message`, then `setGame(null)`).
  So the new "Auction Home" button **reuses `quitGame` directly** — no new
  navigation, routing, or state handling. Nothing is lost because the game is
  already over.
* This fills a real gap: on game-over the only control was "New game", and the
  "Abandon game" footer is deliberately hidden once the game is over
  (`{#if !gameOver}`), so a finished game previously trapped the user.
* The two buttons now sit in a `.panel-buttons` flex row (the same row style used
  elsewhere, so they wrap gracefully on mobile). **"New game" stays first and
  prominent**; "Auction Home" is second. Both use `.big-button` (60px min-height,
  well over the SPEC §7 48px tap-target floor). No secondary-button variant was
  invented — equal styling matches the rest of the file.
* No new test: this is UI wiring that reuses an existing, already-exercised
  handler; there is no new domain logic.

Version bumped 0.2.50 → 0.2.51. Verified: `npm run check` 0 errors/0 warnings,
441/441 tests, production build succeeds with 0.2.51 in `/about`. (The game-over
panel is in the in-game view, which doesn't prerender, so it's confirmed via
check/tests rather than a static-HTML grep.)

### Files committed

* `src/routes/auction/+page.svelte` (game-over "Auction Home" button + `.panel-buttons` row)
* `package.json` (version 0.2.50 → 0.2.51)
* `doc/TODO-051.md` (this file)
