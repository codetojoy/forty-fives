
### TODO-026 [COMPLETE]

The Auction game-play footer's two checkboxes — "Highlight legal cards" and
"Confirm before playing" — moved off the play page to `/auction/config`, under a
new "Display & interaction — always editable" section that is independent of the
rules profile and saves on each toggle (the prefs still live in the auction game
save). The play page's intro link is renamed "Configure rules →" → "Configure →",
and its footer keeps only the Abandon button. The config page's wording now makes
the split explicit: rules settings are set by the profile and take effect next New
game, while the new prefs apply right away. The Auction `confirmPlay` default is
flipped to off (`highlightLegal` stays on); the 1v1 game is untouched. Version
bumped to 0.1.26. Original task notes below.

In Auction Forty-Fives, let's move lesser-used config settings to the Configuration page.

General goals are:

* rename "Configure Rules" link to "Configure"
* move two checkboxes:
    * (a) Highlight legal cards
    * (b) Confirm before playing
    * original location: game-play page for Auction Forty-Fives
    * new location: config page for Auction Forty-Fives
    * default value for (a) should be true
    * default value for (b) should be false
* in Config page:
    * introduce new section for settings that are not affected by Configuration Profile
    * these new settings are always read-write
    * alter UI so that it is clear as to what is governed by a profile and what is not
* version bump to 0.1.26

