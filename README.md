# Forty-Fives

A free, open-source app for playing **Forty-Fives**, the trick-taking card game with deep
roots in Atlantic Canada. See [doc/SPEC.md](doc/SPEC.md) for the full project plan.

**Current status: Phase A / Milestone 0 — the Ranking Trainer.** A teaching tool, not yet a
game: pick a trump suit, look at two cards from a trick, and tap the one that wins. Every
answer comes with an explanation of *why* ("the A♥ is always trump…"). It's an installable,
offline-capable PWA.

## Running the app locally

### Prerequisites

- **Node.js 20.19+, 22.12+, or 24+** (an LTS line; the tooling does not support odd-numbered
  releases like Node 23) and npm.
- Any modern browser.

> macOS + Homebrew tip: `brew install node@22`, then prefix commands with
> `PATH="/opt/homebrew/opt/node@22/bin:$PATH"` (or `brew link node@22`).

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

The domain tests include an exhaustive sweep: every (trump suit × led card × second card)
combination — 10,608 cases — is checked against an independently-written oracle of the
verbal rules, per SPEC §13.

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
| `src/assets/trump-schemes/` | `src/lib/assets/trump-schemes/` — rule variants as JSON data |
| `src/ui/` | `src/lib/ui/` + `src/routes/` — Svelte components |
| `tests/domain/` | `tests/domain/` — exhaustive ranking/comparison tests |

Key domain modules:

- `cards.ts` — card value objects, the 52-card deck
- `trump-scheme.ts` — loads and validates a rule variant; answers "how strong is this card?"
- `trick.ts` — which card wins, and the human-readable explanation why
- `trainer.ts` — quiz question generation, weighted toward the hard cases
- `schemes.ts` — registry of bundled variants (currently `standard.json` only; regional
  variants are added as data files once validated with real players — no code changes)

## License

[Apache 2.0](LICENSE). Visual asset provenance is documented in [ASSETS.md](ASSETS.md).
