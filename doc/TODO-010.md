
### TODO-010 [COMPLETE]

This task involves configuration for the Auction game. No impact on the game functionality yet: just planning out the configuration UI and storage.

Goals:

* for Auction game, introduce a new Configuration page
* all choices should be stored in local storage for some level of persistence
* define a configuration setting an atomic setting that can have one value
* list of configuration settings:
    * code: USE_KITTY, desc: "use kitty", type: boolean
    * code: ALLOW_DISCARD, desc: "allow discard when not bid-winner", type: boolean
* define a configuration profile as a group of settings with specific values
* list of configuration profiles:
    * "Wikipedia" with values USE_KITTY: true, ALLOW_DISCARD: false  
    * "Rec Hall" with values USE_KITTY: false, ALLOW_DISCARD: true  
    * "Custom" with no values: see below
* the Configuration page should allow the user to select a configuration profile
    * for "Wikipedia" and "Rec Hall", show the config settings as read-only 
    * for "Custom", show the config settings as writable
* provide Save button to write to storage

### Deferred follow-up: wire config into gameplay

TODO-010 is configuration scaffolding only — the Auction config page
(`/auction/config`) and its localStorage persistence are intentionally inert.
Actually applying the resolved config to play is deferred to a later TODO:

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
