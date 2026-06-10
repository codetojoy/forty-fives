# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A free, open-source app for Forty-Fives, a Maritime Canadian trick-taking card game with unusual, region-specific trump rankings. The authoritative project plan is `doc/SPEC.md` — read it before making design decisions; work items arrive as `doc/TODO-*.md` files. Current state: Phase A / Milestone 0 (the Ranking Trainer PWA) is implemented; Milestone 1 (full 1v1 hand play vs. AI, renege enforcement, scoring to 45) is next.

## Node version (required)

The machine's default `node` is v23, which Svelte tooling rejects, and `engine-strict=true` is set globally — do not bypass it with `--force` or by relaxing `.npmrc`. Use the keg-only Homebrew Node 22:

```sh
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
```

Prefix every npm/node command with this.

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

`src/lib/domain/` is pure TypeScript game logic with **zero imports from Svelte, SvelteKit, or anything UI** — this is what makes the planned Phase B Flutter port viable (SPEC §10). UI code (`src/routes/`, `src/lib/ui/`) calls into the domain, never the reverse. `src/lib/ui/persistence.ts` is the only module that touches `localStorage`, and it must stay SSR-safe (guarded by `browser`) because the single route is prerendered by adapter-static.

### Trump schemes are data, not code

Regional rule variants live in `src/lib/assets/trump-schemes/*.json` (currently only `standard.json`, the Wikipedia baseline). Each file fully defines the ranking tables: `trumpRankings` (per trump suit, highest first, with A♥ spliced in) and `plainRankings` (per non-trump suit), plus renege and scoring fields that are carried but unused until Milestone 1. **Never write `if (variant === ...)` branches in game logic** — adding a variant means adding a JSON file and registering it in `schemes.ts`, nothing else. `loadTrumpScheme()` validates exhaustively at load time so a typo in a scheme file throws instead of silently mis-ranking cards; keep that property when extending the format. Do not invent regional variant data — per SPEC §6, real players' feedback is the spec for variants.

### Domain module map

- `cards.ts` — immutable card value objects; canonical ids like `"AH"`, `"10D"` used in scheme JSON
- `trump-scheme.ts` — scheme loading/validation; `isTrump`, `trumpStrength`, `plainStrength`
- `trick.ts` — `trickWinner(led, second, trumpSuit, scheme)` and `explainTrick(...)`, which generates the learner-facing prose explanations
- `trainer.ts` — quiz question generation, weighted toward the hard cases (trump ladder)
- `rng.ts` — seedable mulberry32 PRNG; domain code takes an `Rng` so behavior is deterministic under test
- `schemes.ts` — registry of bundled schemes (imports the JSON)

Note the two-card framing: comparing two arbitrary cards has no context-free answer in this game, so everything is phrased as a *led* card plus a card *played to it*. An off-suit non-trump second card can never win.

### Testing convention

Ranking logic is tested two ways in `tests/domain/`, and both must be kept when rules code changes:

1. **Exhaustive oracle sweep** (`trick-exhaustive.test.ts`) — every (trump suit × led × second) combination, 10,608 cases, checked against an independent oracle that derives strength from the *verbal* rules as formulas. The oracle and the JSON-driven engine validate each other; never "fix" a failure by making the oracle call the production code.
2. **Named trap cases** (`trick-known-cases.test.ts`) — human-readable documentation of the famous surprises (5 > J > A♥ ladder, A♦ lowest when diamonds aren't trump, black number cards reversed: 2 high/10 low).

Per SPEC §13: reneging is the rule most likely to be implemented incorrectly — when building Milestone 1, write the renege test cases *before* the implementation.

### Layout mapping

SPEC §10's proposed structure is mapped onto SvelteKit: `src/domain/` → `src/lib/domain/`, `src/ui/` → `src/lib/ui/` + `src/routes/`, scheme JSON under `src/lib/assets/`. Tests live in `tests/domain/` (the `tests/**` include is wired into `vite.config.ts`). Svelte 5 **runes mode** is forced project-wide in `vite.config.ts`.

## Constraints worth remembering

- Accessibility is a hard requirement, not polish (SPEC §7): ≥48px tap targets (prefer 56+), large high-contrast card faces, no swipe-only gestures, respect OS font scaling.
- Privacy first: no accounts, no analytics, no network calls beyond loading the site. State persists only to `localStorage`.
- License is Apache 2.0. Any new visual asset must be CC0/MIT/Apache-compatible and recorded in `ASSETS.md` with its provenance (currently all assets are project-original, including the programmatically drawn SVG cards).
- Game state should be immutable; prefer pure functions over classes in domain code.
