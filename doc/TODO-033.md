
### TODO-033 [COMPLETE]

Added a Stats page for Auction Forty-Fives (`/auction/stats`), a secondary route
modelled on `/auction/config`, reached from a new `Stats →` link beside
`Configure →` in the intro. It shows the four requested figures for the human's
team: total tricks and % of tricks won, total games and % of games won (each
percentage shows an em dash until there's data). A "Reset stats" button (tap-twice
to confirm) clears the tallies.

Stats are a new local-only blob in `persistence.ts` (`forty-fives.auction-stats.v1`,
SSR-safe, per-field validation reusing `isCount`), deliberately kept out of
`AuctionGameState` so saved games stay pure data — same approach as the trainer
stats (SPEC §7 forbids network analytics, not local counts). Recording happens at
the single chokepoint every trick passes through (`applyPlay` in
`auction/+page.svelte`): one tally per completed trick (human or AI), and — since a
game can only end on a final-trick `playCard` — game completion is detected there
too, so each fires exactly once per transition. Abandoned games are not counted.
No domain/AI changes.

Verified: `npm run check` clean (0 errors); full suite 410 passing; production
build prerenders `build/auction/stats.html`; a preview-server smoke confirmed the
Stats page renders all four stats + reset and the intro's `Stats →` link points to
the route. Version bumped to 0.1.33. Original task notes below.

* For Auction Forty-Fives, add a new secondary link/page (analogous to Configure) for Stats.
* The Stats page should display:
    * total # of tricks
    * % of tricks won by user's team
    * total # of games
    * % of games won by user's team 
* version bump to 0.1.33
