
### TODO-052

In Auction Forty-Fives, allow a new config setting for "Hand Order".

This config setting has the following values:
* none
* strongest to weakest

This config setting is read-write, not impacted by Configuration Profile, and defaults to "none".

The application of the config setting:
* "none" -> no change to app
* "strongest to weakest" -> when rendering the user's hand, sort the hand from strongest to weakest:
    * trump first, with secondary sort on rank
    * the order of non-trump suits can just be alphabetical  (clubs, diamonds, hearts, spades) with secondary sort on rank   
        * if there is a better idea here, please push back

* bump version to 0.2.52

**Status: complete** (implemented 2026-07-07).

### Implementation notes (done)

Two clarifications settled during planning shaped this:

1. **"Secondary sort on rank" means the *game's* ranking, not face rank.** In
   Forty-Fives strength ≠ face value (5 > J > A♥; black number cards reversed;
   A♦ lowest off-trump). Sorting by face rank would contradict "strongest to
   weakest", so trump is sorted by `trumpStrength` (the 5/J/A♥ ladder) and each
   non-trump suit by `plainStrength` — both already in `trump-scheme.ts`.
2. **No sorting during bidding.** The sort only runs once a trump suit exists
   (`game.trumpSuit !== null`); before then strength is undefined (it depends on
   which suit becomes trump). This is both simpler and better UX: the hand sits
   in dealt order during bidding, then snaps into strength order the moment trump
   is named. It also erased the two thorniest edge cases — the null-trump branch,
   and A♥'s null `plainStrength`: because A♥ is *always* trump, once a trump suit
   exists it lands in the trump group via `isTrump` and every non-trump card then
   has a defined `plainStrength` (no null guard needed).

Where it lives: "read-write, not impacted by Configuration Profile, default
none" is the signature of a *display preference*, so `handOrder:
'none' | 'strongest-first'` went in `AuctionGameSettings` (the game-save
envelope), **not** the rules `AuctionConfig` — profiles never touch it by
construction (same pattern as `hidePlayers`, TODO-048). A string union (not a
bare boolean) leaves room for a future third mode.

* New pure helper `src/lib/ui/hand-order.ts` — `sortHandStrongestFirst(cards,
  trumpSuit, scheme)` returns a sorted *copy* (never mutates): trump first by the
  game's trump ranking, then non-trump grouped by suit alphabetically (clubs,
  diamonds, hearts, spades) and within a suit by in-suit strength. Kept as a
  standalone UI-layer function (UI may import domain) so the tricky logic is
  testable without polluting the pure domain.
* New test `tests/ui/hand-order.test.ts` (3 cases) pins the traps: the
  5/J/A♥ trump ladder ordering (proving it's not face rank), A♥ sorting into the
  trump group though it's a heart, A♦ lowest off-trump, the reversed black
  number cards (2♠ before 10♠), no-mutation, and A♥ third when hearts are trump.
  Expected orders were cross-checked against `standard.json`.
* `src/lib/ui/persistence.ts` — `handOrder` on `AuctionGameSettings`, default
  `'none'` in `auctionDefaults()`, `?? default` fallback in `loadAuctionGame`
  (older saves load clean). `tests/ui/persistence.test.ts` envelope helper updated
  for the new field.
* `src/routes/auction/config/+page.svelte` — a "Sort hand strongest first" toggle
  in the *Display & interaction* fieldset, wired to the string union via a Svelte 5
  function binding (checked ⇒ `'strongest-first'`) and into the dirty check.
* `src/routes/auction/+page.svelte` — a `$derived` `displayHand` (sorted copy when
  the pref is on *and* trump exists, else the hand as-is); the "Your hand" `{#each}`
  now iterates it. Play/selection is card-based (`tapCard(card)`, `isSelected(card)`),
  so reordering display never reaches the domain or AI.

Version bumped 0.2.51 → 0.2.52. Verified: `npm run check` 0 errors/0 warnings,
444/444 tests (the 3 new hand-order cases included), production build succeeds
with 0.2.52 in `/about` and the "Sort hand strongest first" toggle prerendered on
`/auction/config`. (The hand itself is in the in-game view, which doesn't
prerender, so it's confirmed via the test rather than a static-HTML grep.)

### Files committed

* `src/lib/ui/hand-order.ts` (new — pure strongest-first sort helper)
* `tests/ui/hand-order.test.ts` (new — trap-case tests)
* `src/lib/ui/persistence.ts` (`handOrder` on `AuctionGameSettings`, default, load fallback)
* `tests/ui/persistence.test.ts` (envelope helper updated for the new field)
* `src/routes/auction/config/+page.svelte` (toggle + dirty check)
* `src/routes/auction/+page.svelte` (`displayHand` derived, hand render uses it)
* `package.json` (version 0.2.51 → 0.2.52)
* `doc/TODO-052.md` (this file)

