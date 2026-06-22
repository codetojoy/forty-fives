
### TODO-017 [COMPLETE]

Added the **first-trick leader** rule as a new `FIRST_LEAD` choice setting in
`auction-config.ts` (`ELDEST` = eldest hand / left of dealer, the standard rule;
`LEFT_OF_BIDDER` = the bid winner's left-hand player). Wikipedia → `ELDEST`,
Rec Hall → `LEFT_OF_BIDDER`, Custom user-chosen. This is the first config setting
to change live trick play. In `auction-game-state.ts`, `trickLeader` returns
`(biddingSeat − 1) mod 4` for the first trick under `LEFT_OF_BIDDER`, and
`currentSeat` reverses the play rotation so the bid winner is seated to the
leader's right and therefore plays **last** in every trick — matching the
examples (user wins → West leads, user last; East wins → user leads first).
Bidding and the optional draw keep their eldest-hand order (out of scope). The
config model already supported choice settings (TODO-016), so the page renders
and persists the new option automatically; `withSavedGameDefaults` back-fills the
`ELDEST` default for pre-existing saves.

Verified: `npm run check` clean; full suite 359 passing (new domain tests assert
the leader seat and bidder-last for both rules, and two of the four AI self-play
configs now exercise the reversed rotation across 80 seeded games); a
headless-Chrome smoke confirmed Wikipedia shows "Eldest hand (left of dealer)",
Rec Hall shows "Left of the bid winner", and a Custom choice saves and survives
reload. Version bumped to 0.15.0. Original task notes below.

In Rec Hall mode, the following rule should be applied:

* given the orientation of the players where user is South, partner is North, and opponents are East/West
* given player P wins the bid
* the person to P's left should lead the trick (i.e. counter-clockwise rotation) 
    * e.g. if user wins bid, then West leads the trick and user is last to play
    * e.g. if East wins bid, the user is the first to play 

Bump version to 0.15.0
