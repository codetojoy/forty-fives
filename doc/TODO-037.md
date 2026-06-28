
### TODO-037 [COMPLETE]

Added an "Always exchange non-trump" preference to Auction Forty-Fives. It lives in
the config page's "Display & interaction — always editable" group, which is
independent of the rules profile (Wikipedia/Rec Hall/Custom) — so selecting a
profile never changes it. Default off.

When on, the draw (Exchange) phase becomes a selection-free one-tap flow: the panel
shows "Stand pat" and "Exchange Non-trump" (no "Exchange N" label, no card
selection — the hand isn't tappable during the draw), and "Exchange Non-trump"
swaps every non-trump card while keeping trumps (A♥ counts as trump via `isTrump`,
so it's kept). When off, the draw is unchanged, including TODO-035's "Exchange All"
shortcut for a no-trump hand.

Stored as a new auction-only `AuctionGameSettings` field (extends the shared
`GameSettings`) in the auction game save, so the 1v1 game — which has no draw phase
— is untouched; per-field load fallback keeps older saves resuming. No domain or AI
changes (purely a human-UI convenience; AI drawing is unaffected).

Verified: `npm run check` clean (0 errors/warnings); full suite 410 passing;
production build succeeds; preview smoke confirmed the new toggle renders in the
always-editable group and /about shows 0.1.37. Version bumped to 0.1.37. Original
task notes below.

For Auction Forty-Fives, new config setting for "Always exchange non-trump" 

Goals:
* new setting is not impacted by Configuration Profiles
* default value for new setting is false
* if new setting is enabled, then the Exchange button does not read "Exchange N" but rather "Exchange Non-trump" and appears when "Stand Pat" appears: i.e. no cards need to be selected 
* version bump to 0.1.37

