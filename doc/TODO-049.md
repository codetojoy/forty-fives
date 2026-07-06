
### TODO-049

The UI for Auction Forty-Fives game can still be cleaned up: many buttons flow onto the next line (on mobile).

The mitigation in this TODO is:

* for user bids, the "Bid N" buttons (where N=15, 20, 25, 30) should simply read "N" (e.g. 15, 20, 25, 30)

* bump version to 0.2.49

**Status: complete** (implemented 2026-07-06).

### Implementation notes (done)

* The human bid buttons in `/auction` now read just the number (`15` / `20` /
  `25` / `30`) instead of `Bid 15` …, so four bid buttons plus Hold and Pass fit
  a phone row far more often.
* Accessibility (SPEC §7): a bare-number button loses its accessible name, so
  each carries `aria-label={`Bid ${b}`}` — visually "15", still announced as
  "Bid 15" to screen readers. Tap target unchanged (`.big-button` keeps its
  60px min-height and 1.25rem side padding, well over the 48px minimum).
* Scoped narrowly: the Hold/Pass buttons, the help-list prose ("Bid 15, 20, 25
  or 30…"), and everything else are untouched. No test asserted the button
  label, so nothing else changed.

Version bumped 0.2.48 → 0.2.49. Verified: `npm run check` 0 errors/0 warnings,
441/441 tests, production build succeeds with 0.2.49 in `/about`. (The bid
buttons live in the in-game view, which doesn't prerender, so they aren't in the
static HTML — confirmed via check/tests instead.)

### Files committed

* `src/routes/auction/+page.svelte` (bid button label + aria-label)
* `package.json` (version 0.2.48 → 0.2.49)
* `doc/TODO-049.md` (this file)

