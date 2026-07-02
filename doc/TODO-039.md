
### TODO-039

Three quick wins, identified and applied in one pass. **Status: complete.**

1. **Fix stale "all assets are project-original" claims.** After TODO-038 the CC0
   avatar SVGs made two statements wrong: the `ASSETS.md` intro ("the only
   third-party assets are the two bundled font families") and CLAUDE.md's
   constraints bullet ("currently all assets are project-original"). Both now say:
   third-party = fonts (SIL OFL) + six avatar SVGs (CC0), everything else original.

2. **Ignore personal local files.** Added `my_*` to `.gitignore` so
   `my_push.sh`, `my_push_gh-pages.sh`, `my_run.sh`, `my_test.sh`,
   `my_session.txt` stop cluttering `git status` and real omissions stand out.

3. **Avatar for the `/play` opponent.** The 1v1 opponent is randomly named
   Margaret or Stewart — the same personas as the Auction seats — so `/play`
   reuses their exact faces (`peep-01` / `peep-02`), keyed by name (unlike the
   Auction's seat-index keying, because here the name *is* the persona and it
   changes per game). Same presentation as the Auction seats: 44px, circular,
   `alt=""` + `aria-hidden`, always rendered so the opponent row height is
   constant. `peep-04/05/06` remain reserves (ASSETS.md note updated).

Version bumped 0.2.38 → 0.2.39.

### Files committed

* `src/routes/play/+page.svelte` (avatar imports, opponent-row markup, styles)
* `ASSETS.md` (intro + avatar-note corrections)
* `CLAUDE.md` (constraints bullet correction)
* `.gitignore` (`my_*`)
* `vite.config.ts` (version 0.2.38 → 0.2.39)
* `doc/TODO-039.md` (this file)
