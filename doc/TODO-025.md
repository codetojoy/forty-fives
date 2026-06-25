
### TODO-025 [COMPLETE]

Wrote `doc/ARCH-PhaseB.md`: given the current Phase A PWA, a brevity-first guide to
executing Phase B Path 1 (Capacitor wrap) and Path 2 (Flutter rewrite). Anchored on
SPEC §3/§4/§9/§10 and the verified current state (static adapter-static output,
manifest+icons, native service worker, single persistence chokepoint, ~2,350 LOC of
pure domain+ai to port, JSON schemes). Includes a decision gate, per-path steps and
app-specific gotchas, a Svelte→Flutter mapping, and a ready-vs-needs-work checklist.
ASCII diagrams throughout. No code change, no version bump. Original task notes
below.

Please analyze project and write a summary in doc/ARCH-PhaseB.md

General goals are:

* use doc/SPEC.md as input/reference
* given the current state of the app, flesh out details on how to proceed to implement:
    * (a) Phase B, Path 1 
    * (b) Phase B, Path 2
* assume audience is senior-level developer who is:
    * relatively new to Svelte 
    * already comfortable with Forty Fives, Auction, trump schemes, etc
* prefer brevity over exhaustive coverage
* ASCII-art or diagrams are welcome
* no version bump because there is no code change

