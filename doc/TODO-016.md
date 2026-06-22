
### TODO-016 [COMPLETE]

Added a "Finish Game Rule" setting to the Auction config — stored only, no
gameplay impact yet. Its two values are "120 points reached" (`POINTS_120`) and
"4 turns of the table completed" (`FOUR_TURNS`); Wikipedia → points, Rec Hall →
turns, and Custom is user-chosen. Because every prior setting was boolean, the
config model in `auction-config.ts` was generalized: `AuctionSetting` is now a
discriminated union (`type: 'boolean'` vs `type: 'choice'` with an `options`
list), `AuctionSettingValues` became a heterogeneous interface, and
`normalizeValues` validates each setting per its type (a bogus finish-rule value
falls back to the default). The config page renders the choice as a read-only
label for built-in profiles and an (accessible) radio group under Custom.
`withSavedGameDefaults` now merges the config per field so saves predating the new
setting gain its default. Version bumped to 0.14.1.

Verified: `npm run check` clean; full suite 355 passing; a headless-Chrome smoke
confirmed Wikipedia shows "120 points reached", Rec Hall shows "4 turns…", and a
Custom choice saves to localStorage and survives reload. Original task notes below.

This is an update to the Auction Forty-Fives configuration page: just new options for storage and no impact (yet) on game-play.

The goal is to add a new setting to the configuration: "Finish Game Rule". There are two optional values:

* 120 points reached
* 4 turns of the table completed

For "Wikipedia" profile, the setting should be 120 points reached.

For "Rec Hall" profile, the setting should be 4 turns of the table completed. 

As always, the user can specify in the "Custom" profile.

Bump version to 0.14.1
