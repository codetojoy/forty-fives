
### TODO-034 [COMPLETE]

Added a Stats page for the 1v1 Forty-Fives game (`/play/stats`), the analog of the
auction Stats page (TODO-033), reached from a new `Stats →` link beside
`Configure →` in the intro. It shows the four requested figures for the human
player: total tricks and % of tricks won by you, total games and % of games won by
you (each percentage shows an em dash until there's data). A "Reset stats" button
(tap-twice to confirm) clears the tallies.

Stats are a new local-only blob in `persistence.ts` (`forty-fives.play-stats.v1`,
SSR-safe, per-field validation reusing `isCount`) — parallel to AuctionStats but
solo (`*ByUser`, a player not a team), in its own key so the two games' stats stay
independent and saved games remain pure data. Recording happens at the single
chokepoint every trick passes through (`applyPlay` in `play/+page.svelte`): one
tally per completed trick (human or AI), and — since a game can only end on a
final-trick `playCard` — game completion is detected there too, firing exactly once
per transition. In the 1v1 game `trick.winner`/`gameWinner` are seats, so "won by
you" is `=== HUMAN`. Abandoned games are not counted. No domain/AI changes.

Verified: `npm run check` clean (0 errors); full suite 410 passing; production
build prerenders `build/play/stats.html`; a preview-server smoke confirmed the
Stats page renders all four stats + reset + back link and the intro's `Stats →`
link points to the route. Version bumped to 0.1.34. Original task notes below.

* This TODO is analogous to TODO-033; now considering Forty-Fives (versus Auction Forty-Fives).
* For Forty-Fives, add a new secondary link/page for Stats.
* The Stats page should display:
    * total # of tricks
    * % of tricks won by user
    * total # of games
    * % of games won by user
* version bump to 0.1.34
