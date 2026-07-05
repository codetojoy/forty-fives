# Forty-Fives

A free, open-source app for playing **Forty-Fives**, the trick-taking card game with deep
roots in Atlantic Canada. See [doc/SPEC.md](doc/SPEC.md) for the full project plan.

**Current status: Phase A / Milestones 0, 1, and 3.** The app is an installable,
offline-capable PWA with three modes:

- **Play Forty-Fives** (Milestone 1) — full 1v1 hand-by-hand play against a heuristic AI
  ("Margaret" or "Stewart"): deal, turn-up trump, robbing, five tricks, renege rules
  enforced, 5 points a trick plus 5 for the highest trump in play, first to 45. Legal
  cards can be highlighted, misclicks are guarded by a tap-twice confirm (both
  toggleable), and every trick comes with an explanation of why it was won.
- **Play Auction** (Milestone 3) — Auction Forty-Fives for four: you and an AI partner
  against two AI opponents, with bidding (15/20/25/30), a three-card kitty, and
  make-or-set scoring to 120. Regional rule calls (kitty on/off, post-trump card
  exchange, the dealer's option to hold the bid, who leads the first trick, how the
  game finishes) are configurable.
- **Ranking Trainer** (Milestone 0) — pick a trump suit, look at two cards from a trick,
  and tap the one that wins. Every answer explains *why* ("the A♥ is always trump…").

Each game mode has its own **Configure** page (rule and UI options, saved locally) and a
**Stats** page. Everything persists only to `localStorage` — no accounts, no analytics,
no network calls.

## Running the app locally

### Prerequisites

- **Node.js 20.19+, 22.12+, or 24+** (an LTS line; the tooling does not support odd-numbered
  releases like Node 23) and npm.
- Any modern browser.

> macOS + Homebrew tip: `brew install node` (the unversioned formula tracks the latest
> release, which satisfies the range above).

### Development server

```sh
npm install
npm run dev          # http://localhost:5173
npm run dev -- --open  # same, but opens your browser
```

The dev server hot-reloads on every file change.

### Tests

```sh
npm test             # full suite, single run
npm run test:unit    # watch mode
npm run check        # typecheck (svelte-check)
```

The domain tests include two exhaustive sweeps checked against independently-written
oracles of the verbal rules, per SPEC §13: every (trump suit × led card × second card)
trick — 10,608 cases — and every (trump suit × led card × two-card hand) legality
question — 265,200 cases, covering all the renege rules. The AI is tested by playing
hundreds of full seeded games against itself; it must never make an illegal play and
every game must terminate.

### Production build & PWA testing

```sh
npm run build        # static site in build/
npm run preview      # serve it at http://localhost:4173
```

The service worker (offline support) and install prompt only activate in the **production
build**, not the dev server. To try them: `npm run build && npm run preview`, open the
preview URL, then in DevTools → Application check "Service workers" and "Manifest", or use
your browser's "Install app" button. Offline mode: load the page once, stop the server (or
toggle "Offline" in DevTools), reload — the trainer keeps working.

## Project layout

The structure follows SPEC §10, mapped onto SvelteKit conventions:

| SPEC §10 | This repo |
|---|---|
| `src/domain/` | `src/lib/domain/` — pure game logic, **zero UI dependencies** |
| `src/ai/` | `src/lib/ai/` — the computer opponent (also UI-free) |
| `src/assets/trump-schemes/` | `src/lib/assets/trump-schemes/` — rule variants as JSON data |
| `src/ui/` | `src/lib/ui/` + `src/routes/` — Svelte components (`/`, `/trainer`, `/play`, `/auction`) |
| `tests/` | `tests/domain/` + `tests/ai/` — exhaustive rules and AI tests |

Key domain modules:

- `cards.ts` — card value objects, the 52-card deck
- `trump-scheme.ts` — loads and validates a rule variant; answers "how strong is this card?"
- `trick.ts` — which card wins, and the human-readable explanation why
- `deck.ts` — seeded shuffling and dealing
- `rules-engine.ts` — which cards are legal to play right now (follow-suit + renege rules)
- `game-state.ts` — immutable 1v1 game state: deal → robbing → 5 tricks → tally → next hand
- `scoring.ts` — trick points, the highest-trump bonus, and the race to 45
- `auction-game-state.ts`, `bidding.ts`, `auction-scoring.ts` — the 4-player partnership
  game: bidding, the kitty, make/set scoring to 120
- `trainer.ts` — quiz question generation, weighted toward the hard cases
- `schemes.ts` — registry of bundled variants (currently `standard.json` only; regional
  variants are added as data files once validated with real players — no code changes)
- `ai/heuristic.ts` — the 1v1 opponent: wins tricks cheaply, dumps weak cards, saves the
  renegable trumps for late tricks
- `ai/auction-ai.ts` — the partnership-aware auction players: bidding, naming trump,
  discarding, and card play

## License

[Apache 2.0](LICENSE). Visual asset provenance is documented in [ASSETS.md](ASSETS.md).
