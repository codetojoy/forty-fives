
### TODO-062 [COMPLETE]

* Define a new Config Setting:
    * "Minimum bid" 
    * default value is 15
    * all previous config profiles use value is 15

* Refactor app, if needed, to accommodate dynamic value for "Minimum bid"

* For Config Profile, "Tignish PEI"
    * set values:
        * "Allow dealer to hold the bid": enabled
        * "Minimum bid": 20

* bump version to 0.2.62

**Status: complete** (implemented 2026-07-11).

### Implementation notes (done)

`MIN_BID` is data like every other rule (SPEC §6). It is modeled as a **choice**
of the four legal bid amounts (15/20/25/30), not an arbitrary integer — a stray
value like 17 isn't a bid and would corrupt make/set scoring. The settings model's
`choice` type was widened from `string` to `string | number` to carry the numeric
`BidValue`; the existing radio-group UI and choice normalization handle it with no
new branch.

* **`bidding.ts`:** `legalBids(currentHigh, minBid = MIN_BID)` — added a floor
  parameter (`b >= minBid` on top of the strictly-higher rule). The `MIN_BID = 15`
  const stays as the default and the no-config path.
* **`auction-config.ts`:** added `'MIN_BID'` to `AuctionSettingCode`; widened
  `ChoiceSetting`'s value type; added `ChoiceSetting<'MIN_BID', BidValue>` to the
  union and a `MIN_BID` choice (options 15/20/25/30) to `SETTINGS`, placed after
  `ALLOW_HOLD` (bidding rules grouped). `MIN_BID: BidValue` added to
  `AuctionSettingValues`; `MIN_BID: 15` on Common PEI / Wikipedia / Rec Hall PEI.
  **Tignish PEI updated: `ALLOW_HOLD: true`, `MIN_BID: 20`.** Imports `type BidValue`
  from `bidding.ts` (pure domain, no cycle).
* **`auction-game-state.ts`:** `placeBid` and the stuck-dealer resolution read
  `state.config.MIN_BID` (via `legalBids(..., config.MIN_BID)` and
  `phase.highBid ?? config.MIN_BID`). The now-unused `MIN_BID` import was dropped.
* **AI + UI:** `chooseBid` passes `state.config.MIN_BID` to `legalBids` (if the hand
  can't afford the floor, options come back empty and the AI passes). The human bid
  buttons read `legalBids(game.phase.highBid, game.config.MIN_BID)`. The config page's
  `setChoice` generic gained `'MIN_BID'`; the choice renders through existing markup.
* Old saves: `withSavedGameDefaults` / `normalizeAuctionConfig` default `MIN_BID`
  to 15, so a save predating this keeps a 15 floor.

**Spec fix:** line 9 said *"Num cards in kitty"* (copy-paste from TODO-059);
corrected to *"Minimum bid"*.

**Test fallout (fixed):** the new required `MIN_BID` field meant every inline
`AuctionSettingValues` literal across the suite gained `MIN_BID: 15`
(`auction-game-state`, `auction-hold`, `auction-ai`, `persistence`, and the
`auction-config` assertions). New coverage: the `MIN_BID` choice shape; `legalBids`
with a raised floor; the `MIN_BID` normalize keep-20/reject-22 case; the Tignish PEI
profile (`ALLOW_HOLD: true`, `MIN_BID: 20`); and a domain test that with `MIN_BID: 20`
an opening 15 is rejected and the stuck dealer lands on 20.

Version bumped 0.2.61 → 0.2.62. Verified: `npm run check` 0 errors/0 warnings,
**501/501** tests, production build succeeds; `build/auction/config.html` shows the
"Minimum bid" control.

### Files committed

* `src/lib/domain/bidding.ts` (legalBids minBid floor)
* `src/lib/domain/auction-config.ts` (MIN_BID choice, numeric choice values, Tignish update)
* `src/lib/domain/auction-game-state.ts` (thread config.MIN_BID into bidding)
* `src/lib/ai/auction-ai.ts` (chooseBid respects the floor)
* `src/routes/auction/+page.svelte` (human bid buttons respect the floor)
* `src/routes/auction/config/+page.svelte` (setChoice accepts MIN_BID)
* `tests/domain/bidding.test.ts` (raised-minimum cases)
* `tests/domain/auction-config.test.ts` (MIN_BID setting/profiles/normalize + Tignish)
* `tests/domain/auction-game-state.test.ts` (MIN_BID in configs + honours-floor test)
* `tests/domain/auction-hold.test.ts` (MIN_BID in configs)
* `tests/ai/auction-ai.test.ts` (MIN_BID in configs)
* `tests/ui/persistence.test.ts` (MIN_BID in config)
* `package.json` (version 0.2.61 → 0.2.62)
* `doc/TODO-062.md` (this file)

