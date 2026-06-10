# Forty-Fives App — Project Plan & Spec

A Maritime Canadian trick-taking card game, in software form.

---

## 1. Project Overview

Build a free, open-source app that lets people play **Forty-Fives** (and eventually **Auction Forty-Fives**), a trick-taking card game with deep roots in Atlantic Canada. The game has unusual, region-specific rules — particularly the trump-suit card rankings — that are passed down orally in community halls. The app serves two audiences:

- **Existing players** (often seniors) who want to play on a device.
- **Younger learners** who want to absorb the rules without a teacher at the table.

Reference: <https://en.wikipedia.org/wiki/Forty-fives>

### Non-goals

- No profit motive; no ads; no in-app purchases.
- No real-money gambling features.
- No accounts or backend in early phases (privacy is a feature).

---

## 2. Goals & Constraints

| Constraint | Decision |
|---|---|
| **Cost to user** | Free |
| **Source** | Open source (Apache 2 license) |
| **Platforms** | iOS + Android, single codebase |
| **UI polish** | "Decent" — not a for-profit app, but accessible and clean |
| **Developer background** | Senior backend engineer; new to mobile, UI, and game dev |
| **Publishing experience** | First-time app publisher |
| **Region** | Built in Prince Edward Island; aware of regional rule variants across PEI, NB, NS, NL |

---

## 3. Strategic Approach: PWA-First, Native Later

Rather than commit immediately to a native mobile stack, the project will ship in two phases:

```
Phase A: PWA prototype  →  validate gameplay, rules, AI
              ↓
Phase B: App-store release  →  wrap PWA in Capacitor, OR rewrite in Flutter if needed
```

**Rationale:** Validate the product with real Maritime players (target ~10–20 testers) before paying Apple's $99/year, buying a Mac, or learning a new framework. A PWA can be shared via URL or QR code, costs ~$15/year for a domain, and can be updated instantly without app-store review.

**Risk acknowledged:** If Phase A succeeds, some rework may be needed for Phase B — but design decisions made during Phase A carry over, and the second pass is faster.

---

## 4. Tech Stack

### Phase A (PWA)

- **Framework:** SvelteKit (primary recommendation) or React + Vite (fallback if more documentation is desired)
- **Language:** TypeScript
- **PWA tooling:** Vite PWA plugin (service worker, manifest, offline cache)
- **Hosting:** Cloudflare Pages or Netlify (free tier)
- **Domain:** ~$15/year (e.g. `fortyfives.ca`)
- **Card assets:** SVG, rendered inline
- **State:** In-memory; persisted to `localStorage` (settings, in-progress game)

### Phase B (App Store)

Two paths, decision deferred until Phase A feedback is in:

- **Path 1 — Capacitor wrap:** Reuse the PWA codebase, wrap in a thin native shell. Lowest effort.
- **Path 2 — Flutter rewrite:** If the PWA's iOS experience is too rough, rewrite in Flutter for true native feel and better animation.

---

## 5. Roadmap & Milestones

The product is **one app with multiple modes**, not three separate apps. Shared code (card model, trump rules, settings, assets) is the bulk of the work.

### Milestone 0 — Ranking Trainer

A teaching tool, not a game.

- User selects a trump suit.
- App shows two cards; user picks which wins.
- Immediate feedback with explanation ("In trump diamonds, the 5♦ beats the J♦ because…").
- Configurable for regional variants (see §6).

**Acceptance:** A new user can reach 90% accuracy on trump rankings after 15 minutes of use.

### Milestone 1 — Forty-Fives, 1v1 vs AI

- Full single-hand play (5 tricks).
- Rule-based AI opponent.
- Score tracking to 45.
- Visual highlighting of legal cards (toggleable).
- Reneging rules enforced.

**Acceptance:** A knowledgeable player confirms the rules behave correctly across 20 hands, including reneging edge cases.

### Milestone 2 — Partners Mode (2v2)

- 4 players, 1 human + 3 AI (2 opponents, 1 teammate).
- AI shows basic partnership awareness (does not "shoot" its own partner).

### Milestone 3 — Auction Forty-Fives

- Adds bidding (15/20/25/30, optional "30 for 60").
- AI bid estimation from 5-card hand.
- Kitty mechanics.
- Score to 120.

### Milestone 4 (Stretch) — Online Multiplayer

- Defer indefinitely. Adds backend, accounts, matchmaking — a different engineering problem entirely.
- Only attempt if there's clear demand from Phase B users.

---

## 6. Core Domain Model

### Trump Scheme as Data, Not Code

**Critical design decision.** Regional rule variants are first-class configuration, not feature flags.

```
trump-schemes/
  standard.json         # Wikipedia baseline
  pei.json              # Prince Edward Island variant
  northern-nb.json      # Northern New Brunswick variant
  cape-breton.json      # Cape Breton variant
  custom.json           # User-defined house rules (future)
```

Each scheme defines:

- Card rank order per (trump_suit, card_suit) pair
- Whether A♥ is always trump
- Whether joker is used (and where it ranks)
- Reneging rules (which cards may renege, and when)
- Non-trump ace ranking (high everywhere vs. low-in-diamonds)
- Scoring rules (45 vs. 120, bonus trick value)

Loading a scheme should be the *only* thing that changes between regional variants. No `if (variant === 'pei')` branches in game logic.

### Card Model

- 52 cards + optional joker.
- Each card knows: suit, rank, and methods to compute its strength under a given trump scheme + trump suit.
- Cards are value objects; the deck/hand/trick collections are where mutation lives.

### AI

This is the most interesting backend problem in the project.

**Phase 1 (Milestone 1): Heuristic AI.**
- Track played cards (especially trumps).
- Play lowest card that wins the trick if leading would help; otherwise dump weakest legal card.
- Save renegable trumps (5, J, A♥) for late tricks when valuable.
- Recognize "must follow suit" vs. "may renege" situations.

**Phase 2 (Milestone 3+): Monte Carlo rollout.**
- For each legal play, simulate N random completions of the hand (filling unknown opponent cards from the unseen pool).
- Score each rollout by tricks won.
- Pick the card with the highest average score.
- This handles hidden information well and tends to outperform hand-tuned heuristics.

**Difficulty levels** can be implemented by varying N (rollouts) or by injecting noise into the heuristic AI.

### Rules Ground Truth

Wikipedia is a starting point, not authoritative. Before shipping Milestone 1, validate the rules implementation against 3–5 real players from different communities. Their feedback is the spec.

---

## 7. UX & Accessibility

Target users include seniors. Treat accessibility as a hard requirement, not a polish item.

- **Card faces:** Large, high-contrast, distinct suit colors.
- **Tap targets:** Minimum 48dp (≈48px), preferably 56dp+.
- **No tiny close buttons.** No swipe-only gestures without button alternatives.
- **Font scaling:** Respect OS accessibility settings.
- **Legal-card highlighting:** A toggleable overlay that highlights which cards in the hand are legal to play this trick. Essential for learners and for any player uncertain about reneging.
- **Undo for misclicks:** A "did you mean to play that?" confirm option in the settings, defaulting to on for new users.
- **No sound by default** (community-hall friendly), with optional audio toggle.

---

## 8. Assets

### Playing Cards

- Use a public-domain SVG deck — first choice: Byron Knoll's deck or a CC0 deck from Wikimedia Commons or Kenney.nl.
- Render inline as SVG for sharp scaling on any screen size.

### Avatars

- **DiceBear** (MIT-licensed, procedural) — generates unique avatars from a seed string. No image files to ship.
- Keep avatars small and unobtrusive. The game is in the cards, not the faces.

### Sounds (deferred)

- Optional, off by default.
- If added: short, gentle audio cues (card-play, trick-won). No music.

---

## 9. Publishing & Legal

### Phase A (PWA)

- Domain registration: ~$15/year.
- Hosting: free tier (Cloudflare Pages or Netlify).
- No app store involvement.
- Privacy policy: minimal — no accounts, no analytics, no network calls beyond loading the site.

### Phase B (App Stores)

- **Google Play:** $25 USD one-time fee.
- **Apple App Store:** $99 USD/year, recurring. Requires a Mac for builds.
- **Mac requirement:** Buy/borrow a Mac Mini, or use a cloud Mac service (Codemagic, MacStadium).
- **Review:** Google is fast (hours); Apple is slower and more opinionated.

### Licensing

- **Code:** MIT license. (Apache 2.0 is also acceptable; avoid GPL — it conflicts with Apple's app store terms.)
- **Assets:** Use only CC0, MIT, or Apache-compatible assets. Document the license of every asset in `ASSETS.md`.

### Name / Trademark

- Search both app stores for existing "Forty-Fives" / "45s" apps before committing to a name.

---

## 10. Repository Structure (proposed)

```
fortyfives/
├── README.md
├── LICENSE                          # MIT
├── ASSETS.md                        # provenance of all visual assets
├── docs/
│   ├── rules/                       # rules documentation per variant
│   ├── design/                      # UI sketches, design decisions
│   └── ai-notes/                    # AI strategy notes
├── src/
│   ├── domain/                      # pure logic — no UI dependencies
│   │   ├── cards.ts
│   │   ├── deck.ts
│   │   ├── trump-scheme.ts          # loads & applies schemes
│   │   ├── game-state.ts
│   │   ├── trick.ts
│   │   ├── scoring.ts
│   │   └── rules-engine.ts          # what plays are legal?
│   ├── ai/
│   │   ├── heuristic.ts
│   │   └── monte-carlo.ts           # later
│   ├── ui/                          # framework-specific components
│   │   ├── components/
│   │   ├── routes/
│   │   └── styles/
│   ├── assets/
│   │   ├── cards/                   # SVG deck
│   │   └── trump-schemes/           # JSON config files
│   └── app.ts                       # entry point
├── tests/
│   ├── domain/                      # exhaustive — every ranking, every renege case
│   ├── ai/
│   └── e2e/
└── package.json
```

**Architectural principle:** The `domain/` and `ai/` directories must have **zero dependencies on the UI framework**. This is what makes a Flutter rewrite (Phase B Path 2) viable — the entire game engine ports over by hand-translating TypeScript to Dart, which is mechanical work.

---

## 11. Open Questions / Decisions Deferred

These should be answered before Milestone 1 ships:

1. **Authoritative rules source.** Who are the 3–5 players we validate against? Plan field interviews early.
2. **Default variant.** Which regional variant ships as the default? (Recommend: Nova Scotia / generic, with PEI and Northern NB as switchable alternates.)
3. **Single-hand vs. full-game.** Does Milestone 1 ship with full game-to-45 scoring, or just single-hand demo mode? (Recommend: full game.)
4. **AI personality.** Does the AI have a name and avatar, or is it anonymous? (Recommend: named opponents — "Margaret," "Stewart" — for community-hall flavor.)
5. **Telemetry.** Even for Phase A, do we want any anonymized usage data (e.g. via Plausible)? (Default: no. Privacy first.)

---

## 12. Immediate Next Steps

1. Set up the repo with the structure in §10.
2. Define the trump-scheme JSON format (§6).
3. Encode the Wikipedia/standard trump scheme as the first JSON file.
4. Implement pure-domain card + ranking logic in TypeScript with exhaustive tests.
5. Build the Ranking Trainer UI (Milestone 0) as the first user-facing surface.
6. Share with 2–3 players for early rules validation.

---

## 13. Notes for Claude Code

- Treat the `domain/` layer as the heart of the project. Test it relentlessly. The UI is replaceable; the rules engine is not.
- When implementing trump rankings, generate exhaustive test cases — every (trump_suit, leading_suit, card_a, card_b) combination — from the JSON spec. Bugs here will be invisible until a player notices.
- Prefer pure functions over classes for game logic. Game state should be immutable; transitions produce new states.
- The "what cards are legal to play right now" function is called constantly (every hand, every trick). It must be both correct and fast.
- Reneging is the rule most likely to be implemented incorrectly. Write the renege test cases first, before the implementation.
