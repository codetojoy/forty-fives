
### TODO-011 [USE_KITTY DONE · ALLOW_DISCARD DEFERRED]

**Status (this round):** `USE_KITTY` is wired into gameplay. The resolved config is
snapshotted into `AuctionGameState.config` at `startAuction` (a game keeps the
rules it started with; the config page only affects the next New game). When
`USE_KITTY` is false (the "Rec Hall" profile) no kitty is dealt and `nameTrump`
goes straight to play — no take-kitty/discard step. The AI's kitty bid-lift is
dropped in no-kitty games. Games saved before this change default to kitty-on.

**`ALLOW_DISCARD` — deferred to a follow-up**, with these decisions recorded:
* **Everyone draws from the stock** (not only non-bid-winners): all four players
  may exchange cards; the bid winner uses the kitty if `USE_KITTY`, otherwise
  draws like everyone.
* **Any number, 0–5**: a drawing player discards any subset and draws that many
  replacements to return to five.
* **Requires structural work not yet done:** the stock must be *retained* in
  `AuctionGameState` (today `dealHand` discards it) and a new `drawing` phase
  added, plus draw AI and UI. Until then `ALLOW_DISCARD` is stored but inert, so
  "Rec Hall" currently plays as no-kitty / no-draw. Tracked as **TODO-012**.



* This was deferred as part of TODO-010
* Goal: wire config into gameplay

TODO-010 was configuration scaffolding only — the Auction config page
(`/auction/config`) and its localStorage persistence are intentionally inert.

Applying the resolved config to play is this TODO:

* `USE_KITTY`: when false, deal no kitty and skip the name-trump → take-kitty →
  discard flow; when true, current behaviour.
* `ALLOW_DISCARD`: "allow discard when not bid-winner" — let non-winning players
  also exchange cards. This interacts with the existing rule call "only the bid
  winner uses the kitty (others keep their dealt five)" recorded in TODO-008.

When wiring this in, pass the resolved config object into the *pure* transitions
(`startAuction` / `dealAuction`), the same way the trump scheme is passed — do
not scatter `if (config.useKitty)` checks through the UI or AI. Both settings
remain rule calls awaiting real-player validation (SPEC §6); the config page
stores a preference, it does not resolve them.
