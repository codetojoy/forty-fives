
### TODO-041

Three quick wins, identified by a project scan and applied in one pass. **Status: complete.**

1. **README was two milestones stale.** It claimed "Phase A / Milestone 1 … two modes"
   — Auction Forty-Fives (Milestone 3, the largest game in the app) was absent, as were
   the per-mode Configure/Stats pages. Updated the status paragraph, added the Auction
   mode bullet, extended the layout table's routes list, and added the auction domain
   modules to the module list.

2. **`/play` had no in-game trump-ranking peek.** `/auction` shows a HelpDisclosure
   beside the trump badge ("Show the trump ranking", TODO-036); `/play` — the game aimed
   most at learners — had no equivalent short of abandoning the game for
   `/trainer/reference`. Ported the auction `trump-wrap` + HelpDisclosure pattern into
   `/play`'s status bar: same markup and styles, ranking derived from
   `scheme.trumpRankings[game.trumpSuit]`.

3. **The version lived in the wrong file.** `package.json` still said `0.0.1` while the
   real version was hard-coded in `vite.config.ts`. Now `package.json` carries the true
   version and `vite.config.ts` reads it (`import pkg from './package.json' with
   { type: 'json' }` at config-eval time — still baked into the static HTML via
   `define`, no runtime lookup). Future bumps are a one-line edit to `package.json`,
   the standard place.

Version bumped 0.2.40 → 0.2.41 — in `package.json`, per win 3.

### Files committed

* `README.md` (status, modes, layout table, module list)
* `src/routes/play/+page.svelte` (trump-ranking HelpDisclosure + styles)
* `vite.config.ts` (version read from package.json)
* `package.json` (version 0.0.1 → 0.2.41, now the single source)
* `doc/TODO-041.md` (this file)
