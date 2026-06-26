
### TODO-028 [COMPLETE]

Wrote `doc/BRAINSTORM-028.md`: ranked mitigations for the mobile scrolling problem
in Auction Forty-Fives, where the trump badge sits at the top of the column while
the player acts on their hand at the bottom (a mobile-only issue — the desktop grid
fits on screen). Eight ideas ranked by preference, including the two seed examples
(trump at top & bottom; trump icon on section headings), each with a11y notes and
effort, plus a recommendation. The top pick: fold trump into the "Your hand"
heading so the answer sits where the decision is made, optionally echoed on other
headings; the sticky status strip is the robust higher-effort alternative. No code
change, no version bump. Original task notes below.

The goal here is to brainstorm into a doc: BRAINSTORM-028.md  

On mobile devices, the Auction Forty-Fives game requires scrolling, especially to confirm the current trump suit. The goal here is to brainstorm ideas on how to mitigate this.

Example mitigations:

* specify the current trump suit at the top _and_ the bottom of the screen
* each section heading has an icon for the current trump suit
* others?

The goal is to add others and rank these in terms of preference, in the doc specified above.

* no version bump or app change 

