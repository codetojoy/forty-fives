
### TODO-053

Minor UI/text change for Auction Forty-Fives. 

During game play, at the top of the page, there is a trump indicator of the form "Trump: ♥ Hearts". Let's remove the English description of the suit (e.g. "Hearts").

On the same page, near the user's hand, the trump indicator is of the form "♥ Hearts trump". Let's drastically simplify this to just the suit symbol.

* bump version to 0.2.53

**Status: complete** (implemented 2026-07-07).

### Implementation notes (done)

Two indicators, two render sites, both pure text changes — plus an `aria-label`
on each so the terse glyph keeps an accessible name (SPEC §7), the same pattern
used for the bare-number bid buttons (TODO-049).

* **Top-of-page badge** (`src/lib/ui/TrumpRankingHelp.svelte`): "Trump: ♥ Hearts"
  → **"Trump: ♥"** (dropped `SUIT_NAMES`). The `.trump-badge` span gains
  `aria-label={`Trump: ${SUIT_NAMES[trumpSuit]}`}`, so it still announces
  "Trump: Hearts". The expanded ranking popover's heading ("Trump ranking —
  Hearts ♥") is a separate element and was left as-is — the full name aids the
  ranking panel and is out of this TODO's scope.
* **Near-hand indicator** (`src/routes/auction/+page.svelte`): "· ♥ Hearts trump"
  → **"· ♥"** (dropped `SUIT_NAMES` and the word "trump"). The leading "· "
  separator is kept intentionally. The `.hand-trump` span gains
  `aria-label={`${SUIT_NAMES[game.trumpSuit]} trump`}`, still announcing "Hearts
  trump". The suit colouring (`trumpColor`, red/black) is retained in both.
* `SUIT_NAMES` stays imported in both files — still used by the popover heading,
  the AI naming message, and the name-trump selection buttons — so no unused
  imports. Untouched by design: the AI narration ("named Hearts ♥ trump."), the
  name-trump button labels, and the popover heading.

Version bumped 0.2.52 → 0.2.53. Verified: `npm run check` 0 errors/0 warnings,
444/444 tests, production build succeeds with 0.2.53 in `/about`. (Both
indicators are in the in-game view, which doesn't prerender, so they're confirmed
via check/build rather than a static-HTML grep.)

### Files committed

* `src/lib/ui/TrumpRankingHelp.svelte` (top badge: symbol only + aria-label)
* `src/routes/auction/+page.svelte` (near-hand indicator: symbol only + aria-label)
* `package.json` (version 0.2.52 → 0.2.53)
* `doc/TODO-053.md` (this file)

