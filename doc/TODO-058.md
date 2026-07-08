
### TODO-058 [COMPLETE]

* Define a new Customer Profile, "Common PEI"
    * this should now be the default Customer Profile, not "Wikipedia"
    * the values are:
        * "Use kitty": enabled 
        * "Allow discard when not bid-winner": enabled
        * "Allow dealer to hold the bid": disabled
        * "Finish Game Rule": "120 points reached"
        * "First-trick Leader": "Left of the bid winner" 

* Rename the Customer Profile "Rec Hall" to "Rec Hall PEI"

* bump version to 0.2.58

**Status: complete** (implemented 2026-07-08).

### Implementation notes (done)

Profiles are data (SPEC §6): the change is confined to `auction-config.ts` plus the
tests and copy that name the profiles. No game logic branches on profile — the
config page and AI read `PROFILE_IDS`/`BUILTIN_PROFILES` dynamically, so the config
UI picked up the new/renamed profiles with **no UI code change**.

* Added `'Common PEI'` to `BUILTIN_PROFILES` (kitty on, discard on, no hold, 120,
  left-of-bidder leads) and to `PROFILE_IDS` in the first (default) slot.
* Renamed the `'Rec Hall'` profile key to `'Rec Hall PEI'` (values unchanged) and
  widened the `AuctionProfileId` union / `BUILTIN_PROFILES` record type.
* `DEFAULT_PROFILE` → `'Common PEI'`; `defaultCustomValues()` now seeds Custom from
  Common PEI. Updated the surrounding doc-comments (they previously justified the
  Wikipedia default).
* **FAQ copy (folded in):** the "Wikipedia vs Rec Hall" entry was doubly stale
  (new default; renamed profile). Rewrote it to describe all three built-in
  profiles plus Custom.
* Cosmetic: `deck.ts` comment now says "Rec Hall PEI".

**Migration note (decided: skip):** an existing localStorage config with
`profile: 'Rec Hall'` is no longer a known id, so `normalizeAuctionConfig` resets it
to the new default (Common PEI). Acceptable for alpha — no remap added.

**Test fallout (fixed):** `startAuction`'s config defaults to `defaultSettingValues()`,
which is now Common PEI (hold **off**, discard **on**). Tests that piggy-backed on the
old default's hold/no-draw behaviour were made explicit rather than depending on the
default:
* `auction-config.test.ts` — updated the profile list, values, defaults, and
  `normalizeAuctionConfig` expectations to the new default; added a Common PEI case.
* `auction-hold.test.ts` — added a `HOLD_ON` config and threaded it through the hold
  tests (the default no longer allows holding).
* `auction-game-state.test.ts` and `ui/persistence.test.ts` — added a `KITTY_NO_DRAW`
  config (kitty on, no discard) for the tests whose helpers assume kitty → discard →
  play with no drawing phase (the new default adds one).
* `ai/auction-ai.test.ts` — the dealer-hold bid test now starts from an explicit
  hold-on config.

Version bumped 0.2.57 → 0.2.58. Verified: `npm run check` 0 errors/0 warnings,
**445/445** tests (was 444 + the new Common PEI assertion), production build succeeds;
`build/faq.html` shows "Common PEI"/"Rec Hall PEI" (no bare "Rec Hall"), and the new
profiles appear in the prerendered `build/auction/config.html`.

### Files committed

* `src/lib/domain/auction-config.ts` (new Common PEI profile, default, rename)
* `src/lib/domain/deck.ts` (comment: "Rec Hall PEI")
* `src/routes/faq/+page.svelte` (rewrote the profiles FAQ entry)
* `tests/domain/auction-config.test.ts` (profiles/defaults/normalize updates + Common PEI case)
* `tests/domain/auction-hold.test.ts` (explicit HOLD_ON config)
* `tests/domain/auction-game-state.test.ts` (KITTY_NO_DRAW config)
* `tests/ui/persistence.test.ts` (KITTY_NO_DRAW config)
* `tests/ai/auction-ai.test.ts` (explicit hold-on config for the hold bid test)
* `package.json` (version 0.2.57 → 0.2.58)
* `doc/TODO-058.md` (this file)
