
### TODO-061 [COMPLETE]

Add an emoji to the Auction game-over line when the opponents win, matching the
🎉 already shown when the user's team wins.

* Use the handshake 🤝 — the customary post-game gesture (as after a hockey game):
  gracious and sporting rather than glum, and a warm fit for the game's tone.
* Loss line becomes: `🤝 The opponents win the game.`
  (win line unchanged: `🎉 Your team wins the game!`)

* bump version to 0.2.61

**Status: complete** (implemented 2026-07-10).

### Implementation notes (done)

One-line copy change in `src/routes/auction/+page.svelte`: the game-over result
line (previously bare when `gameWinner !== myTeam`) now leads with 🤝. No logic,
styling, or test changes — the `.game-result` element and its `class:won` toggle
are untouched.

### Files committed

* `src/routes/auction/+page.svelte` (🤝 on the opponents-win line)
* `package.json` (version 0.2.60 → 0.2.61)
* `doc/TODO-061.md` (this file)

Verified: `npm run check` 0 errors/0 warnings, **497/497** tests, production build
succeeds; `build/auction/index.html` carries the 🤝 loss line.
