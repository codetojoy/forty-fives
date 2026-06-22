
### TODO-019 [COMPLETE]

Course-corrected the FOUR_TURNS game length: TODO-018 read "4 turns of the table"
as a full deal-rotation per turn (4 × 4 seats = 16 hands); it is actually **4
hands** — a fast rec-hall game, as played on Prince Edward Island. One "turn of
the table" = one deal. `handsPerGame()` in `auction-scoring.ts` now returns
`TABLE_TURNS` (4) instead of `TABLE_TURNS × seats`, and its unused `seats` param
was dropped (also dropped from `decideGameWinner`). All the TODO-018 semantics
are unchanged — crossing 120 early still doesn't end a FOUR_TURNS game, the
higher total wins at the limit, and an exact tie plays sudden-death hands. The
UI needed no code change: the intro "(N hands)" and the "Hand X of N" counter
derive from `handsPerGame()`, so they now read 4.

Verified: `npm run check` clean; full suite 409 passing (updated the
`handsPerGame` expectation 16 → 4; the FOUR_TURNS state test now asserts only
the fixed-length property, since a team can't cross 120 in 3 hands — the "120
doesn't end it early" property stays covered by the scoring unit test). A
headless-Chrome smoke confirmed the intro shows "4 turns of the table (4 hands)"
and the counter shows "Hand 1 of 4", with no console errors. Version bumped to
0.19.0. Original task notes below.

There was a miscommunication in previous sessions, and the goal here is to course-correct.

For config value "FOUR_TURNS", there should only be 4 tricks, not 16. It is a relatively fast game, which matches the real-world experience in a Recreation Hall on Prince Edward Island. 

Bump version to 0.19.0 (this skips some values but aligns with the current TODO #)
