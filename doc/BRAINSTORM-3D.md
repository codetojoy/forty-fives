# Brainstorm: a 3D table UI

A scoping note answering the question "if this project were copied and given a
UI built on a 3D scene — table, cards, players — is that doable?" Verdict up
front: **yes, and this project is unusually well set up for it.** Nothing here
is implemented; this is a planning note.

---

## 1. Why it would work

- **The game logic is separate from the UI.** Everything in `src/lib/domain/`
  and `src/lib/ai/` is plain TypeScript with no Svelte imports. A 3D UI would
  call the same functions (`playCard`, `placeBid`, `legalPlays`, the AI
  choosers) and draw the resulting state. The rules, scoring, AI, and the whole
  test suite would carry over untouched.
- **Game state is plain data.** Each move produces a new state, so the 3D layer
  only needs to compare old and new state and animate the difference (a card
  moving from hand to table, a trick being swept up).
- **The tooling exists.** Three.js works inside SvelteKit, and Threlte is a
  Svelte wrapper for it. The static build, offline support, and hosting on
  GitHub Pages would all still work.

## 2. What would take real effort

- **Accessibility.** This is the biggest issue. SPEC §7 makes large tap targets,
  high-contrast cards, and OS font scaling hard requirements, and a 3D canvas
  provides none of that by default. Cards drawn in perspective are smaller and
  harder to read. It would likely need a camera angle that keeps the player's
  own hand large and flat, plus an invisible layer of real buttons for screen
  readers and keyboard users.
- **Card faces.** The current cards are SVGs drawn in code. They would need to
  be turned into textures for 3D cards — straightforward, but real work.
- **Performance on older phones.** A 3D scene uses more battery and may stutter
  on the older devices some of the audience probably has. A simple scene (a
  table, flat cards, basic lighting) would be fine; realistic lighting, shadows,
  and physics would not.
- **Players.** The six avatar SVGs could sit around the table as flat portraits
  cheaply. Actual 3D characters would be a much bigger job and would need assets
  with compatible licences (recorded in `ASSETS.md`).
- **Bundle size.** Three.js adds a few hundred kilobytes to the download.

## 3. Suggested approach

- Keep the non-game pages (trainer, settings, stats, FAQ) as they are and
  replace only the table view in `/play` and `/auction`.
- Keep the existing 2D table as a setting, so anyone who finds the 3D version
  hard to read can switch back.
- A first working version — a 3D table, dealt cards, and animated play for one
  game mode — is a reasonable-sized project. Polish (animations, camera, phone
  tuning) is where most of the time would go.

## 4. Copy or branch?

Doing it in a copy is a sensible way to try it without risking the live app.
Since the domain code would be identical in both, a **branch** would make it
easier to bring rule fixes across later.

---

## 5. First pass — implemented on the `experiment-3D` branch (15-NOV-2026)

A 3D table for the 2-player game (`/play`) only. `/auction` is untouched.

**What it does**

- Table, stock, turn-up, both hands, the trick, and each player's pile of won
  tricks are drawn in a three.js scene. Your hand is held up facing the camera;
  the opponent's is face down across the table under their avatar and name.
- Cards animate between places: the deal (alternating, from the stock), playing
  a card, the opponent's card flipping face up, the winning card lifting with a
  green ring, tricks sweeping to the winner's pile, a rob moving the turn-up
  into a hand.
- Tap or click a card in the scene to play it. Illegal cards are greyed (when
  "Highlight legal cards" is on); confirm-before-play raises the card with a
  gold ring first.
- The prompts, trick explanation, rob panel, hand score, and buttons are the
  same HTML as before, below the scene.
- New setting on `/play/config`: **3D table (experimental)**, on by default on
  this branch. Off gives the original 2D table. If WebGL cannot start, the page
  falls back to 2D by itself.

**How it is built**

- **Raw three.js, not Threlte** (a change from §"tech stack" discussion). The
  scene is driven imperatively — "here is where every card belongs now, animate
  there" — which is simpler without a declarative wrapper, and it is one
  dependency instead of three.
- `src/lib/ui/table3d/layout.ts` — pure: game state → a position, rotation, and
  flags for every card. No three.js; unit-tested in
  `tests/ui/table3d-layout.test.ts` with real game states. Has a `compact`
  arrangement for phone-shaped canvases (hand overlapped, far side pulled in)
  so cards draw larger.
- `src/lib/ui/table3d/scene.ts` — three.js: meshes keyed by card id tween to
  their placements; camera distance is fitted to the canvas shape; renders only
  while something is moving (battery); honours `prefers-reduced-motion`.
- `src/lib/ui/table3d/Table3D.svelte` — loads `scene.ts` with a dynamic import,
  so three.js is not in the prerendered HTML and is only fetched when the 3D
  table is shown.
- Domain and AI code: unchanged. `GameSettings` gained an optional `table3d`.
- No new asset files: card faces and backs are painted onto canvases at runtime
  (same design as `PlayingCard.svelte`); the portrait is the existing avatar SVG.

**Accessibility, as far as this pass goes**

- The real hand buttons are still in the page (visually hidden) — keyboard and
  screen-reader play works, and the focused card is raised and ringed in the
  scene. The scene has a text alternative describing the table.
- **Not yet at SPEC §7:** on a 390px-wide phone a hand card is about 60px wide
  (the 2D table's minimum is 88px), and its face is correspondingly smaller.
  That is above the 48px tap-target floor but short of "large card faces".

**Known gaps / next steps**

- Size on phones (above) — the main open design question.
- three.js is one 519 kB chunk (130 kB gzipped). It is lazy-loaded on the page,
  but the service worker precaches every build file, so every visitor downloads
  it in the background on first visit. Excluding it from the precache (and
  caching on first use) is a follow-up.
- Checked only in headless Chrome at phone and desktop sizes; not yet on a real
  phone, Safari, or Firefox.
- No tests for `scene.ts` (it needs WebGL); the layout it consumes is tested.
- Polish not attempted: card thickness/edges, felt texture, camera angle
  tuning, a "your turn" cue in the scene, sound.

---

## 6. Second pass — the Auction game in 3D (15-NOV-2026)

`/auction` now uses the same 3D table, with four seats.

**What it does**

- You are at the near edge; your partner is across from you, seat 1 on your
  right and seat 3 on your left (the same seating as the 2D page). Each of the
  other three has an avatar and name; your partner's ring is green, and whoever
  the table is waiting on gets a gold ring.
- The kitty lies face down in the middle until the bid winner takes it, then
  flies into that hand. A hand swollen by the kitty (up to ten cards) squeezes
  into the same width.
- Discards and exchanged cards slide back into the stock; drawn cards are dealt
  out of it. Tricks are laid in front of whoever played each card, and swept to
  a pile per partnership — yours near-right, the opponents' far-right.
- Bidding, naming trump, discarding, exchanging, and the hand score are the same
  HTML panels as before, directly under the scene. Tapping cards in the scene
  selects them for discard/exchange (gold ring) or plays them.
- The one-line bid summary (previously shown only with "Hide other players")
  is shown during bidding, since the seat panels are replaced by the scene.
- New setting on `/auction/config`: **3D table (experimental)**, on by default
  on this branch. "Hide other players" has no effect while 3D is on.

**How it is built**

- `src/lib/ui/table3d/auction-layout.ts` — the pure four-seat layout, tested in
  `tests/ui/table3d-auction-layout.test.ts` by playing a full hand with the AI
  under every bundled rules profile and checking every state along the way.
- `scene.ts` and `Table3D.svelte` were generalised rather than copied: the
  scene is now told an *arrangement* (stock position, portrait spots, the points
  the camera must keep in view) and a list of portraits, and each game's layout
  module supplies its own. The 1v1 table goes through the same code.
- Domain and AI code: still unchanged.

**Known gaps (in addition to §5's)**

- On a phone the side players' names are very small, and with four hands on the
  table everything is a little smaller than in the 2-player game.
- The "Sort hand strongest first" setting re-orders the hand with a slide, which
  is fine, but has only been checked by script.
- Checked only in headless Chrome, driving the hidden hand buttons by script for
  one full hand per screen size; canvas taps were verified in the 1v1 game only.
  Not tried: hold-the-bid as dealer, the Rec Hall (no kitty) and Tignish
  (five-card kitty) profiles in the browser — though the layout tests cover them.
