
### TODO-038

This TODO pertains to introducing avatars in the Auction Forty-Fives game for the AI players.

Reference docs include:

* doc/SPEC.md (obviously)
* BRAINSTORM-avatar.md (v1)
* doc/BRAINSTORM-avatar-v2-fable.md (v2 and latest-greatest)

Goals (from v2 bottom-line):

* Adopt v1's recommendation in its reconciled form: use the DiceBear npm package offline as a one-time generator (CC0 open-peeps style)
* curate ~4–6 senior-looking faces as static SVGs 
    * log them in ASSETS.md following the fonts' third-party precedent
    * add a "Note on avatars" there recording how this honors SPEC §8. 
* Ship 3 AI-seat avatars first (the human has no seat panel), keep them aria-hidden beside the name/role labels, and respect the TODO-015 reserved seat geometry when sizing.
* update this TODO with list of files that need to be committed to repo 

* version bump to 0.2.38 (we acknowledge minor version jump)

### Implementation notes (done)

Licenses verified 2026-07-02: DiceBear's `open-peeps` style page states "Open Peeps by
Pablo Stanley, licensed under CC0 1.0"; openpeeps.com confirms CC0, no attribution.
16 candidates were generated offline (DiceBear 9.4.2, all options pinned — see the
generation record in `ASSETS.md`); 6 were curated: #01, #02, #04, #05, #06, #16.
Seat assignment (fixed by seat index, not name): Stewart (seat 1) `peep-02`,
Margaret (seat 2) `peep-01`, Bernadette (seat 3) `peep-16`; `peep-04/05/06` are
reserves for `/play` or a future human spot. Avatars render 44px, `alt=""` +
`aria-hidden`, in a seat-header row that matches the old stacked name/role height,
so the TODO-015 seat reservation (9.5rem wide layout) is unchanged.

### Files to commit

* `src/lib/assets/avatars/peep-01.svg` (new)
* `src/lib/assets/avatars/peep-02.svg` (new)
* `src/lib/assets/avatars/peep-04.svg` (new)
* `src/lib/assets/avatars/peep-05.svg` (new)
* `src/lib/assets/avatars/peep-06.svg` (new)
* `src/lib/assets/avatars/peep-16.svg` (new)
* `src/routes/auction/+page.svelte` (avatar imports, seat-header markup, styles)
* `ASSETS.md` (avatar table row + "Note on avatars" provenance section)
* `vite.config.ts` (version 0.1.37 → 0.2.38)
* `doc/TODO-038.md` (this file)
