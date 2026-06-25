# Architecture overview

Orientation for a developer joining the codebase. It assumes you already know the
games (Forty-Fives, Auction Forty-Fives, trump schemes, robbing, the kitty) and
are a comfortable senior engineer — but maybe new to Svelte. It favours brevity;
`CLAUDE.md` and `doc/SPEC.md` are the deeper references.

## What this is

A free, offline-first **PWA** for Forty-Fives, built with SvelteKit and shipped as
**static HTML** (no server, no accounts, no network calls beyond loading the site).
Three modes:

- **`/trainer`** — Ranking Trainer: a two-card quiz teaching the unusual trump
  ranking. Plus `/trainer/reference`, a static ranking cheat-sheet.
- **`/play`** — full 1v1 game vs. a heuristic AI, scoring to 45.
- **`/auction`** — 4-player partnership Auction Forty-Fives (1 human + 3 AI) with
  bidding, a kitty, and make/set scoring to 120. Rules tweakable at `/auction/config`.

## The load-bearing rule

`src/lib/domain/` and `src/lib/ai/` are **pure TypeScript with zero imports from
Svelte, SvelteKit, or any UI.** This is the one rule the whole structure hangs on:
it keeps the game logic portable for the planned Phase B Flutter (Dart) rewrite
(SPEC §10). UI calls into the domain; the domain never calls back.

```
   ┌─────────────────────────────────────────────────────────┐
   │  src/routes/**      +  src/lib/ui/                        │   UI layer
   │  Svelte pages          PlayingCard.svelte, persistence.ts │   (Svelte,
   │  (one per route)       (the only localStorage toucher)    │   localStorage)
   └───────────────────────────┬─────────────────────────────-┘
                               │  calls down, only
                               ▼
   ┌─────────────────────────────────────────────────────────┐
   │  src/lib/domain/    +  src/lib/ai/                        │   pure TS
   │  rules, state, scoring  heuristic + auction AI            │   (no UI imports,
   │  immutable, throws on illegal moves                       │   fully testable)
   └───────────────────────────┬─────────────────────────────-┘
                               │  reads
                               ▼
   ┌─────────────────────────────────────────────────────────┐
   │  src/lib/assets/trump-schemes/*.json                     │   data
   │  ranking tables as validated data, not code              │
   └─────────────────────────────────────────────────────────┘
```

## If you're new to Svelte

You'll meet only a handful of framework concepts here:

- **Runes (Svelte 5, forced project-wide):** `$state(x)` makes a reactive
  variable, `$derived(expr)` a computed one, `$props()` reads component inputs.
  That's ~90% of what the pages use.
- **File-based routing:** a folder under `src/routes/` with a `+page.svelte` *is* a
  URL. `+layout.svelte`/`+layout.ts` wrap children. `src/routes/+layout.ts` sets
  `export const prerender = true`, so **every route is rendered to static HTML at
  build time** (adapter-static) — there is no running server.
- **`$lib` alias** = `src/lib/`. `$app/paths` gives the `base` path for GitHub
  Pages hosting.
- **Service worker** (`src/service-worker.ts`) precaches the `prerendered` routes
  for offline use. It only works in the production build, not `npm run dev`.

Everything else is plain TypeScript you already know.

## Module map

**Shared card/rules layer** (used by all modes):

| File | Responsibility |
|---|---|
| `cards.ts` | Immutable card value objects; canonical ids (`"AH"`, `"10D"`). |
| `trump-scheme.ts` | Loads + **validates** a scheme JSON; `isTrump`, `trumpStrength`, `plainStrength`. |
| `trick.ts` | `trickWinner(...)` and `explainTrick(...)` (the learner prose). |
| `rules-engine.ts` | `legalPlays`/`analyzePlays`: follow-suit + renege rules. |
| `deck.ts` | Shuffle + deal; all randomness via an injected `Rng`. |
| `rng.ts` | Seedable mulberry32 PRNG — domain code is deterministic under test. |
| `scoring.ts` | 1v1 `scoreHand` + `gameWinner`. |
| `schemes.ts` | Registry of bundled schemes (imports the JSON). |

**1v1 game:** `game-state.ts` (immutable `GameState` + transitions), `scoring.ts`,
`ai/heuristic.ts`.

**Auction game:** `auction-game-state.ts` (state + transitions across bidding →
naming-trump → discarding → drawing → playing → hand-over), `auction-scoring.ts`
(make/set scoring, `AUCTION_TARGET = 120`, finish rules), `bidding.ts`,
`auction-config.ts` (per-game rule settings), `ai/auction-ai.ts`
(partnership-aware).

**Trainer:** `trainer.ts` generates quiz questions, weighted toward the hard
trump-ladder cases.

## State & transition model

Game state is **plain, immutable, JSON-able data** — it carries the scheme *id*,
never the loaded scheme object, so saved games stay serializable. Transitions are
**pure functions** that take the current state (and the loaded scheme) and return
the next one:

```
   startGame ─▶ GameState ─▶ playCard ─▶ GameState' ─▶ nextHand ─▶ ...
                   │
                   └─ every transition validates and THROWS on an illegal move
                      (this is what makes AI self-play a correctness test)
```

Two conventions worth knowing:

- **`gameWinner: number | null`** — `null` means "game continues" (also reused for
  Auction sudden-death ties). No separate "draw" state.
- **Config snapshot (Auction):** the rules chosen at `/auction/config` are resolved
  and **frozen into `AuctionGameState.config` at `startAuction`**. Transitions read
  that snapshot, so a game keeps its rules even if the config page changes later —
  and you should never branch on the config profile in the UI or AI.

## Two "data, not code" principles

1. **Trump schemes are data.** Regional variants live entirely in
   `assets/trump-schemes/*.json`, fully defining the ranking tables.
   `loadTrumpScheme()` validates exhaustively at load (a typo throws, not
   mis-ranks). **Never** write `if (variant === ...)` in game logic — a new variant
   is a new JSON file plus a registry line, nothing else.
2. **Auction rules are per-game config.** Each rule (kitty on/off, discard phase,
   finish rule, …) is its own setting with profile-dependent defaults — not a
   `if (profile === ...)` branch.

## Persistence

`src/lib/ui/persistence.ts` is the **only** module that touches `localStorage`, and
it is SSR/prerender-safe (guarded by `browser`). Keys: trainer stats under
`forty-fives.trainer.v1`, 1v1 game + settings under `forty-fives.game.v1`, Auction
game under `forty-fives.auction.v1`, Auction config under
`forty-fives.auction-config.v1`.

## Testing strategy

Rules are pinned three ways (see `tests/`):

```
   ┌────────────────────┐   independent oracle derives the answer from the
   │ Oracle sweeps      │   *verbal* rules; engine derives it from the JSON;
   │ (exhaustive)       │   the two must agree across every case
   └────────────────────┘   (10,608 tricks; 265,200 legality questions)

   ┌────────────────────┐   human-readable docs of the famous surprises:
   │ Named trap cases   │   5 > J > A♥, A♦ lowest off-trump, black numbers
   │                    │   reversed, renege rights, A♥ never a heart
   └────────────────────┘

   ┌────────────────────┐   hundreds of seeded full games, all seats driven
   │ AI self-play       │   through the real throwing transitions; every game
   │ (property test)    │   must terminate — any illegal move throws
   └────────────────────┘
```

Rule: an oracle must **never** be "fixed" by calling production code — that would
collapse the cross-check. New rules get tests written before/alongside the engine.

## Build & deploy

- SvelteKit config is **inline in `vite.config.ts`** (no separate
  `svelte.config.js`). Vitest is wired there too; runes mode is forced.
- `npm run build` → adapter-static writes `build/` (one `.html` per route).
- Version, build time, and git commit are injected at build via Vite `define`
  (`__APP_VERSION__` etc.), surfaced on `/about`. Bump the version manually in
  `vite.config.ts` per task.
- Node must satisfy the `engines` range; `engine-strict=true` fails fast — don't
  bypass it.

## Where to start reading

`trick.ts` + `rules-engine.ts` (the heart of the rules) → `game-state.ts` (how a
1v1 game advances) → `routes/play/+page.svelte` (how the UI drives it) → then the
Auction trio (`auction-game-state.ts`, `bidding.ts`, `auction-scoring.ts`) once the
1v1 shape is clear.
