# Branch `experiment-3D` — work summary

A summary of the 3D-table work on this branch, as of 15-NOV-2026. Branched from
`4b1fa56` (TODO-063). **Nothing is committed yet** — everything below is in the
working tree. Background and reasoning are in `doc/BRAINSTORM-3D.md`; this file
is the short version.

## What changed, in one paragraph

Both games — Forty-Fives (`/play`) and Auction Forty-Fives (`/auction`) — now
draw the table as a 3D scene: a felt table, the stock, the hands, the trick, the
piles of won tricks, and the other players' avatars, with cards animating
between them. It is switchable per game and the original 2D table is still
there. The game rules, the AI, and all existing tests are untouched.

## What a player sees

| | Forty-Fives (`/play`) | Auction (`/auction`) |
|---|---|---|
| Seats | You and one opponent across the table | You, partner across, an opponent on each side |
| Your hand | Held up facing you at the near edge | Same; squeezes to fit up to ten cards with the kitty |
| Other hands | Face down in a row | Face down in rows on three sides |
| Centre | Turn-up beside the stock; the trick | The kitty (until taken); the trick, each card in front of its player |
| Won tricks | One pile per player | One pile per team |
| Portraits | Opponent's avatar and name, at the far edge | Three avatars, each at the table edge outward of that player's cards; partner ringed green |
| Whose turn | Gold ring on the opponent's portrait | Gold ring on the acting player's portrait |

Common to both:

- Cards animate: the deal, playing a card, face-down cards flipping, the winning
  card lifting with a green ring, tricks sweeping to a pile, cards returning to
  the stock.
- Tap or click a card in the scene to play it (or select it for discard /
  exchange in Auction). Illegal cards are greyed; selected cards lift with a
  gold ring.
- Prompts, explanations, bidding/trump/discard panels, scores, and buttons are
  the same HTML as before, placed under the scene.
- A new setting, **3D table (experimental)**, on `/play/config` and
  `/auction/config`. On by default on this branch; off gives the 2D table.
- If WebGL cannot start, the page falls back to the 2D table automatically.
- On phone-shaped screens a tighter arrangement is used so cards draw larger.

## Technology

- **three.js** (`three` ^0.180, plus `@types/three` for development) — the only
  new dependency. Threlte was considered and not used: the scene is driven
  imperatively ("here is where every card belongs; animate there"), which is
  simpler without a wrapper.
- Still SvelteKit + Svelte 5, still a static build, still deployable to GitHub
  Pages exactly as before.
- three.js is loaded with a dynamic import, so it is not in the prerendered HTML
  and is fetched only when a 3D table is actually shown.
- No new asset files. Card faces and backs are painted onto canvases at runtime
  to the same design as `PlayingCard.svelte`; portraits use the existing avatar
  SVGs. `ASSETS.md` needs no change.

## Files

New — `src/lib/ui/table3d/`:

| File | Lines | Role |
|---|---|---|
| `layout.ts` | 317 | Pure. 1v1 game state → position, rotation, and flags for every card. Also the shared types (`CardPlacement`, `Arrangement`). |
| `auction-layout.ts` | 332 | Pure. The same for the four-seat Auction table (kitty, team piles, seat sides). |
| `scene.ts` | 691 | three.js. Builds the table, paints card textures, tweens each card to its placement, fits the camera to the canvas, handles taps. Shared by both games. |
| `Table3D.svelte` | 131 | Thin Svelte wrapper: lazy-loads `scene.ts`, picks the wide or compact arrangement, feeds it placements. |

New tests — `tests/ui/`:

| File | Tests | Covers |
|---|---|---|
| `table3d-layout.test.ts` | 12 | 1v1 placements, driven by real games |
| `table3d-auction-layout.test.ts` | 12 | Auction placements, across every state of a full AI-played hand under every bundled rules profile |

Modified:

- `src/routes/play/+page.svelte`, `src/routes/auction/+page.svelte` — show the
  3D table when enabled; keep the real hand buttons (visually hidden) for
  keyboard and screen-reader use; build a text description of the table.
- `src/routes/play/config/+page.svelte`, `src/routes/auction/config/+page.svelte`
  — the new toggle.
- `src/lib/ui/persistence.ts` — `GameSettings.table3d` (optional; absent = on),
  so existing saved games need no migration.
- `package.json`, `package-lock.json` — the three.js dependency.

Not modified: anything under `src/lib/domain/` or `src/lib/ai/`.

## How it fits together

1. The page turns the current game state into a *view* (hands, trick, piles,
   what is selected or dimmed).
2. A pure layout function turns the view into one *placement* per card.
3. The scene keeps one mesh per card id and animates each to its placement.
   Because cards are keyed by id, every game transition animates without
   bespoke code — a card that moves from a hand to the trick simply flies there.

Each game supplies its own layout and its own *arrangement* (where the stock and
portraits sit, and which points the camera must keep in view); the scene and the
Svelte wrapper are shared.

## Verification

- `npm test`: 544 tests pass (520 before this branch's work + 24 new).
- `npm run check`: 0 errors, 0 warnings.
- `npm run build`: succeeds.
- Headless Chrome at 390×844 and 1100×900, no console errors:
  - `/play`: a full hand, then the next deal; a card played by tapping the canvas.
  - `/auction`: a full hand including bidding, naming trump, taking and
    discarding the kitty, five tricks, and the hand score.

## Known gaps

- **Card size on phones.** A hand card is roughly 55–60px wide on a 390px
  screen (the 2D table's minimum is 88px). Above the 48px tap-target floor, but
  short of SPEC §7's "large card faces". Auction is a little smaller again, and
  the side players' names are very small. This is the main open design question.
- **Download size.** three.js is one 519 kB chunk (130 kB gzipped). It is
  lazy-loaded on the page, but the service worker precaches every build file,
  so every visitor fetches it in the background on first visit.
- **Not tested:** a real phone, Safari, Firefox; keyboard play by hand; the
  confirm-before-play setting in 3D; the WebGL fallback; robbing as the human
  (1v1); holding the bid as dealer, and the Rec Hall / Tignish profiles in the
  browser (Auction). Canvas taps were verified in the 1v1 game only — Auction
  uses the same picking code but was driven through the hidden buttons.
- **No automated tests for `scene.ts`** — it needs WebGL. The layout it consumes
  is tested.
- **Not attempted:** polish (card thickness, felt texture, camera tuning, sound),
  and updating `CLAUDE.md` to describe the 3D code.
- "Hide other players" (Auction) has no effect while 3D is on.

## Trying it

```sh
npm run dev      # then open /play or /auction and press Start
```

To compare with 2D, turn off "3D table (experimental)" on the game's Configure
page.
