
### TODO-027 [COMPLETE]

The 1v1 Forty-Fives game-play footer's two checkboxes — "Highlight legal cards"
and "Confirm before playing" — moved off the `/play` page to a new
`/play/config` page (`src/routes/play/config/+page.svelte`). The new page has no
rules profiles (1v1 has none); it carries only the "Display & interaction —
always editable" section, matching the equivalent section on `/auction/config`,
with a single Save button + dirty tracking that persists the prefs back into the
game save (preserving any in-progress game). The `/play` intro screen gains a
"Configure →" link (same name as Auction) below the Start button, and its footer
keeps only the Abandon button. The 1v1 `confirmPlay` default is flipped to off
(`highlightLegal` stays on). The new route auto-prerenders and auto-precaches.
Version bumped to 0.1.27. Original task notes below.

In Forty-Fives, let's move lesser-used config settings a new Configuration page.

This is analogous to TODO-026, though there will be a new page.

General goals are:

* use same link name as done for Auction Forty-Fives
* move two checkboxes:
    * (a) Highlight legal cards
    * (b) Confirm before playing
    * default value for (a) should be true
    * default value for (b) should be false
* in Config page:
    * no Configuration Profiles
    * new settings are always read-write
    * UI should match the related section in Auction Forty-Fives UI
* version bump to 0.1.27

