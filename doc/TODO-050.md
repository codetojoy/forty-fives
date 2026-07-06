
### TODO-050

Follow-on to TODO-049. On mobile (e.g. iPhone SE 2020, ~343px of content width)
the bid panel's buttons still wrap raggedly onto a second line. This is *not*
fixed by shrinking tap targets — SPEC §7 pins ≥48px targets (prefer 56+) and
large card faces as hard accessibility requirements, so buttons must stay large
and wrapping is the correct graceful-degradation behaviour. The problem is only
that the common case wraps when it does not need to.

The mitigation in this TODO (option #1 from the design discussion):

* Give the numeric bid buttons (`15` / `20` / `25` / `30`) a fixed, tap-target-
  safe `min-width` and trimmed *horizontal* padding (height unchanged), so the
  common bid row — the four numbers plus **Pass** — fits one row on the SE
  instead of wrapping. When the rare **Hold** button is present (dealer holding a
  bid) the row may still wrap to a second line; that is acceptable.
* The player's cards are deliberately **left alone**: at 72px, five cards wrap to
  two tidy rows, which beats one cramped row and respects "large card faces".

* bump version to 0.2.50

**Status: complete** (implemented 2026-07-06).

### Implementation notes (done)

* The numeric bid buttons carry a new `bid-button` class: `min-width: 52px`
  (comfortably over the 48px tap-target floor, SPEC §7) with trimmed horizontal
  padding (0.5rem; height and vertical padding unchanged). Since the labels are
  now just 15/20/25/30 (TODO-049), that's ample.
* `.panel-buttons` gap trimmed 0.75rem → 0.6rem. Measured on a ~343px SE content
  width, the common row (four 52px numbers + Pass, no Hold) now comes to roughly
  330px, so it sits on one line with a little slack instead of wrapping. When the
  rare Hold button appears (dealer holding a bid) the row may wrap — acceptable.
* No tap target dropped below the floor; the player's cards were left untouched
  (five 72px cards still wrap to two tidy rows), respecting "large card faces".
* The gap change is shared across every panel's button row (suit-naming,
  discard, hand-over), which only helps the general mobile overflow; all those
  buttons stay large.

Version bumped 0.2.49 → 0.2.50. Verified: `npm run check` 0 errors/0 warnings,
441/441 tests, production build succeeds with 0.2.50 in `/about`. (The bid panel
is in the in-game view, which doesn't prerender, so it's confirmed via
check/tests rather than a static-HTML grep.)

### Files committed

* `src/routes/auction/+page.svelte` (`bid-button` class + rule, tighter panel gap)
* `package.json` (version 0.2.49 → 0.2.50)
* `doc/TODO-050.md` (this file)
