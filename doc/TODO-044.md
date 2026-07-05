
### TODO-044

Three quick wins, identified by a project scan (2026-07-04). **Status: complete**
(implemented 2026-07-04).

1. **Fix two stale claims in `CLAUDE.md`.** The trump-schemes section still says the
   scheme JSON carries "renege and scoring fields that are carried but unused until
   Milestone 1" — Milestone 1 shipped long ago and those fields drive the rules
   engine and scoring today. And the layout-mapping section still lists the routes
   as "(`/` mode chooser, `/trainer`, `/play`)" — predating `/auction` and the
   config/stats/about/reference pages. Fix: correct both sentences (docs only; the
   README was already refreshed in TODO-041 and is current).

2. **Extract a shared personas module.** `/play` and `/auction` deliberately share
   the same AI personas — the same names paired with the same avatar SVGs
   (TODO-038/039) — but the name→face table is duplicated: each page imports the
   avatar SVGs and builds its own map, and the pairing is protected only by a
   comment ("Same persona, same face as the Auction seats"). Fix: new
   `src/lib/ui/personas.ts` exporting one name→avatar map (Margaret, Stewart,
   Bernadette); `/play` consumes it directly and `/auction` builds its
   seat-keyed map from it. The cross-game invariant becomes code. Pure refactor.

3. **Extract an `ArmedButton` component for the two-tap confirm pattern.** The
   destructive-action pattern from TODO-040 — first tap arms ("Abandon game" →
   "Tap again"), second tap fires, with the full sentence moved into `aria-label`
   while armed — is hand-rolled in four places: quit on `/play` and `/auction`,
   reset on `/play/stats` and `/auction/stats`, each with its own `$state`,
   arm/confirm handler, and markup. Fix: new `src/lib/ui/ArmedButton.svelte`
   owning the armed state and accessibility wiring, taking the idle label, armed
   label ("Tap again"), armed `aria-label` sentence, and an `onconfirm` callback,
   and exposing a disarm hook for the pages that clear the armed state when an
   unrelated action intervenes. Behavior-preserving; all four call sites shrink.

Noticed and still deliberately deferred: the `doc/TODO-misc.md` item "45s game
should stop at 45" (counting out mid-hand) remains a real rules change — it
interacts with the Milestone 1 both-cross-45 rule call and needs tests written
first (SPEC §13) — so it still deserves its own TODO, not a quick-win pass.

* bump version to 0.2.44 (in `package.json`, per TODO-041)

### Implementation notes (done)

* **Item 1** — both stale `CLAUDE.md` sentences corrected: the scheme JSON's renege
  and scoring fields are described as read by the rules engine and scoring (not
  "unused until Milestone 1"), and the layout-mapping route list now names all the
  routes (`/`, `/trainer` + `/trainer/reference`, `/play` and `/auction` with their
  `config`/`stats` subpages, `/about`).
* **Item 2** — new `src/lib/ui/personas.ts` exports `PERSONA_AVATARS`, the single
  name→face table (Margaret, Stewart, Bernadette). `/play` looks the opponent up
  by name directly; `/auction` keeps its deliberately seat-keyed map (a rename
  must not change a face mid-game, TODO-038) but builds it from
  `PERSONA_AVATARS.*`, so the pairing lives in one place. The pages no longer
  import the avatar SVGs themselves.
* **Item 3** — new `src/lib/ui/ArmedButton.svelte` owns the two-tap state, the
  "Tap again" flip, and the armed `aria-label`; a `variant` prop ('small' | 'big')
  carries the two button recipes the call sites used (Svelte style scoping means
  the component must own its styles). It exposes `disarm()` for the game pages,
  which cancel a pending quit from `newGame`/`tapCard` via `bind:this` (declared
  `$state` per svelte-check). All four call sites (quit on `/play` and `/auction`,
  reset on both stats pages) lost their armed `$state`, handler branching, button
  markup, and now-unused `.small-button`/`.big-button` CSS blocks.

Version bumped 0.2.43 → 0.2.44. Verified: `npm run check` 0 errors/0 warnings,
425/425 tests, production build succeeds with 0.2.44 in `/about` and the reset
ArmedButton prerendered on both stats pages.

### Files committed

* `src/lib/ui/personas.ts` (new shared persona table)
* `src/lib/ui/ArmedButton.svelte` (new two-tap confirm component)
* `src/routes/play/+page.svelte`, `src/routes/auction/+page.svelte` (personas +
  ArmedButton for quit)
* `src/routes/play/stats/+page.svelte`, `src/routes/auction/stats/+page.svelte`
  (ArmedButton for reset)
* `CLAUDE.md` (two corrections)
* `package.json` (version 0.2.43 → 0.2.44)
* `doc/TODO-044.md` (this file)
