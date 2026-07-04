
### TODO-043

Three quick wins, identified by a project scan (2026-07-04). **Status: complete** —
item 1 was handled out-of-band; items 2 and 3 implemented 2026-07-04.

1. NOTE: NOW COMPLETE. **Ship the stranded TODO-042 test file.** `tests/domain/auction-hold.test.ts` is
   still untracked even though commit `9ac7d01` shipped the hold feature — the 13
   hold tests (the SPEC §13 tests-first evidence) exist only locally, so a fresh
   clone runs 412 tests, not 425, with the hold rules uncovered. Same failure mode
   as the earlier `HelpDisclosure.svelte` omission. Fix: `git add` and commit it.

2. **Finish the "text into pop-over" backlog item on `/play`.** The unchecked
   `doc/TODO-misc.md` item ("reduce the text into pop-over info") is done on
   `/auction` (one-line tagline + a How-to-play `HelpDisclosure`) but `/play` still
   opens with a three-sentence paragraph. Fix: replace it with a short tagline plus
   a "How to play" disclosure (five cards each; the turn-up suit is trump, with
   robbing; 5 points a trick + 5 for the highest trump; reneges enforced with
   explanations; first to 45 wins). UI-only; then tick the misc item.

3. **Extract a shared `TrumpRankingHelp` component.** TODO-041 copied the
   trump-ranking peek from `/auction` into `/play` verbatim — the
   `trump-wrap`/`rank-heading`/`rank-note`/`rank-list`/`rank-chip` markup plus its
   ~35-line CSS block now live in both pages, so any wording/style tweak must be
   made twice. Fix: new `src/lib/ui/TrumpRankingHelp.svelte` (beside
   `HelpDisclosure` and `PlayingCard`) taking `trumpSuit`, `scheme`, and `align`;
   both pages drop to a two-line usage. Pure refactor, no behavior change.

Noticed but deliberately **not** included: the `doc/TODO-misc.md` item "45s game
should stop at 45" (counting out mid-hand). That is a genuine rules change — it
interacts with the Milestone 1 rule call about both players crossing 45 in the same
hand, and per SPEC §13 needs its tests written first — so it deserves its own TODO.

* bump version to 0.2.43 (in `package.json`, per TODO-041)

### Implementation notes (items 2 & 3, done)

* **Item 2** — `/play`'s intro paragraph became a one-line tagline ("Turn up trump,
  win tricks — race to 45.") plus a "How to play" `HelpDisclosure` with five bullets
  (five cards each; turn-up suit is trump, with robbing; 5 points a trick + 5 for
  highest trump; reneges enforced with explanations; first to 45), mirroring
  `/auction`'s structure and reusing its `.tagline`/`.help-list` styles. The
  matching `doc/TODO-misc.md` item is ticked.
* **Item 3** — new `src/lib/ui/TrumpRankingHelp.svelte` owns the trump badge + the
  ranking HelpDisclosure and their styles; it takes `trumpSuit`, `scheme`, and
  `align`, deriving the color and ranking internally. Both game pages now render
  `<TrumpRankingHelp trumpSuit={game.trumpSuit} {scheme} align="end" />` and lost
  the duplicated markup, the `trumpRanking` derived, the `parseCardId` import, and
  the ~44-line `trump-wrap`/`rank-*` CSS block each. Pure refactor — no domain or
  test changes.

Version bumped 0.2.42 → 0.2.43. Verified: `npm run check` clean, 425/425 tests,
production build succeeds with 0.2.43 in `/about`.

### Files committed

* `src/lib/ui/TrumpRankingHelp.svelte` (new shared component)
* `src/routes/play/+page.svelte` (intro tagline + How-to-play; TrumpRankingHelp)
* `src/routes/auction/+page.svelte` (TrumpRankingHelp)
* `package.json` (version 0.2.42 → 0.2.43)
* `doc/TODO-misc.md` (pop-over item ticked), `doc/TODO-043.md` (this file)
