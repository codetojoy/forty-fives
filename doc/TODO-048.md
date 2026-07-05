
### TODO-048

The UI for Auction Forty-Fives game remains very cluttered for mobile devices (e.g. iPhone SE 2020). This leads to scrolling and an unpolished UX experience.

The mitigation in this TODO is:
* new config value: "hide players"
    * value is boolean
    * default is false
    * not impacted by Configuration Profiles  
* when config value is enabled, the UI should not render the usual players section (i.e. Margaret, Stewart, Bernadette and their hidden cards). 
    * there should not be any awkward blank space

* bump version to 0.2.48

**Status: complete** (implemented 2026-07-05).

### Implementation notes (done)

The requirement "not impacted by Configuration Profiles" decided the architecture:
"hide players" is a *display preference*, so it lives in the game-save envelope's
`AuctionGameSettings` (alongside `highlightLegal`, `confirmPlay`,
`alwaysExchangeNonTrump`), **not** in the rules `AuctionConfig` (the
Wikipedia/Rec Hall/Custom profiles). Because it lives there, switching profiles
never touches it — the requirement holds by construction.

* `AuctionGameSettings` gains `hidePlayers: boolean`; `auctionDefaults()` sets it
  `false`, and `loadAuctionGame` reads it with the same `?? default` fallback the
  other prefs use, so older saves load cleanly.
* `/auction/config` adds a "Hide other players" toggle in the *Display &
  interaction — always editable* fieldset, wired into `prefs` and the dirty check.
* `/auction` wraps the `.seats` `<section>` in `{#if !settings.hidePlayers}` and
  adds `class:players-hidden` to `.table-layout`. On mobile the section simply
  isn't rendered. On the wide grid (≥48rem) a `.table-layout.players-hidden`
  override collapses the seat template to a single full-width column
  (`center → south → msg → panels`), so no empty north row or 7rem side gutters
  remain — the "no awkward blank space" requirement.
* Because hiding the seat panels would otherwise lose the per-seat bid board
  (`bid 20` / `passed` / `thinking…` lives only there), a compact one-line
  `bidSummary` renders under the header **only** while `hidePlayers` is on and the
  phase is `bidding` (e.g. "Stewart: bid 20 · Margaret: passed · Bernadette:
  thinking…"), reusing `name(seat)` + `bidStatus(seat)` for seats [2, 1, 3]. It is
  gated on the bidding phase, so it never coexists with the reserved-height play
  region (no anti-jump conflict, TODO-015).
* No new domain test: the only non-UI logic is the load/save default, which
  parallels the untested-by-convention `alwaysExchangeNonTrump` pref. The existing
  `tests/ui/persistence.test.ts` envelope helper was updated to include the new
  field so the suite type-checks.

Version bumped 0.2.47 → 0.2.48. Verified: `npm run check` 0 errors/0 warnings,
441/441 tests, production build succeeds with 0.2.48 in `/about` and the "Hide
other players" toggle prerendered on `/auction/config`.

### Files committed

* `src/lib/ui/persistence.ts` (`hidePlayers` on `AuctionGameSettings`, default,
  load fallback)
* `src/routes/auction/config/+page.svelte` (toggle + dirty check)
* `src/routes/auction/+page.svelte` (conditional seats, `players-hidden` grid
  override, compact bid summary)
* `tests/ui/persistence.test.ts` (envelope helper updated for the new field)
* `package.json` (version 0.2.47 → 0.2.48)
* `doc/TODO-048.md` (this file)

