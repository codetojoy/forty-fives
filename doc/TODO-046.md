
### TODO-046

For Auction Forty-Fives, if there is a previous game and it was completed more than an hour ago, then when the user clicks on "Play Auction", the next page should render as if no game had been played: i.e. show the "Start" button. 

In this way, the user doesn't have to deal with context from a previous "session" (so to speak).

* bump version to 0.2.46

**Status: complete** (implemented 2026-07-05).

### Implementation notes (done)

* The completion moment lives in the persistence envelope, not the game state:
  `SavedAuctionGame` gains `finishedAt: number | null` (epoch ms), stamped by
  the page's `persist()` when the saved game is over and cleared otherwise.
  `AuctionGameState` stays pure game data and the domain stays clock-free
  (no `Date.now()` in `src/lib/domain/`), which matters for the Phase B port.
* New pure domain predicate `isAuctionGameOver(state)` in
  `auction-game-state.ts` (hand over with a game winner set); the page's
  `gameOver` derived, the stamping, and the expiry check all share it.
* `loadAuctionGame()` now passes the parsed save through
  `expireFinishedAuctionGame(saved, Date.now())`: a finished game older than
  `FINISHED_GAME_TTL_MS` (one hour) is dropped — `game`/`finishedAt` become
  null while settings and names are kept — so `/auction` renders the intro
  with the Start button. In-progress games are never dropped, whatever their
  age, and a finished game revisited within the hour still shows its final
  screen.
* Backward compatibility: a finished game saved before this feature has no
  stamp and is treated as stale (dropped on next visit) — by the time the
  update reaches a device, that final screen is old context anyway.
* Tests first (SPEC §13): three `isAuctionGameOver` cases in
  `tests/domain/auction-game-state.test.ts`, and a new `tests/ui/` suite
  driving `expireFinishedAuctionGame` with real completed/in-progress games
  and a fake clock (kept at exactly one hour, dropped past it, dropped when
  unstamped, in-progress kept forever, no-game pass-through).
* `/auction/config` needed no change — it re-saves the whole envelope, so the
  stamp carries through. `/play` (1v1) is deliberately untouched; parity there
  would be its own TODO.

Version bumped 0.2.45 → 0.2.46. Verified: `npm run check` 0 errors/0 warnings,
433/433 tests (8 new), production build succeeds with 0.2.46 in `/about` and
the auction intro prerendered as before.

### Files committed

* `src/lib/domain/auction-game-state.ts` (new `isAuctionGameOver` predicate)
* `src/lib/ui/persistence.ts` (`finishedAt` field, `FINISHED_GAME_TTL_MS`,
  `expireFinishedAuctionGame`, expiry applied in `loadAuctionGame`)
* `src/routes/auction/+page.svelte` (stamp in `persist()`, derived swap)
* `tests/domain/auction-game-state.test.ts` (predicate cases)
* `tests/ui/persistence.test.ts` (new expiry suite)
* `package.json` (version 0.2.45 → 0.2.46)
* `doc/TODO-046.md` (this file)
