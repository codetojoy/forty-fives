
### TODO-035 [COMPLETE]

Added an "Exchange All" convenience button to the Auction Forty-Fives draw
(Exchange) phase. It appears only when it is the human's turn to draw and the
hand holds no trump (A♥ counts as trump via the domain's `isTrump`, so a hand
with it does not qualify — it is never a throw-everything-back hand). One tap
exchanges all five cards, equivalent to selecting all and clicking "Exchange 5".

UI-only change in `src/routes/auction/+page.svelte`: imported `isTrump`, added a
`humanHasNoTrump` derived (`$derived.by`, to narrow `game`/`trumpSuit` inside the
`.some` closure), an `exchangeAll()` action calling the existing `drawCards` with
the full hand, and the gated button in the draw panel beside Stand pat / Exchange
N (reuses `.big-button`, no CSS). No domain or AI changes.

Verified: `npm run check` clean (0 errors); full suite 410 passing. Version
bumped to 0.1.35. Original task notes below.

* For Auction Forty-Fives, during the Exchange phase (after a bid is won), add this:
    * if the user has no trump
    * add a button "Exchange All" that is a convenience for selecting all cards and then clicking "Exchange 5"
* version bump to 0.1.35
