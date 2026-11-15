# Branch `experiment-3D` — suggested next steps

Ten suggestions for where to take the 3D table next, as of 15-NOV-2026. This is
a **suggestion list**, not an agreed plan — pick what is worth doing. Context is
in `doc/branch-3D-work-summary.md` (what exists) and `doc/BRAINSTORM-3D.md`
(why).

Difficulty levels:

- **Easy** — an hour or two; small, contained, low risk.
- **Medium** — a working session; some design choices or several files.
- **Hard** — more than one session, or the outcome depends on judgement calls
  and testing on real devices.

## At a glance

| # | Suggestion | Difficulty | Why it matters |
|---|---|---|---|
| 1 | Test on real devices and browsers | Easy | Everything so far was checked only in headless Chrome |
| 2 | Commit the work and update `CLAUDE.md` | Easy | Nothing is committed; the 3D code is undocumented for future sessions |
| 3 | Keep three.js out of the offline precache | Medium | Every visitor currently downloads 519 kB they may never use |
| 4 | Make cards larger on phones | Hard | The main open design problem; short of SPEC §7 |
| 5 | Decide the default: 3D on or off | Easy | Needed before this branch can merge to `main` |
| 6 | Show game information inside the scene | Medium | Bids, trump, and whose turn are easy to miss below the canvas |
| 7 | Finish the accessibility layer | Medium | Keyboard and screen-reader play exists but is untested by hand |
| 8 | Close the manual-testing gaps | Easy | Several paths were never exercised in a browser |
| 9 | Visual polish | Medium | Makes it feel like a table rather than a diagram |
| 10 | Automated check of the scene itself | Hard | `scene.ts` (691 lines) has no tests |

Suggested order if only some are done: **1 → 2 → 5 → 4 → 3**, then the rest by
taste. Items 1 and 4 inform each other: what real phones show should drive the
size work.

---

## 1. Test on real devices and browsers — Easy

All checking so far was headless Chrome at two window sizes. Not yet tried: a
real phone (iOS Safari and Android Chrome), desktop Safari, Firefox, an older
or low-end phone, and the installed PWA.

Things to look for: whether cards are readable at arm's length; whether suit
symbols render as text rather than emoji; whether animations are smooth;
whether taps land on the intended card when cards overlap; whether scrolling
the page through the canvas feels right; battery and heat over a full game.

Mostly the maintainer's time rather than coding. Expect it to produce a short
list of fixes, each probably Easy.

## 2. Commit the work and update `CLAUDE.md` — Easy

The whole 3D effort is uncommitted in the working tree. Suggested: commit it on
`experiment-3D` in two or three logical commits (shared scene + 1v1; Auction;
docs).

`CLAUDE.md` does not mention the 3D code. It should gain a short section
covering: the `table3d/` module map; the rule that layout is pure and tested
while the scene is not; that three.js must stay behind a dynamic import; and
that the 2D table is still the fallback and must keep working.

## 3. Keep three.js out of the offline precache — Medium

three.js is lazy-loaded on the game pages, but `src/service-worker.ts` precaches
every build file, so every visitor downloads the 519 kB chunk (130 kB gzipped)
in the background on first visit — including people who only use the trainer or
have 3D turned off.

Suggested: exclude the three.js chunk from the install-time precache and let
the service worker's existing cache-on-first-use path store it when a 3D table
is first opened. Needs care: the chunk's file name is hashed and changes every
build, so it must be identified reliably; and offline behaviour must be decided
for someone who has never opened a 3D table (falling back to 2D is the natural
answer, and the fallback path already exists).

Test with `npm run build && npm run preview`, including an offline reload.

## 4. Make cards larger on phones — Hard

On a 390px-wide phone a hand card is roughly 55–60px wide; the 2D table's
minimum is 88px. Auction is smaller again, and the side players' names are tiny.
This is above the 48px tap-target floor but short of SPEC §7's "large,
high-contrast card faces", and it is the audience that matters most.

Options, not mutually exclusive:

- A steeper or closer camera on phones, cropping more of the table.
- Draw your own hand as a flat 2D strip below the scene at full size, and keep
  3D for the table only.
- Overlap the hand more and enlarge the corner index (rank + suit) on the card
  texture so it reads even when overlapped.
- A taller canvas on phones, at the cost of pushing buttons further down.
- In Auction, shrink or drop the stock and side rows on phones.

Hard because it is a design problem with trade-offs, not a bug, and the answer
has to be judged on real devices (item 1) by real players.

## 5. Decide the default: 3D on or off — Easy

The setting is on by default on this branch so it can be reviewed. Before
merging to `main` it needs a decision:

- **Off by default** — safest; 3D is an opt-in extra. Recommended until items 1
  and 4 are settled.
- **On by default** — only once phone readability is good.
- **On for wide screens, off for phones** — a reasonable middle, but a default
  that differs by device can confuse people.

The code change is one line in each of two places in `persistence.ts`, plus
the tests that pin the default.

## 6. Show game information inside the scene — Medium

The scene shows cards and faces, but several things a player wants at a glance
are only in the HTML above or below it:

- **Trump suit** — a marker on the table.
- **Auction bids** — each player's bid or "passed" beside their portrait, and
  the winning bid during play.
- **Dealer** — a dealer button beside the right seat.
- **Tricks won** — a count beside each pile.
- **Your turn** — a cue on your own hand, matching the gold ring the others get.

Each is a small painted label or marker. The work is mostly in deciding what
earns a place without cluttering a small screen. Labels need to stay readable
on phones, which ties back to item 4.

## 7. Finish the accessibility layer — Medium

What exists: the real hand buttons are still in the page (visually hidden), the
focused card lifts with a ring in the scene, the scene has a text description,
and `prefers-reduced-motion` turns animation off.

What is missing or unverified:

- A hands-on pass with a keyboard only, and with VoiceOver / TalkBack.
- The hidden buttons give no visible focus outline of their own — the ring in
  the scene is the only indicator, which needs confirming as sufficient.
- Screen-reader announcements when the opponent plays, a trick is won, or cards
  are dealt (the 2D table's visible captions are hidden in 3D).
- High-contrast / forced-colours mode.
- Respecting OS font scaling for anything drawn inside the canvas.

Per SPEC §7 this is a requirement, not polish, so it should be done before 3D
becomes a default.

## 8. Close the manual-testing gaps — Easy

Paths never exercised in a browser with 3D on:

- **1v1:** robbing the turn-up as the human; a full game to 45, including the
  win and loss screens; resuming a saved game mid-hand.
- **Auction:** holding the bid as dealer; the Rec Hall profile (no kitty); the
  Tignish profile (five-card kitty, so a ten-card hand); the draw/exchange
  phase by tapping the canvas; "Sort hand strongest first"; a full game to 120.
- **Both:** confirm-before-play; the WebGL-unavailable fallback; switching the
  3D setting off and on mid-game; rotating a phone mid-hand.

Each is a few minutes. The layout tests already cover the rules profiles, so
surprises are more likely in interaction than in placement.

## 9. Visual polish — Medium

Deliberately not attempted in the first pass:

- Card thickness and visible edges (cards are currently paper-thin planes).
- A felt texture and a nicer wood rim; softer, better-placed shadows.
- Animation timing — the deal, the sweep, and the flip could each be tuned;
  a small "settle" at the end of a move adds a lot.
- Camera: a gentle move-in at the start of a hand, or a slight drift.
- Portraits: a small stand or nameplate so they sit on the table.
- A subtle highlight when hovering a playable card with a mouse.
- Sound (see `doc/BRAINSTORM-sound.md`) — a card snap and a shuffle go a long
  way, and sit naturally alongside the animations.

Any new texture or sound file must be CC0/MIT/Apache-compatible and recorded in
`ASSETS.md`. Everything so far is drawn in code, which avoids that question.

## 10. Automated check of the scene itself — Hard

`layout.ts` and `auction-layout.ts` are tested (24 tests); `scene.ts`, the
largest file, is not, because it needs WebGL. Regressions there — a card that
never arrives, a tap that picks the wrong card, a portrait drawn skewed — can
only be caught by eye today.

Options:

- **Browser tests** (Playwright or Vitest browser mode): play a scripted hand
  in headless Chrome and assert on game state, plus that taps on the canvas
  play the expected card. The throwaway scripts used during development did
  exactly this and could be turned into real tests.
- **Screenshot comparison** for a few fixed game states. Catches visual
  regressions but is brittle across machines and GPU drivers.
- **Split `scene.ts`** so the animation bookkeeping (which card is moving where,
  and when) is pure and unit-testable, leaving only drawing untested.

Hard because it adds a new kind of test infrastructure to a project whose tests
are currently all fast, pure, and Node-only — worth doing only if 3D is going
to stay.

---

## Not suggested

- **A game engine or physics library.** Much heavier downloads for no benefit in
  a card game where scripted motion looks better than simulated motion.
- **3D character models for the players.** A large asset and licensing effort;
  the flat avatars read well and cost nothing.
- **Removing the 2D table.** It is the accessible baseline and the fallback when
  WebGL is unavailable.
- **Porting the trainer to 3D.** It teaches rankings two cards at a time; 3D
  would add nothing.
