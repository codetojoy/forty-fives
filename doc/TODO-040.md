
### TODO-040

Examine all strings used on UI buttons and consider if they can be made more brief, to reduce noise for users. 

* e.g. 1 "Deal the next hand" becomes "Deal"
* e.g. 2 "Tap again to abandon the game" becomes "Tap again"

* version bump to 0.2.40

### Implementation notes (done)

Every visible button string in the app was inventoried; the shortened ones:

| Where | Before | After |
|---|---|---|
| `/play`, `/auction` | Deal the next hand | Deal |
| `/play`, `/auction` | Tap again to abandon the game (armed) | Tap again |
| `/play`, `/auction` | See the hand score | See score |
| `/play`, `/auction` | Start a game | Start |
| `/auction` | Discard these three / Discard these (n/3) | Discard / Discard (n/3) |
| `/auction` | Exchange Non-trump / Exchange All | Exchange non-trump / Exchange all (case only) |
| `/trainer` | Next question | Next |
| `/trainer` | Random each question | Random |
| `/trainer` | Change trump suit | Change trump |
| `/play/stats`, `/auction/stats` | Tap again to reset (armed) | Tap again |

Kept as-is because the words are load-bearing or already brief: Next trick, New game,
Cancel, Pass, Bid 15/20/25/30, the suit buttons, Stand pat, Exchange *n*, Keep my hand,
Take the {card} (the rob decision is *which card*), Reset stats, Reset score, Save.

Accessibility guard: the three "Tap again" armed states no longer say *what* happens,
so the armed button carries an `aria-label` with the full sentence ("Tap again to
abandon the game" / "Tap again to reset your statistics") — screen-reader users keep
the whole meaning; the label is `undefined` (absent) when unarmed. Labels only got
shorter, so the TODO-015 geometry reservations are untouched.

Version bumped 0.2.39 → 0.2.40. Verified: `npm run check` clean, full test suite
passes, production build succeeds.

### Files to commit

* `src/routes/play/+page.svelte`
* `src/routes/auction/+page.svelte`
* `src/routes/trainer/+page.svelte`
* `src/routes/play/stats/+page.svelte`
* `src/routes/auction/stats/+page.svelte`
* `vite.config.ts` (version 0.2.39 → 0.2.40)
* `doc/TODO-040.md` (this file)
