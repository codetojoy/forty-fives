# Brainstorm: Phase B — Flutter re-write logistics

How a Phase B Flutter port (SPEC §10) would be organized: one repo or two, what
actually carries over from this codebase, and how cross-repo work would proceed.
No code change — this is planning only, recorded against SPEC §10 so the decision
has a home. The conclusions lean on the project's hard rules:

- **Domain purity (the load-bearing rule):** `src/lib/domain/` and `src/lib/ai/`
  are pure TypeScript with zero UI imports — that is precisely what makes this
  port viable, and shapes everything below.
- **Schemes are data, not code:** regional rule variants live as JSON
  (`src/lib/assets/trump-schemes/*.json`), so they move untouched.
- **License/provenance:** Apache 2.0; any asset must keep its `ASSETS.md`
  provenance in whichever repo it lands.

---

## 1. Short answer

A **separate repo** (`forty-fives-flutter`) is the right call for the Flutter
app, and **yes, work can span two repos** in one session — with a caveat about
how (see §4). SPEC §10 frames Phase B as a *port*, not a shared build: what gets
reused is the **domain design**, not the runtime code.

## 2. Why a separate repo (not a folder here)

This repo is a SvelteKit web app: `package.json`, `vite.config.ts`,
`svelte.config.js`, adapter-static build, service worker, npm tooling — all
rooted at the top level. A Flutter app brings its own incompatible world:
`pubspec.yaml`, `lib/`, `android/`/`ios/`/`web/`, Dart tooling, its own CI.
Combining both in one repo (a monorepo) means:

- Two unrelated toolchains and lockfiles competing at the root.
- CI that has to conditionally run npm *or* Flutter based on changed paths.
- `CLAUDE.md`, the `engines` range, and `.npmrc` (`engine-strict=true`) all
  assume Node — each would need carve-outs.
- Muddied provenance: `ASSETS.md`, `SPEC.md`, and the license currently describe
  one app.

A clean `forty-fives-flutter` repo keeps each app idiomatic.

## 3. What actually carries over

The domain-purity rule pays off here. `src/lib/domain/` and `src/lib/ai/` are
pure TypeScript with no UI imports — they are a **specification you
re-implement in Dart**, function for function:

| TypeScript (here)                                                                 | Dart (new repo)                                  |
| --------------------------------------------------------------------------------- | ------------------------------------------------ |
| `cards.ts`, `trick.ts`, `rules-engine.ts`, `scoring.ts`, `game-state.ts`, the AI  | hand-ported to Dart, same signatures/semantics   |
| the trump-scheme **JSON** (`standard.json`)                                        | **copied verbatim** — it's data, not code        |
| the oracle sweeps + named trap cases                                              | re-expressed as Dart tests — same cases           |

That test suite is the real asset. Porting `trick-exhaustive` (10,608 cases) and
the renege/legality sweeps to Dart gives a provable "the Dart engine ranks cards
identically to the TS engine." The schemes being plain JSON means zero
translation there.

## 4. Working across two repos

Two workable modes:

1. **Both repos in one session (preferred for a port).** Once
   `forty-fives-flutter` exists on GitHub, it can be added to the session
   alongside this one, so both are readable together — e.g. diffing a Dart
   `trick.dart` against the TS `trick.ts` to verify the port. Cross-referencing
   the source-of-truth is the whole job, so this is the better mode.
2. **Separate sessions**, one rooted in each repo, if isolation is preferred.

Honest limitation: the port goes most reliably when **both repos are checked out
and visible in the same session** — porting from memory across sessions is
error-prone; the TS source wants to be readable while the Dart is written. So the
practical flow is: create the empty Flutter repo, add it here, and port
module-by-module with the TS original open beside it.

## 5. Suggested sequencing (when ready)

1. `flutter create forty-fives` → push as its own repo, Apache 2.0, copy the
   `SPEC.md`/`ASSETS.md` provenance.
2. Copy the scheme JSON over untouched.
3. Port the domain bottom-up: `cards` → `trump-scheme` → `trick` →
   `rules-engine` → `scoring` → `game-state`, **porting each module's tests
   first** (SPEC §13's renege-tests-first discipline, already in `CLAUDE.md`).
4. Port the AI; run it as self-play property tests like `heuristic.test.ts` does.
5. Only then build Flutter UI — by which point the domain is proven equivalent.
