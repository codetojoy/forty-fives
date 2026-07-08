
### TODO-055 [COMPLETE]

Reorder the three mode cards on the home page (`/`) so they run **low → high
complexity**, which doubles as a learning on-ramp (the ranking trainer teaches
the prerequisite for both play modes):

1. **Learn Ranking** (`/trainer`)
2. **Play Forty-Fives** (`/play`)
3. **Play Auction** (`/auction`)

Previous order was Play Forty-Fives / Play Auction / Learn Ranking — no clear
organizing principle. The two "Play" cards stay adjacent either way.

* bump version to 0.2.55

**Status: complete** (implemented 2026-07-08).

### Implementation notes (done)

* Pure reorder of the three `<a class="mode">` blocks in
  `src/routes/+page.svelte` — Learn Ranking moved to first, Play Forty-Fives
  second, Play Auction third. No markup, styling, copy, or logic changed; the
  cards themselves are byte-for-byte the same, only their sequence differs.
* Accepted trade-off: this de-emphasizes the primary "Play" action for the
  "For Maritimers!" audience who already know the game, in exchange for a
  principled complexity/prerequisite ordering. Chosen deliberately.
* No tests — static home page markup.

Version bumped 0.2.54 → 0.2.55. Verified: `npm run check` 0 errors/0 warnings,
444/444 tests, production build succeeds; grep of the prerendered home HTML
confirms the mode links now appear in the order `/trainer`, `/play`, `/auction`.

### Files committed

* `src/routes/+page.svelte` (mode cards reordered)
* `package.json` (version 0.2.54 → 0.2.55)
* `doc/TODO-055.md` (this file)
