# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A free, open-source app for Forty-Fives, a Maritime Canadian trick-taking card game with unusual, region-specific trump rankings. The authoritative project plan is `doc/SPEC.md` — read it before making design decisions; work items arrive as `doc/TODO-*.md` files. Current state: Phase A / Milestones 0, 1, and 3 are implemented — the Ranking Trainer (`/trainer`), full 1v1 play vs. a heuristic AI (`/play`: deal, turn-up trump, robbing, renege enforcement, scoring to 45), and **Auction Forty-Fives** (`/auction`): a distinct 4-player partnership game (1 human + 3 AI) with bidding (15/20/25/30), a three-card kitty, partnership-aware AI, and make/set scoring to 120. Milestone 2 (2v2 partners) is deprecated per SPEC §5 and was skipped. Milestone 4 (online multiplayer) is deferred indefinitely.

Auction Forty-Fives reuses the shared card/scheme/rules/trick layer; its game-specific logic lives in `auction-game-state.ts`, `auction-scoring.ts`, `bidding.ts`, and `ai/auction-ai.ts`. Per-game rules config (`auction-config.ts`, chosen on `/auction/config`, stored in `localStorage`) is snapshotted into `AuctionGameState.config` at `startAuction` and read by the pure transitions — so a game keeps the rules it started with and the config page only affects the next New game; do not branch on config in the UI/AI. `USE_KITTY` (TODO-011): when false (the "Rec Hall" profile) no kitty is dealt and `nameTrump` skips the take-kitty/discard step. `ALLOW_DISCARD` (TODO-012): adds a `drawing` phase after trump is named where seats exchange 0–5 cards with the retained `stock` in eldest-hand order (everyone draws; the bid winner is skipped only when they used the kitty, whose discards stay out of play). `ALLOW_HOLD` (TODO-042): the dealer may *hold* the standing bid (`holdBid` — match it without raising; the displaced bidder must raise or concede, all other seats are out); the domain allows any dealer seat but the AI never holds, so in practice only the human does. All three remain rule calls awaiting real-player validation (SPEC §6). Three rule calls await real-player validation (recorded in `doc/TODO-008.md`): only the bid winner uses the kitty (others keep their dealt five); the bidding team is *set* (subtracts its bid) when it falls short while defenders always bank their points, and the bidding team counts out first on a same-hand tie at 120; the optional "30 for 60" bid is not implemented. The 120 target is a property of the auction game (`AUCTION_TARGET`), not the scheme — the scheme's `scoring.gameTarget` (45) is the 1v1 target.

## Node version (required)

Node must satisfy the `engines` range in `package.json` (currently `^20.19 || ^22.12 || >=24`, mirroring `@sveltejs/vite-plugin-svelte` — note it excludes the odd-numbered Node 23). `engine-strict=true` is set, so a non-matching Node fails fast — that is deliberate; do not bypass it with `--force` or by relaxing `.npmrc`, and do not loosen the `engines` range. The machine's default `node` satisfies the range, so run npm/node commands plainly.

## Commands

```sh
npm run dev               # dev server at http://localhost:5173 (hot reload)
npm test                  # full Vitest suite, single run
npm run test:unit         # watch mode
npx vitest --run tests/domain/trick-known-cases.test.ts   # single test file
npx vitest --run -t "5 of trump"                          # tests matching a name
npm run check             # svelte-check / typecheck
npm run build             # static production build into build/
npm run preview           # serve the build at http://localhost:4173
```

The service worker and PWA install flow only work in the production build (`build` + `preview`), never in the dev server.

## Architecture

### Domain purity (the load-bearing rule)

`src/lib/domain/` and `src/lib/ai/` are pure TypeScript game logic with **zero imports from Svelte, SvelteKit, or anything UI** — this is what makes the planned Phase B Flutter port viable (SPEC §10). UI code (`src/routes/`, `src/lib/ui/`) calls into the domain, never the reverse. `src/lib/ui/persistence.ts` is the only module that touches `localStorage` (trainer stats under `forty-fives.trainer.v1`, game + settings under `forty-fives.game.v1`), and it must stay SSR-safe (guarded by `browser`) because all routes are prerendered by adapter-static. `GameState` is plain JSON-able data — it carries the scheme *id* only, and transitions take the loaded scheme as a parameter; keep it serializable so saved games keep working.

### Trump schemes are data, not code

Regional rule variants live in `src/lib/assets/trump-schemes/*.json` (currently only `standard.json`, the Wikipedia baseline). Each file fully defines the ranking tables: `trumpRankings` (per trump suit, highest first, with A♥ spliced in) and `plainRankings` (per non-trump suit), plus renege and scoring fields that are carried but unused until Milestone 1. **Never write `if (variant === ...)` branches in game logic** — adding a variant means adding a JSON file and registering it in `schemes.ts`, nothing else. `loadTrumpScheme()` validates exhaustively at load time so a typo in a scheme file throws instead of silently mis-ranking cards; keep that property when extending the format. Do not invent regional variant data — per SPEC §6, real players' feedback is the spec for variants.

### Domain module map

- `cards.ts` — immutable card value objects; canonical ids like `"AH"`, `"10D"` used in scheme JSON
- `trump-scheme.ts` — scheme loading/validation; `isTrump`, `trumpStrength`, `plainStrength`
- `trick.ts` — `trickWinner(led, second, trumpSuit, scheme)` and `explainTrick(...)`, which generates the learner-facing prose explanations
- `deck.ts` — Fisher–Yates shuffle + deal (5 each, turn-up, stock), all randomness via `Rng`
- `rules-engine.ts` — `legalPlays`/`analyzePlays`: follow-suit and renege rules, plus the human-readable constraint shown when a play is illegal
- `game-state.ts` — immutable `GameState` + pure transitions (`startGame`, `rob`/`declineRob`, `playCard`, `nextHand`); every transition validates and throws on cheating
- `scoring.ts` — `scoreHand` (trick points + highest-trump bonus) and `gameWinner`; all values from `scheme.scoring`
- `trainer.ts` — quiz question generation, weighted toward the hard cases (trump ladder)
- `rng.ts` — seedable mulberry32 PRNG; domain code takes an `Rng` so behavior is deterministic under test
- `schemes.ts` — registry of bundled schemes (imports the JSON)
- `../ai/heuristic.ts` — `chooseCard`/`chooseRob`: wins tricks cheaply, dumps weakest, saves renegable trumps for late tricks; deterministic (difficulty-by-noise comes later, SPEC §6)

Note the two-card framing: comparing two arbitrary cards has no context-free answer in this game, so everything is phrased as a *led* card plus a card *played to it*. An off-suit non-trump second card can never win.

### Testing convention

Rules logic is tested two ways, and both must be kept when rules code changes:

1. **Exhaustive oracle sweeps** — independent oracles derive everything from the *verbal* rules as formulas; the oracle and the JSON-driven engine validate each other, and you must never "fix" a failure by making the oracle call the production code. `trick-exhaustive.test.ts` sweeps every (trump suit × led × second) trick (10,608 cases); `rules-engine.test.ts` sweeps every (trump suit × led × two-card hand) legality question (265,200 cases) plus seeded 5-card hands.
2. **Named trap cases** (`trick-known-cases.test.ts`, the named blocks of `rules-engine.test.ts`) — human-readable documentation of the famous surprises (5 > J > A♥ ladder, A♦ lowest when diamonds aren't trump, black number cards reversed, the renege rights of the 5/J/A♥, the A♥ never counting as a heart).

The AI (`tests/ai/heuristic.test.ts`) is tested by property: it plays hundreds of full seeded games against itself through the real `playCard` (which throws on any illegal play), and every game must terminate. Per SPEC §13 the renege tests were written before the rules engine; keep that discipline for new rules (e.g. Milestone 3 bidding).

### Layout mapping

SPEC §10's proposed structure is mapped onto SvelteKit: `src/domain/` → `src/lib/domain/`, `src/ai/` → `src/lib/ai/`, `src/ui/` → `src/lib/ui/` + `src/routes/` (`/` mode chooser, `/trainer`, `/play`), scheme JSON under `src/lib/assets/`. Tests live in `tests/domain/` and `tests/ai/` (the `tests/**` include is wired into `vite.config.ts`). Svelte 5 **runes mode** is forced project-wide in `vite.config.ts`. The service worker precaches `prerendered` routes — keep that import in sync if routes are added.

## Constraints worth remembering

- Accessibility is a hard requirement, not polish (SPEC §7): ≥48px tap targets (prefer 56+), large high-contrast card faces, no swipe-only gestures, respect OS font scaling.
- Privacy first: no accounts, no analytics, no network calls beyond loading the site. State persists only to `localStorage`.
- License is Apache 2.0. Any new visual asset must be CC0/MIT/Apache-compatible and recorded in `ASSETS.md` with its provenance (third-party today: the two font families, SIL OFL, and the six CC0 avatar SVGs; everything else is project-original, including the programmatically drawn SVG cards).
- Game state should be immutable; prefer pure functions over classes in domain code.
- Three Milestone 1 rules calls await real-player validation (SPEC §6 acceptance testing): robbing is *optional* for the entitled player; a hand with no trump played awards no highest-trump bonus (totals 25, not 30); if both players cross 45 in the same hand the higher total wins and an exact tie plays another hand. If testers report differently, those become scheme data, not code branches.
