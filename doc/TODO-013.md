
### TODO-013 [COMPLETE]

On the Auction game-over screen the whole footer (the Highlight/Confirm toggles
and the "Abandon game" button) is now hidden, leaving only the result message and
the "New game" button. Gated by a `gameOver` derived in `auction/+page.svelte`
(`phase.kind === 'hand-over' && gameWinner !== null`). Version bumped to 0.12.0.
Original task notes below.

* UI change for Auction game
* When the game is over, the UI shows both a "New game" button and "Abandon game" button. It should not show "Abandon game" in this scenario.
* bump version to 0.12.0

