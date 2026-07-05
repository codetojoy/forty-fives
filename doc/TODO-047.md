
### TODO-047

This TODO is analogous to TODO-046: just for Forty-Fives instead of Auction Forty-Fives.

For plain Forty-Fives, if there is a previous game and it was completed more than an hour ago, then when the user clicks on "Play Forty-Fives", the next page should render as if no game had been played: i.e. show the "Start" button. 

In this way, the user doesn't have to deal with context from a previous "session" (so to speak).

* bump version to 0.2.47

**Status: complete** (implemented 2026-07-05).

### Implementation notes (done)

A direct port of TODO-046 to the 1v1 game, sharing its design decisions:

* `SavedGame` gains `finishedAt: number | null` (epoch ms), stamped by the
  `/play` page's `persist()` when the saved game is over and cleared otherwise.
  The timestamp lives in the persistence envelope; `GameState` stays pure game
  data and the domain stays clock-free.
* New pure domain predicate `isGameOver(state)` in `game-state.ts`, named to
  parallel `isAuctionGameOver`; the page's `gameOver` derived, the stamping,
  and the expiry check all share it.
* `loadGame()` now passes the parsed save through
  `expireFinishedGame(saved, Date.now())`: a finished game older than
  `FINISHED_GAME_TTL_MS` (one hour) is dropped — `game`/`finishedAt` become
  null while settings and the opponent name are kept — so `/play` renders the
  intro with the Start button. In-progress games are never dropped, and a
  finished game revisited within the hour still shows its final screen.
* Per the approved plan, `expireFinishedGame` and `expireFinishedAuctionGame`
  are now thin wrappers over one private generic `expireFinished(saved,
  isOver, now)` in a shared "Finished-game expiry (TODO-046/047)" section of
  `persistence.ts`, so the two games' policies cannot drift.
* Backward compatibility: a finished game saved before this feature has no
  stamp and is treated as stale (dropped on next visit), as in TODO-046.
* Tests first (SPEC §13): three `isGameOver` cases in
  `tests/domain/game-state.test.ts` (reusing its `autoplayHand` helper), and
  an `expireFinishedGame` describe in `tests/ui/persistence.test.ts` mirroring
  the auction suite (kept at exactly one hour, dropped past it, dropped when
  unstamped, in-progress kept forever, no-game pass-through) with a real
  completed 1v1 game driven through the domain transitions.
* `/play/config` needed no change — it re-saves the whole envelope, so the
  stamp carries through.

Version bumped 0.2.46 → 0.2.47. Verified: `npm run check` 0 errors/0 warnings,
441/441 tests (8 new), production build succeeds with 0.2.47 in `/about` and
the /play intro prerendered as before.

### Files committed

* `src/lib/domain/game-state.ts` (new `isGameOver` predicate)
* `src/lib/ui/persistence.ts` (`finishedAt` on `SavedGame`, shared
  `expireFinished` generic, `expireFinishedGame`, expiry applied in `loadGame`)
* `src/routes/play/+page.svelte` (stamp in `persist()`, derived swap)
* `tests/domain/game-state.test.ts` (predicate cases)
* `tests/ui/persistence.test.ts` (1v1 expiry suite)
* `package.json` (version 0.2.46 → 0.2.47)
* `doc/TODO-047.md` (this file)

