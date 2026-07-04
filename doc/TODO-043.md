
### TODO-043

Three quick wins, identified by a project scan (2026-07-04). **Status: planned, not yet
implemented.**

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
