
### TODO-042

In Auction Forty-Fives, introduce a "hold" option during the bidding phase. For now, only the user can hold; the AI players cannot.

Define a "hold" as an used to challenge or match the highest current bid without actively raising it. The active bidder must either raise their bid or concede the bid to the user.

Modify the UI and game-logic as appropriate.

* bump version to 0.2.42

### Implementation notes (done)

Rule as implemented (decisions confirmed 2026-07-03): the hold is the **dealer's**
privilege (the traditional rule — the dealer speaks last), gated by a new
**ALLOW_HOLD** config setting that is on in both built-in profiles, and **repeatable**.
Only the human ever holds — the domain allows any dealer seat, but the AI never
chooses it.

* **Domain** (`auction-game-state.ts`): the `bidding` phase gains `heldBy`, and a new
  pure `holdBid(state, seat)` transition models a hold as *taking over the high bid at
  the same value* — `highBidder` becomes the holder, every other seat is marked passed
  (the auction becomes a duel), and the turn goes to the displaced bidder. The existing
  `placeBid` (raise — which also clears `heldBy`) and `passBid` (concede; the auction
  resolves to the holder at the held value) then work unchanged, including scoring,
  kitty rights, and naming trump. Holding a 30 wins outright (no raise exists).
  `holdBid` throws on: no standing bid, own bid, non-dealer seat, out of turn, wrong
  phase, or `ALLOW_HOLD` off in the game's snapshotted config.
* **Config** (`auction-config.ts`): `ALLOW_HOLD` boolean, `true` in Wikipedia and
  Rec Hall; `normalizeAuctionConfig` fills it for configs stored before this TODO.
  Games saved mid-bidding before this TODO simply have no `ALLOW_HOLD` in their
  snapshot, so the hold stays off for them — the next New game picks it up.
* **AI** (`auction-ai.ts`): zero changes — after a hold, `chooseBid` for the displaced
  bidder already returns the minimum legal raise it can afford, or pass (= concede).
* **UI** (`auction/+page.svelte`): a Hold button in the bid panel (shown only when
  `holdBid` would be legal) with an explanatory sentence in the panel; hold/raise/
  concede messages; a How-to-play bullet shown when the next game allows holding.
  The config page picks the setting up automatically (it iterates `SETTINGS`).
* **Tests first** (SPEC §13): `tests/domain/auction-hold.test.ts` (13 cases: the
  legality matrix and the full duel — concede, re-hold after a raise, forced
  concession at 30, holder raising/passing out, holding the partner's bid) was
  written and failing before the rules code; plus an AI raise-or-concede property
  and config normalization coverage. 410 → 425 tests.

Like USE_KITTY and ALLOW_DISCARD, ALLOW_HOLD is a rule call awaiting real-player
validation (SPEC §6) — the "hold vs pass" question in `doc/TODO-misc.md`.

Version bumped 0.2.41 → 0.2.42 (in `package.json`, per TODO-041). Verified:
`npm run check` clean, 425/425 tests, production build succeeds.

### Files committed

* `src/lib/domain/auction-game-state.ts` (`heldBy`, `holdBid`)
* `src/lib/domain/auction-config.ts` (`ALLOW_HOLD`)
* `src/routes/auction/+page.svelte` (Hold button, messages, How-to-play bullet)
* `src/routes/auction/config/+page.svelte` (toggle type widened)
* `tests/domain/auction-hold.test.ts` (new, written first)
* `tests/domain/auction-config.test.ts`, `tests/domain/auction-game-state.test.ts`,
  `tests/ai/auction-ai.test.ts` (new setting/field in literals + new AI property)
* `package.json` (version 0.2.41 → 0.2.42)
* `CLAUDE.md`, `doc/TODO-misc.md`, `doc/TODO-042.md` (this file)
