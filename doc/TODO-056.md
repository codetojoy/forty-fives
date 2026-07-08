
### TODO-056 

* This TODO is adding the following items to the FAQ page:

<faq-item>
Q: In Configure for Auction, what is Wikipedia vs Rec Hall?
A: They set different configuration values based on the style of play. For example, Wikipedia uses a kitty, where typical Rec Hall games (on PEI) do not.
</faq-item>

<faq-item>
Q: In Configure for Auction, what is "Always exchange non-trump"?
A: When enabled, this provides a button for convenient discard of all non-trump cards, so you don't have select each one.
</faq-item>

<faq-item>
Q: In Configure for Auction, what is "Hide other players"?
A: When enabled, this removes the rendering of computer players, which is cleaner on mobile devices.
</faq-item>

<faq-item>
Q: We play Auction differently than this game.
A: We are listening! Please let us know the differences and where you are located. See $FEEDBACK_PAGE. We will try an incorporate the changes.
</faq-item>

* in the above, replace `$FEEDBACK_PAGE` with a link to the Feedback page.

* bump version to 0.2.56

**Status: complete** (implemented 2026-07-08).

### Implementation notes (done)

Only `src/routes/faq/+page.svelte` changed — no domain, persistence, or tests.

* **Segments answer model (approach A).** The `faqs` answer field went from a bare
  `string` to `string | Array<string | LinkSegment>`, where `LinkSegment` is
  `{ href, text }`. The five plain answers stay simple strings (no churn); the
  "We play Auction differently" answer is a three-part segment array so the link
  sits mid-sentence without `{@html}`. The `{#each}` renders a string answer
  directly, else walks the segments (text as text, link as `<a>`). Type-safe and
  accessible.
* **`$FEEDBACK_PAGE` → in-app link.** Replaced with `<a href="{base}/feedback">the
  Feedback page</a>` — an internal client-side nav consistent with the existing
  Home link, styled via a new `dd a` rule (accent, bold).
* **Four new entries added**, all Auction-focused (Wikipedia vs Rec Hall,
  "Always exchange non-trump", "Hide other players", and the "we play differently"
  feedback invite), appended after the two general entries so the flow is
  general → Auction config → feedback call-to-action.
* **Cleanups (as agreed).** Removed the now-inaccurate "More questions … on the
  way / a couple to get started" placeholder note and its `.placeholder-note`
  style; trimmed the "coming soon" tails from the two general answers so they read
  as finished.
* Minor: "you don't have to select each one" (fixed a small wording slip from the
  source: "don't have **to** select").

Version bumped 0.2.55 → 0.2.56. Verified: `npm run check` 0 errors/0 warnings,
444/444 tests, production build succeeds; grep of prerendered `build/faq.html`
confirms all four new question strings, the `./feedback` link ("the Feedback
page"), and that the placeholder note is gone.

### Files committed

* `src/routes/faq/+page.svelte` (segments answer model, four new entries, feedback link, cleanups)
* `package.json` (version 0.2.55 → 0.2.56)
* `doc/TODO-056.md` (this file)
