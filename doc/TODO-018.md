
### TODO-018 [COMPLETE]

Wired the `FINISH_RULE` setting (added but inert in TODO-016) into game-end so
play now honours it. `auction-scoring.ts` gained `decideGameWinner(finishRule,
totals, biddingTeam, handNumber)` plus `TABLE_TURNS = 4` / `handsPerGame()`:
`POINTS_120` delegates to the existing `auctionGameWinner` (first team to 120,
bidding team counts out first); `FOUR_TURNS` runs a fixed **4 turns of the table
= 16 hands** (one turn = the deal rotating once around all four seats), then the
higher running total wins. Crossing 120 early does *not* end a FOUR_TURNS game,
and the bidding team does not count out first — only the score decides. An exact
tie at the limit returns `null`, so another hand is dealt (sudden death) until
the tie breaks, reusing the existing `gameWinner: team | null` model with no new
"draw" state. `playCard` now calls `decideGameWinner` with the game's
snapshotted `config.FINISH_RULE` and `handNumber`; domain purity preserved.

The auction page reflects the active rule instead of hardcoding 120: the intro,
the score's parenthetical ("4 turns of the table" vs "first to 120"), and the
hand counter ("Hand 3 of 16" under FOUR_TURNS). The pre-game intro reads the
config the next New game will use.

Verified: `npm run check` clean; full suite 409 passing (new scoring unit tests
for both rules incl. the sudden-death tie and "no early 120 end"; a state test
that a FOUR_TURNS game never ends before hand 16 even past 120 and then ends by
score; a FOUR_TURNS AI self-play block across 40 seeds asserting count-based
termination). A headless-Chrome smoke confirmed the intro/status/hand-counter
text switches correctly between the two rules with no console errors. Version
bumped to 0.16.0. Original task notes below.

The goal is to implement the config settings introduced in TODO-016.md

That is, the game-play should honour POINTS_120 vs FOUR_TURNS

Bump version to 0.16.0
