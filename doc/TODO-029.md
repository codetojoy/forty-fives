
### TODO-029 [COMPLETE]

Implemented BRAINSTORM-028 mitigation #1: the current trump suit is now folded into
the Auction "Your hand" heading (`auction/+page.svelte`), e.g. "Your hand · ♥
Hearts trump", so mobile players see what's trump right where they choose a card
instead of scrolling up to the header. Shown only once trump is named (gated on
`game.trumpSuit`), with suit symbol + name + trump colour (never colour-only, SPEC
§7). It lives inside the existing `h2`, so there's no new block and no anti-jump
regression (TODO-015). Version bumped to 0.1.29. Original task notes below.

Background
* read doc/TODO-028.md for problem description and doc/BRAINSTORM-028.md for solution options

Goal
* implement mitigation #1 ("Trump on the "Your hand" heading") 
* version bump to 0.1.29

