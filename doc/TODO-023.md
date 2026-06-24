
### TODO-023 [COMPLETE]

A new "Ranking reference" link on the Ranking Trainer (on the setup screen and in
the in-quiz footer) opens a new prerendered page at `/trainer/reference`
(`src/routes/trainer/reference/+page.svelte`). The page lists every suit's card
order, highest to lowest, for both scenarios — when the suit is trump (with the
A♥ shown spliced in) and when it is not trump — rendered as small static
`PlayingCard` faces straight from `STANDARD_SCHEME`'s `trumpRankings` /
`plainRankings`. Pure presentation: no domain/AI changes. Version bumped to
0.1.23. Original task notes below.

In Ranking Trainer game, add a new button that takes the user to a reference page.

The new reference page should list the suits in order, for the various scenarios for trump/non-trump.

The idea is a simple guide for users to examine, outside of game play.

* bump version to 0.1.23

