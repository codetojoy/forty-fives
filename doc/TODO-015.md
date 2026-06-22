
### TODO-015 [COMPLETE]

The wide "around the table" layout (≥48rem) no longer jumps as content changes.
The table cross (north/center/south) is held static by reserving worst-case space,
measured empirically from a real game via headless Chrome:

* **Trick area (center):** fixed `height: 18rem`, sized to the worst case (four
  played cards + the trick-winner feedback + the Next-trick button), so finishing
  a trick fills already-reserved space instead of growing the cell and
  re-centering the cross. The trick cards are pinned to a single row in the wide
  layout (`flex-wrap: nowrap`, `--card-width: 64px`) to keep that height sane —
  without it the four cards wrapped to two rows and the worst case was ~34rem.
* **Seats:** `min-height: 9.5rem`, plus an always-rendered (empty off-bidding)
  `.seat-status` line and a `min-height` on `.seat-cards`, so a seat keeps a
  constant height across phases and as its face-down cards are played out (5 → 0).
* **Your hand (south):** `min-height: 13rem`, and the section stays mounted (it
  renders nothing when the hand is spent) so the south row never collapses.
* The action panels are wrapped in a persistent `.panel-slot`. It sits *below*
  the cross in the grid, so its growth (e.g. the tall hand-over result) moves only
  the footer, not the table — so it is deliberately left to size naturally rather
  than reserving ~30rem of empty space during play.

The grid keeps `align-items: center`: once every region is height-stable,
centering no longer causes movement. Verified with a headless-Chrome jump test —
the north/center/south y-centers stay within 2px across bidding → trick-won →
hand-over (the 2px is the header's hand-info text, not the table). The mobile
stack (<48rem) is unchanged. Version bumped to 0.14.0. Original task notes below.

Background: For screen displays of appropriate size (i.e. larger than mobile), we now re-orient the Auction Forty-Fives game so that the players are seated around "the table" (i.e. where the cards are played).

Goal: The current UI will jump as UI elements (e.g. table) will dynamically change size depending on its contents. The goal is to address this jumping so that UI stays relatively static.

