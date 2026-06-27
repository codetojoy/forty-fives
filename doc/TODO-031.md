
### TODO-031 [COMPLETE]

Ported BRAINSTORM-028 mitigation #1 (already shipped for Auction in TODO-029) to the
1v1 Forty-Fives game: the current trump suit is now folded into the `/play` "Your
hand" heading (`play/+page.svelte`), e.g. "Your hand · ♥ Hearts trump", so mobile
players see what's trump right where they choose a card instead of scrolling up to
the status badge. Reused the page's existing `trumpColor`, `SUIT_SYMBOLS`, and
`SUIT_NAMES` — symbol + name + trump colour, never colour-only (SPEC §7). Gated on
`game.trumpSuit` and folded into the existing `h2`, so no new block and no anti-jump
regression (TODO-015); desktop grid untouched. Pure UI change — no domain/`src/lib`
touch. Version bumped to 0.1.31 (`vite.config.ts`).

Verified: `npm run check` clean (0 errors); full suite 409 passing (no domain logic
changed). Original task notes below.

Background
* this TODO applies a feature from Auction Forty-Fives game to Forty-Fives game
* read doc/TODO-028.md for problem description and doc/BRAINSTORM-028.md for solution options, especially mitigation #1

Goal
* implement mitigation #1 ("Trump on the "Your hand" heading") for Forty-Fives 
* version bump to 0.1.31

