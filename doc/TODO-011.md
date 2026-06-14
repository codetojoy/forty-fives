
### TODO-011 

* This was deferred as part of TODO-010
* Goal: wire config into gameplay

TODO-010 was configuration scaffolding only — the Auction config page
(`/auction/config`) and its localStorage persistence are intentionally inert.

Applying the resolved config to play is this TODO:

* `USE_KITTY`: when false, deal no kitty and skip the name-trump → take-kitty →
  discard flow; when true, current behaviour.
* `ALLOW_DISCARD`: "allow discard when not bid-winner" — let non-winning players
  also exchange cards. This interacts with the existing rule call "only the bid
  winner uses the kitty (others keep their dealt five)" recorded in TODO-008.

When wiring this in, pass the resolved config object into the *pure* transitions
(`startAuction` / `dealAuction`), the same way the trump scheme is passed — do
not scatter `if (config.useKitty)` checks through the UI or AI. Both settings
remain rule calls awaiting real-player validation (SPEC §6); the config page
stores a preference, it does not resolve them.
