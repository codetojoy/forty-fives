
### TODO-020 [COMPLETE]

UI text clean-up on the auction page to reduce vertical scroll. Removed two
explanatory `<p>` lines: the name-trump panel's "You'll then take the three-card
kitty and discard back down to five." and the exchange-cards panel's "Tap up to
five cards to exchange with the deck, then draw — or stand pat to keep your hand
(N chosen)." Each panel keeps its `<h2>` and action buttons; the exchange
panel's removed "N chosen" count is still conveyed by its button label ("Stand
pat" / "Exchange N"), so no information is lost. The analogous kitty-discard line
was left untouched (out of scope). No CSS or logic changes.

Verified: `npm run check` clean; full suite 409 passing; a headless-Chrome smoke
drove the human to win the bid and confirmed the name-trump panel now renders
without the kitty blurb, both removed strings are absent from the page, and there
were no console errors. Version bumped to 0.1.20 (literal, per the task note).
Original task notes below.

The goal for this TODO is some UI clean-up with respect to text. Details:

* When the user wins a bid, the current UI displays "You'll then take the three-card kitty and discard back down to five.". This is too verbose and should be removed, including any <div> as we want to reduce vertical space/scroll.
* During exchange cards phase, we display a message in the "table". So under the Exchange Cards section, we can remove the text "Tap up to five cards to exchange with the deck, then draw — or stand pat to keep your hand (0 chosen).", including any <div> as we want to reduce vertical space/scroll.
 
Bump version to 0.1.20 (this skips values from previous, but that is OK)
