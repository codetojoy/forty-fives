
### TODO-059 [COMPLETE]

* Define a new Config Setting:
    * "Num cards in kitty" (integer)
    * default value is 3
    * all previous config profiles use value 3

* Refactor app, if needed, to accommodate dynamic value for "Num cards in kitty"

* Define a new Config Profile, "Tignish PEI"
    * the values are:
        * "Use kitty": enabled 
        * "Allow discard when not bid-winner": enabled
        * "Allow dealer to hold the bid": disabled
        * "Finish Game Rule": "120 points reached"
        * "First-trick Leader": "Left of the bid winner" 
        * "Num cards in kitty": 5

* bump version to 0.2.59

**Status: complete** (implemented 2026-07-10).

### Implementation notes (done)

Kitty size is now data (SPEC §6), like every other rule. `NUM_KITTY` is a genuine
integer setting — the settings registry gained a third generic type, `integer`,
with `min`/`max` bounds — rendered by a generic branch, so no game logic branches
on the specific setting.

* **`auction-config.ts`:** added `'NUM_KITTY'` to `AuctionSettingCode`; new
  `IntegerSetting` type (`min: 1, max: 5`) in the `AuctionSetting` union and in
  `SETTINGS` (placed right after `USE_KITTY`, which it qualifies). `NUM_KITTY:
  number` added to `AuctionSettingValues`; every built-in profile got `NUM_KITTY:
  3`. Added the **Tignish PEI** profile (Common PEI values but `NUM_KITTY: 5`) to
  `BUILTIN_PROFILES`, `PROFILE_IDS` (before Custom), and the `AuctionProfileId`
  union. `normalizeValues` grew an `integer` branch: an out-of-range or non-integer
  stored value falls back to the default (3), so old saves stay valid.
* **`deck.ts`:** `dealAuction`'s third param changed from `useKitty: boolean` to
  `kittySize: number` (0 = no kitty), subsuming the boolean.
* **`auction-game-state.ts`:** removed the hardcoded `KITTY_SIZE = 3`; the dealer
  passes `config.USE_KITTY ? config.NUM_KITTY : 0`, and `discardKitty` validates
  against `config.NUM_KITTY`. The mechanics already generalized (take kitty → hold
  `5 + N` → discard `N` back to five).
* **`ai/auction-ai.ts`:** `chooseKittyDiscards` drops `config.NUM_KITTY` weakest
  cards (was a hardcoded 3). The bid-estimate kitty "lift" stays a boolean-driven
  heuristic (magnitude only; doesn't affect suit choice), so it was left alone.
* **UI:** the config page gained one generic `integer` render branch — a −/value/+
  stepper with 48px targets (read-only value for built-in profiles). The Auction
  play page's ~7 hardcoded "three"/3 discard literals are now driven by
  `game.config.NUM_KITTY` (via a `kittySize` derived; the intro reads the next
  game's config). The new/renamed profiles otherwise appear automatically.
* **FAQ:** the profiles entry now names Tignish PEI (a five-card-kitty variant).
* Cosmetic doc-comments naming "three-card kitty" were generalized.

**Test fallout (fixed):** adding a required `NUM_KITTY` field to
`AuctionSettingValues` meant every inline config literal in the suite had to add it
(`persistence.test.ts`, `auction-hold.test.ts`, `auction-game-state.test.ts`,
`auction-ai.test.ts`, and the `auction-config.test.ts` assertions). New coverage:
the integer-setting shape and normalize keep/reject cases; the Tignish PEI profile;
a `dealAuction(rng, 4, 5)` deal test; a five-card-kitty take/discard integration
test (holds 10, must discard exactly 5); and a five-card-kitty all-AI self-play
config.

Version bumped 0.2.58 → 0.2.59. Verified: `npm run check` 0 errors/0 warnings,
**490/490** tests, production build succeeds; `build/auction/config.html` shows
"Num cards in kitty" and "Tignish PEI", and `build/faq.html` names Tignish PEI.

### Files committed

* `src/lib/domain/auction-config.ts` (integer setting type, NUM_KITTY, Tignish PEI, normalize)
* `src/lib/domain/deck.ts` (dealAuction kittySize param)
* `src/lib/domain/auction-game-state.ts` (drop KITTY_SIZE; thread NUM_KITTY)
* `src/lib/ai/auction-ai.ts` (chooseKittyDiscards uses NUM_KITTY)
* `src/routes/auction/config/+page.svelte` (integer stepper render branch + styles)
* `src/routes/auction/+page.svelte` (kitty-size-driven discard UI)
* `src/routes/faq/+page.svelte` (Tignish PEI in the profiles entry)
* `tests/domain/deck.test.ts` (kittySize 0 and 5 deal tests)
* `tests/domain/auction-config.test.ts` (integer setting, Tignish PEI, NUM_KITTY everywhere)
* `tests/domain/auction-game-state.test.ts` (NUM_KITTY in configs + five-card-kitty test)
* `tests/domain/auction-hold.test.ts` (NUM_KITTY in configs)
* `tests/ai/auction-ai.test.ts` (NUM_KITTY in configs + Tignish self-play config)
* `tests/ui/persistence.test.ts` (NUM_KITTY in config)
* `package.json` (version 0.2.58 → 0.2.59)
* `doc/TODO-059.md` (this file)

