# Brainstorm v2: Phase B Flutter logistics — findings cross-checked

A verification pass over `doc/BRAINSTORM-PHASE-B-flutter.md` (the v1 note),
checking each claim against the codebase, `doc/SPEC.md`, and the other `doc/`
files. Method: scanned every import in `src/lib/domain/` and `src/lib/ai/`,
read the test sweeps, ran the suite (410 passing), and re-read SPEC §3/§4/§10.

Verdict up front: the v1 logistics conclusions hold (separate repo; port the
domain against ported tests; work both repos in one session). But v1 has one
framing error (Flutter is not "the" Phase B plan — it is the contingent Path 2),
missed that `doc/ARCH-PhaseB.md` already covers the port in depth, and
understates the port surface by roughly half by listing only the 1v1 modules.

---

## 1. Confirmed (brief)

- **Domain purity holds in fact, not just policy.** Every import in
  `src/lib/domain/*.ts` and `src/lib/ai/*.ts` is relative (`./`, `../domain/`)
  except one build-time JSON import in `schemes.ts`. Zero Svelte/SvelteKit/UI
  imports. The port premise is sound.
- **Test-count claims are accurate.** `trick-exhaustive.test.ts` states its
  4 × 52 × 51 = 10,608-case sweep; `rules-engine.test.ts` states its
  265,200-case legality sweep. Suite currently 410 tests, all passing.
- **AI self-play property tests exist as described** — and for *both* AIs:
  `tests/ai/heuristic.test.ts` and `tests/ai/auction-ai.test.ts` (v1 mentioned
  only the former).
- **Schemes are data.** One 88-line `standard.json`; nothing else. Copying it
  verbatim is right (see §3.3 for the loader nuance).
- **The monorepo objections are real.** `engine-strict=true` in `.npmrc`, the
  `engines` range, and all root tooling are npm/Node-shaped; CLAUDE.md forbids
  loosening them. A Flutter tree at the root would fight all of that. Separate
  repo stands.
- **License is Apache 2.0** as v1 said (v1 matches the actual `LICENSE`; note
  the SPEC §10 tree comment still says "MIT" — a stale SPEC detail, not a v1
  error).
- The cross-repo workflow claims (§4 of v1) are about tooling, not the
  codebase; nothing here contradicts them.

## 2. Disagreements

### 2.1 Phase B is not "the Flutter re-write" — Flutter is contingent Path 2

v1's framing ("if we were to move into Phase B with a Flutter re-write") slides
into treating Flutter as the Phase B plan. SPEC §3 says Phase B is *"wrap PWA
in Capacitor, OR rewrite in Flutter if needed"*, and SPEC §4 makes it explicit:
**Path 1 (Capacitor wrap) is the default**, and Path 2 (Flutter) is taken *only
if the PWA's iOS experience is too rough* — a decision deferred until real
tester feedback is in. `doc/ARCH-PhaseB.md` reaches the same conclusion:
"Default to Path 1. Escalate to Path 2 only if tester feedback says the iOS
webview feel or animation quality is the actual blocker."

Consequence for logistics: **the repo question may never arise.** Path 1 reuses
this repo outright (Capacitor config lives alongside the existing build). Only
Path 2 triggers the separate-repo decision — where v1's answer is correct.

### 2.2 v1 duplicates ground already covered by `doc/ARCH-PhaseB.md`

v1 was written without noticing `doc/ARCH-PhaseB.md`, which already contains:
the two-path decision tree, the ports-vs-rebuilds table with LOC counts, the
Svelte→Flutter mapping (`$state` → Riverpod/`setState`, `PlayingCard.svelte` →
`CustomPainter`/`flutter_svg`, `localStorage` → `shared_preferences`), the
tests-first porting discipline, and a build sequence (Trainer → 1v1 →
Auction). v1's genuinely new content is the **repo-logistics** answer (separate
repo vs. folder; how cross-repo sessions work). Read v1 as a supplement to
ARCH-PhaseB on that one question, not as the port plan.

## 3. Clarifications

### 3.1 The port surface is roughly double what v1's table shows

v1's table lists `cards`, `trick`, `rules-engine`, `scoring`, `game-state`,
"the AI". The actual `domain/` + `ai/` layer is 16 modules, 2,353 LOC, and the
auction layer — the largest single module in the codebase — is absent:

| Module | LOC | In v1's table? |
| --- | ---: | :---: |
| `auction-game-state.ts` | 514 | no |
| `auction-ai.ts` | 265 | no ("the AI" at best) |
| `game-state.ts` | 257 | yes |
| `auction-config.ts` | 180 | no |
| `trick.ts` | 175 | yes |
| `trump-scheme.ts` | 152 | no |
| `auction-scoring.ts` | 149 | no |
| `trainer.ts` | 122 | no |
| `rules-engine.ts` | 113 | yes |
| `heuristic.ts` | 110 | yes ("the AI") |
| `scoring.ts` | 86 | yes |
| `cards.ts` | 74 | yes |
| `deck.ts` | 66 | no |
| `bidding.ts` | 37 | no |
| `rng.ts` | 35 | no |
| `schemes.ts` | 18 | no |

Everything missing is still pure and portable — the *conclusion* survives, but
effort estimates based on v1's table would be off by ~2×. The auction game
(bidding, kitty, drawing phase, partnership scoring, config snapshotting) is
the bulk of the domain by lines.

### 3.2 v1's porting sequence skips prerequisites and the whole auction layer

v1 proposed `cards → trump-scheme → trick → rules-engine → scoring →
game-state`. The real import graph adds three things:

- **`rng` and `deck` must land before `game-state`** — both `game-state.ts`
  and `auction-game-state.ts` import `deal`/`dealAuction` and `Rng`. The AIs
  and `trainer` also take an `Rng`.
- **The auction chain follows:** `bidding` and `auction-config` →
  `auction-scoring` → `auction-game-state` (which imports cards, deck, rng,
  rules-engine, trick, trump-scheme, bidding, auction-config, auction-scoring,
  and shared trick types from `game-state`).
- **`trainer.ts` is domain too** (quiz generation) and ports if the Trainer
  mode is rebuilt — ARCH-PhaseB's sequence rebuilds Trainer *first*, so it
  ports early, not never.

Corrected bottom-up order: `cards → rng → trump-scheme (+ JSON) → deck → trick
→ rules-engine → scoring → game-state → trainer → bidding → auction-config →
auction-scoring → auction-game-state → heuristic → auction-ai`.

### 3.3 "JSON copied verbatim" — true for the data, but the validator is code

The scheme file moves untouched, but two adjacent pieces are code that must be
re-written in Dart:

- `trump-scheme.ts` (152 LOC) — the loader **validates exhaustively at load
  time** so a scheme typo throws instead of silently mis-ranking cards.
  CLAUDE.md calls preserving that property a requirement. The Dart loader must
  reproduce the full validation, not just `json.decode`.
- `schemes.ts` imports the JSON at build time; in Flutter this becomes a
  bundled asset read via `rootBundle` — trivially different, worth knowing.

### 3.4 The PRNG is an opportunity, not just a porting chore

`rng.ts` is mulberry32 built on JS 32-bit semantics (`Math.imul`, `>>> 0`,
`/ 2**32`). Dart ints are 64-bit, so a naive translation silently diverges —
each step needs explicit `& 0xFFFFFFFF` masking to reproduce the 32-bit
wraparound. But getting this **bit-for-bit identical** buys a verification
stronger than anything v1 proposed: the same seed then produces the same
shuffle, deals, and (deterministic-AI) self-play trace in both engines, so the
port can be validated by **replaying whole seeded games across TS and Dart and
diffing the state histories** — on top of the ported oracle sweeps. If
bit-parity proves fiddly, the oracle sweeps alone still suffice; the replay
check is a cheap extra layer worth attempting first.

### 3.5 "Function for function, same signatures" — mechanical, with idiom shifts

The port is mechanical (SPEC §10 says as much) but not literally
signature-preserving. The phase types are TS discriminated unions
(`phase.kind === 'bidding' | 'drawing' | …`), which become Dart sealed classes
(or `freezed` unions); `readonly` arrays become unmodifiable lists by
convention. One property to carry over deliberately: `GameState` /
`AuctionGameState` are **plain JSON-able data** carrying only the scheme *id*
— keep the Dart state serializable the same way so saved games work identically
under `shared_preferences`.

### 3.6 Citation nit

v1 cites SPEC §10 for "Phase B is a port". §10 is the repo-structure /
domain-purity section; the phase framing lives in §3 (phases) and §4 (the two
paths). Minor, but the distinction matters given §2.1.

---

## 4. Bottom line

Keep v1's logistics answer for the Path 2 world: separate `forty-fives-flutter`
repo, JSON schemes copied as-is, tests ported first, both repos open in one
session while porting. Correct its framing per SPEC: Capacitor (Path 1, this
repo, no new repo) is the default Phase B, and Flutter is the escalation. For
the port plan itself, `doc/ARCH-PhaseB.md` is the fuller reference; this pair
of notes adds the repo logistics and (above) the corrected port surface,
sequencing, PRNG-parity trick, and validator caveat.
