
### TODO-012 [COMPLETE]

Wired `ALLOW_DISCARD` into gameplay: the stock is retained in `AuctionGameState`,
a new `drawing` phase (`drawCards`) runs after trump is named, and the auction
page has an exchange panel. Everyone may exchange 0–5 cards with the stock in
eldest-hand order; the bid winner is skipped only when they used the kitty (whose
discards stay out of play). The AI (`chooseDraw`) is conservative — it keeps
trumps and off-suit honours and often stands pat. Self-play covers all four
config combos. Original task notes below.

* Deferred from TODO-011 (which wired `USE_KITTY` only).
* Goal: wire `ALLOW_DISCARD` ("allow discard when not bid-winner") into gameplay.

When `ALLOW_DISCARD` is true, after trump is named players may exchange cards by
discarding and drawing from the stock. Decisions already made (TODO-011):

* **Everyone draws from the stock**, not only non-bid-winners: all four players
  may exchange cards. The bid winner uses the kitty if `USE_KITTY` is on,
  otherwise draws like everyone else.
* **Any number, 0–5**: a drawing player discards any subset of their hand and
  draws that many replacements to return to five.
* The resolved config is already snapshotted into `AuctionGameState.config` at
  `startAuction`, so a game keeps the rules it started with.

Structural work required (not done in TODO-011):

* **Retain the stock in `AuctionGameState`.** Today `dealHand` discards
  `dealAuction`'s `stock`; the draw needs it kept and drawn from.
* **Add a `drawing` phase** to the phase machine, between `naming-trump`/
  `discarding` and `playing`, with per-seat turns (eldest-hand order, like
  bidding/play). Update `currentSeat`, `isPlausibleAuctionState`, and the save
  format accordingly.
* **AI:** a draw decision for each seat (keep trumps + high cards, discard the
  weakest), plus the bid winner's existing kitty discard when `USE_KITTY`.
* **UI:** a draw panel (tap cards to discard, confirm, draw) keyed off the new
  phase, so the page stays phase-driven (no `if (config.allowDiscard)` checks).

Until this lands, `ALLOW_DISCARD` is stored but inert, so the "Rec Hall" profile
plays as no-kitty / no-draw. Both kitty/discard settings remain rule calls
awaiting real-player validation (SPEC §6).
