
### TODO-045

Three quick wins, identified by a project scan (2026-07-05). **Status: complete**
(implemented 2026-07-05).

1. **Update the README's Auction rule-call list for TODO-042.** The Play Auction
   bullet says the configurable rule calls are "(kitty on/off, post-trump card
   exchange, how the game finishes)" — written for TODO-041, before the dealer
   hold shipped. The config page now exposes five options (`USE_KITTY`,
   `ALLOW_DISCARD`, `ALLOW_HOLD`, `FINISH_RULE`, `FIRST_LEAD`), and the hold is
   invisible to a README reader. Fix: extend the parenthetical to mention the
   dealer's option to hold the bid (and the first-trick leader, the other
   unmentioned option). Docs only.

2. **Extract a `BackLink` component for the top-of-page "← Back to …" nav.**
   Eight pages (`/play`, `/auction`, both `config`, both `stats`, `/trainer`,
   `/trainer/reference`) hand-copy the same `.top-nav`/`.home-link` markup plus
   a ~25-line CSS block (48px target, accent color, focus ring). Fix: new
   `src/lib/ui/BackLink.svelte` taking `href` and `label`, owning the styles
   (Svelte scoping means the component must carry its own CSS, as with
   ArmedButton in TODO-044). All eight pages drop the markup and the CSS block.
   Pure refactor, behavior-preserving.

3. **Deduplicate the two stats pages.** `src/routes/play/stats/+page.svelte`
   and `src/routes/auction/stats/+page.svelte` are 195-line near-clones: the
   entire layout, the stat-grid markup, the whole `<style>` block, and the
   `pct()` helper are identical — they differ only in titles, labels, and which
   persistence trio they call. Fix: new `src/lib/ui/StatsPage.svelte` that
   renders the page chrome (back link — via item 2's BackLink — header, grouped
   stat rows, and the reset ArmedButton) from data props
   (`title`, `subtitle`, `backHref`/`backLabel`, `groups` of label/value rows,
   `onreset`); each route keeps only its own state, `pct` usage, and reset
   logic. Both pages shrink to a screenful; a future layout tweak lands once.

Also noticed, deliberately not taken:

* the suit-color ternary `isRedSuit(x) ? '#c0262d' : '#3d3a35'` is repeated
  eight times across six files — a candidate `suitColor()` helper in
  `src/lib/ui/`, left for a future round (PlayingCard's `#1a1a1a` card-face
  black is deliberately different and would stay);
* the `doc/TODO-misc.md` item "45s game should stop at 45" (counting out
  mid-hand) remains a real rules change — it interacts with the Milestone 1
  both-cross-45 rule call and needs tests written first (SPEC §13) — so it
  still deserves its own TODO, not a quick-win pass.

* bump version to 0.2.45 (in `package.json`, per TODO-041)

### Implementation notes (done)

* **Item 1** — the README's Play Auction bullet now lists all five configurable
  rule calls: kitty on/off, post-trump card exchange, the dealer's option to
  hold the bid, who leads the first trick, and how the game finishes.
* **Item 2** — new `src/lib/ui/BackLink.svelte` (props `href`, `label`; renders
  the arrow itself) owns the top-nav markup and the tap-target/focus-ring CSS.
  All eight pages swapped their `<nav class="top-nav">` block for
  `<BackLink … />` and dropped the duplicated CSS. Verified in the production
  build: every prerendered page's back link carries the same scoped-CSS hash
  (one component) with the correct target.
* **Item 3** — new `src/lib/ui/StatsPage.svelte` renders the whole stats-page
  chrome (BackLink, header, grouped `dl` rows, reset ArmedButton) from data
  props; a `<script module>` block exports the `StatGroup`/`StatRow` types and
  the shared `pct()` helper, so even the percentage formatting lives in one
  place. Both routes shrank to ~48 lines: their own `<svelte:head>`,
  persistence wiring, a `$derived` groups array, and the reset handler.

Version bumped 0.2.44 → 0.2.45. Verified: `npm run check` 0 errors/0 warnings,
425/425 tests, production build succeeds with 0.2.45 in `/about`, back links
prerendered on all eight subpages, and both stats pages' headings, rows, and
reset button prerendered as before.

### Files committed

* `src/lib/ui/BackLink.svelte` (new shared back-nav component)
* `src/lib/ui/StatsPage.svelte` (new shared stats-page chrome, exports `pct`)
* `src/routes/play/stats/+page.svelte`, `src/routes/auction/stats/+page.svelte`
  (rewritten onto StatsPage)
* `src/routes/play/+page.svelte`, `src/routes/auction/+page.svelte`,
  `src/routes/trainer/+page.svelte`, `src/routes/play/config/+page.svelte`,
  `src/routes/auction/config/+page.svelte`,
  `src/routes/trainer/reference/+page.svelte` (BackLink swap)
* `README.md` (Auction rule-call list)
* `package.json` (version 0.2.44 → 0.2.45)
* `doc/TODO-045.md` (this file)
