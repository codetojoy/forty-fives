
### TODO-014 [COMPLETE]

On screens ≥48rem the Auction game now seats the four players around the central
trick area — you at south (hand spanning the full width), partner at north, and
the two opponents at east/west (seat 1 → east, seat 3 → west, per the "play
proceeds to your left" convention). It's a CSS-only re-layout in
`auction/+page.svelte`: a `.table-layout` grid with `grid-template-areas`, gated
behind a `@media (min-width: 48rem)` query, with `display: contents` on `.seats`
so each seat panel is placed individually. The DOM order is unchanged, so the
mobile stack and keyboard/screen-reader order are untouched. Version bumped to
0.13.0. Original task notes below.

For screen displays of appropriate size (i.e. larger than mobile), re-orient the Auction Forty-Fives game so that the players are seated around "the table" (i.e. where the cards are played).

The user should be at the south; the partner should be at the north; and the other players at east and west.

The goal here is to make the UI closer to the eventual video game UI. 

