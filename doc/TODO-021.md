
### TODO-021 [COMPLETE]

On the 1v1 Forty-Fives game-over screen the whole footer (the Highlight/Confirm
toggles and the "Abandon game" button) is now hidden, leaving only the result
message and the "New game" button — mirroring the Auction fix from TODO-013.
Gated by a `gameOver` derived in `play/+page.svelte`
(`game?.phase.kind === 'hand-over' && game.phase.gameWinner !== null`). Version
bumped to 0.1.21. Original task notes below.

* For the Forty-Fives game, when the game is over, the UI shows both a "New game" button and "Abandon game" button. It should not show "Abandon game" in this scenario.
* This was fixed for Auction Forty-Fives in TODO-013.md

* bump version to 0.1.21

