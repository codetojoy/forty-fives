
### TODO-060 [COMPLETE]

Let the player rename the three AI opponents in Auction Forty-Fives.

* On `/auction/config`, add three editable text fields for the AI seats:
    * seat 2 (partner) and seats 1 & 3 (opponents); seat 0 is always "You" and is
      not editable
    * default names stay Stewart (1), Margaret (2), Bernadette (3)
    * blank / whitespace-only entries fall back to that seat's default name
    * trim input and cap the length at 18 chars (see confirmed answer below) so the
      table layout holds

* Names are a **display preference, not a rules setting**: they live in the
  auction game save (`SavedAuctionGame.names`), alongside the other "always
  editable" prefs on the config page — not in the snapshotted rules config
  (`AuctionConfig`). So a rename applies **live to the in-progress game**, unlike
  a rules change (which only affects the next New game).

* Avatars must not change on rename: faces are already keyed by seat index (not by
  name), so no avatar work is needed — just don't regress that decoupling.

* Out of scope: the 1v1 `/play` game keeps its own hard-coded `AI_NAMES` and
  stored `opponentName`; renaming there is a separate follow-up if wanted.

* bump version to 0.2.60

---

### Impact assessment (pre-implementation notes)

Low impact — the storage, load-time validation, and reactive display for per-seat
names already exist; this is mostly a UI addition plus wiring. No domain changes,
no persistence-shape changes, no risk to the Flutter-port purity rule (the domain
knows only seat indices).

Where things stand today:

* `SavedAuctionGame.names: string[]` is already persisted and loaded
  (`persistence.ts`), validated on load, and rendered per-seat via `name(seat)`
  on the Auction page.
* The `['You', 'Stewart', 'Margaret', 'Bernadette']` literal is hard-coded only as
  the **default** (`auctionNames()` in `persistence.ts`); everything downstream
  treats names as data.
* Avatars are keyed by seat index in `auction/+page.svelte` (with an explicit
  comment that a rename must not change a face), so they're already rename-safe.
* The config page already loads the auction save and writes it back on Save, so
  editing/persisting `names` slots into the existing flow.

Expected touch points:

* `src/routes/auction/config/+page.svelte` — three text inputs (seats 1–3),
  included in the page's `dirty` check and `save()`.
* `src/lib/ui/persistence.ts` — per-seat name normalization on save/load (trim,
  length cap, per-seat default fallback; today's load check is all-or-nothing).
* `tests/ui/persistence.test.ts` — normalization cases (blank → default, trim,
  over-length).

Q: Open question to confirm before building: cap length and exact fallback behaviour
(per-seat vs all-or-nothing) as above.

A: Use cap length of 18. Use default fallback behaviour of per-seat.

---

**Status: complete** (implemented 2026-07-10).

### Implementation notes (done)

As predicted, low impact — the per-seat `names` array was already stored, loaded,
and rendered by seat; avatars were already keyed by seat index. No domain changes.

* **`persistence.ts`:** added `AUCTION_NAME_MAX_LEN = 18` and an exported
  `normalizeAuctionNames(value, defaults)` — per-seat coercion: seat 0 is forced to
  "You"; each AI seat keeps its trimmed, 18-capped value or falls back to *its own*
  default when missing/blank/non-string (a bad seat never poisons the others).
  `loadAuctionGame` now calls it, replacing the old all-or-nothing check (which
  reset all names if any one was blank). `AUCTION_SEATS` was no longer needed there.
* **`auction/config/+page.svelte`:** a new "Players — always editable" fieldset with
  three text inputs (partner = seat 2, opponents = seats 1 & 3), `maxlength=18`, the
  stored name as placeholder. Wired into the page's `dirty` check and `save()`;
  `save()` normalizes before persisting so a blank commits the default. Names sit
  with the other always-editable prefs, not the rules profile.
* **Live apply:** names live in the game-save envelope (not snapshotted into
  `AuctionGameState.config`), so a rename does not reset the running game; the new
  names show the next time the `/auction` route loads — same mechanism as the
  existing display prefs.
* **Avatars:** unchanged — already keyed by seat index in `auction/+page.svelte`,
  so a renamed seat keeps its face.
* **Out of scope (unchanged):** the 1v1 `/play` game's `AI_NAMES` / `opponentName`.

### Files committed

* `src/lib/ui/persistence.ts` (`AUCTION_NAME_MAX_LEN`, `normalizeAuctionNames`, load wiring)
* `src/routes/auction/config/+page.svelte` (Players fieldset, dirty/save wiring, input styles)
* `tests/ui/persistence.test.ts` (normalizeAuctionNames cases)
* `package.json` (version 0.2.59 → 0.2.60)
* `doc/TODO-060.md` (this file)

Verified: `npm run check` 0 errors/0 warnings, **497/497** tests, production build
succeeds; `build/auction/config.html` shows the "Players — always editable" fieldset
with the three name inputs.
