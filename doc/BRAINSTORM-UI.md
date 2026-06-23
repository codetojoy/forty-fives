# Brainstorm: UI for Auction Forty-Fives

A survey of the Auction UI (`src/routes/auction/+page.svelte`), looking for
duplication, simpler structures, and tooltip opportunities. No code change yet —
this is analysis only (TODO-022). Findings are weighed against the project's hard
rules:

- **Domain purity (SPEC §10):** all of this lives in the UI layer; nothing here
  should leak into `src/lib/domain/` or `src/lib/ai/`.
- **Mobile *and* wide desktop:** the page already re-lays-out via a CSS grid at
  `48rem`. Any tooltip/disclosure idea must work on touch (no hover).
- **Flutter port (SPEC §10):** prefer patterns that survive a TS→Dart move —
  copy held as data, shared "widgets", and disclosure components rather than
  HTML-only affordances like `title=`.

Each finding states what, where, the suggestion, effort/risk, and a recommendation.
A "Considered but not recommended" section follows so the list reflects judgment,
not padding.

---

## 1. Text duplication

### 1a. "How the game ends" copy is expressed in three places
**Where:** the intro paragraph (`first team to 120` / `highest score after 4 turns…`),
the `finishNote` parenthetical beside the score, and the `Hand N of M` line in
`.hand-info`. Each independently re-derives the FOUR_TURNS-vs-`POINTS_120` phrasing.

**Suggestion:** centralize the finish-rule wording in one small UI helper module
(e.g. `auction-copy.ts`) that maps a `FinishGameRule` to its short label, its
parenthetical, and its one-line description. The three call sites read from it.

**Effort/risk:** low / low. Pure refactor of strings already isolated behind
`finishRule`/`finishNote` derives.

**Recommendation:** do it — and design the helper to be Flutter-portable (a plain
map keyed by the rule enum, no Svelte). This is the cleanest dedup win and pairs
naturally with finding 3 (a shared copy module).

### 1b. Suit colour logic is written twice
**Where:** the `trumpColor` derived and the inline `style="color: …"` on each
suit-button both compute `isRedSuit(suit) ? '#c0262d' : '#3d3a35'`.

**Suggestion:** a tiny `suitColor(suit)` helper (UI layer). One definition, two
callers; the two hex literals stop drifting.

**Effort/risk:** low / low.

**Recommendation:** do it. Trivial, and it removes a magic-colour pair that is
easy to change in one spot and forget the other.

### 1c. Suit label formatting recurs
**Where:** `{SUIT_SYMBOLS[x]} {SUIT_NAMES[x]}` appears in the trump badge, the
name-trump buttons, and the AI message string.

**Suggestion:** a `suitLabel(suit)` helper returning `"♥ Hearts"`.

**Effort/risk:** low / low, but lower value than 1a/1b — it is short and reads
fine inline.

**Recommendation:** fold into the same UI helper module if you touch 1a/1b;
not worth a standalone change.

---

## 2. Cross-game component reuse (the biggest structural lever)

**Where:** `/auction` and `/play` carry near-identical blocks:
- the **game footer** (Highlight-legal + Confirm-before-playing toggles + the
  arm-twice "Abandon game" button) — now also sharing the same `{#if !gameOver}`
  gate after TODO-013/TODO-021;
- the **confirm-before-play hint** copy;
- the **trick area** + **winner feedback** structure;
- the **"your hand" tray** with dimming/selection.

**Suggestion:** extract shared Svelte components (`GameFooter.svelte`,
`TrickArea.svelte`, `HandTray.svelte`) under `src/lib/ui/`. Both routes compose
them; rules logic stays in the domain.

**Effort/risk:** medium / medium. It is the largest change here and touches both
games, so it needs the same manual-test pass each game already gets. The anti-jump
height reserves (TODO-015) must move with the components, not get lost.

**Recommendation:** highest-value item for both KISS *and* the Flutter port —
shared widgets are exactly what ports cleanly. But it is a real refactor; schedule
it as its own TODO rather than bundling with smaller cleanups. Confirm-before-play
copy and the footer are the safest first slice; the trick area (with its tuned
fixed heights) is the riskiest and should go last.

---

## 3. Tooltips / `?`-disclosure opportunities

The goal explicitly asks about moving text into a `?` icon. The strong general
recommendation first, then the specific candidates.

> **Pattern caveat (applies to all of these):** use a **tap-toggle disclosure**,
> not a hover-only HTML `title=`. `title=` is invisible on touch, inconsistent for
> screen readers, and does not port to Flutter. Build one small accessible
> `<HelpPopover>` (button with `aria-expanded`, dismiss on Esc/outside-tap) and
> hold the copy as **data** (strings in a UI copy module), so the Flutter port
> reuses the same text. This single component then serves every case below.

### 3a. The dense intro rules paragraph
**Where:** the pre-game `.intro` paragraph packs bidding values, the kitty, scoring,
and the finish rule into one block.

**Suggestion:** lead with a short tagline ("Bid, name trump, take the kitty —
partners to 120") and tuck the full rules behind a `?`/"How to play".

**Recommendation:** do it. Also reduces first-screen vertical density, which the
recent TODO-020 / vertical-space work was chipping at.

### 3b. The trump ranking (the genuinely confusing part)
**Where:** the trump badge shows the suit but nothing about the famous
5 → J → A♥ ladder, black-number reversal, and A♦ behaviour — the part newcomers
get wrong.

**Suggestion:** a `?` beside the trump badge opening the current trump's ranking.
The data already exists in the loaded scheme (`trumpRankings`), so this is a
display of existing domain data, not new rules.

**Recommendation:** do it — arguably the highest *player-value* tooltip, and it
reuses the Ranking Trainer's reason for existing.

### 3c. The always-on renege note
**Where:** during play, `.renege-note` always renders when a renegable trump is
held.

**Suggestion:** could move behind a `?` on the relevant card. **But** this note is
time-critical (it explains a legal-but-not-forced play *right now*), so hiding it
trades clarity for tidiness.

**Recommendation:** leave inline. Only revisit if vertical space becomes a problem
on small screens; correctness-relevant prompts should stay visible.

---

## 4. KISS — small in-file simplifications

**Where / suggestions:**
- Every action panel repeats `{#if humanToX && !lastTrick}`. A single
  `const showPanels = $derived(!lastTrick)` (or wrapping the panel-slot once)
  removes the repeated guard.
- `humanToDiscard || humanToDraw` recurs in `tapCard` and `isSelected`. A
  `humanSelectingCards` derived names the concept once.
- `teamOf(HUMAN_SEAT)` and `1 - teamOf(HUMAN_SEAT)` recur. Derive `myTeam` /
  `oppTeam` once and reuse (the hand-over block already aliases `myTeam` locally —
  hoist it).

**Effort/risk:** low / low for each.

**Recommendation:** do the `myTeam`/`oppTeam` and `humanSelectingCards` derives —
they improve readability with no behaviour change. The `showPanels` guard is
optional polish.

---

## Considered but not recommended

- **Collapsing the per-seat status reserves or trick-area fixed heights.** These
  are deliberate anti-jump reserves (TODO-015). Tightening them re-introduces
  layout jump between phases. Out of scope for a "simplify" pass.
- **A generic config-driven panel renderer** to replace the explicit
  per-phase `{#if}` panels. It would obscure a flow that is currently easy to read
  and only five cases long — net complexity, against KISS.
- **Hover `title=` tooltips** for any of section 3 — rejected for touch/a11y/Flutter
  reasons stated above.
- **Merging the intro rules text with the `/auction/config` descriptions.** They
  serve different moments (learn-the-game vs. change-a-rule); deduping them would
  couple two screens for little gain.

---

## If I had to pick three

1. **Centralize finish-rule + suit copy/colour** (1a, 1b) — cheap, removes real
   drift risk, and seeds a Flutter-portable copy module.
2. **One accessible `?`-disclosure component, applied to the intro and the trump
   ranking** (3a, 3b) — best player value, and the trump-ranking help reuses
   existing scheme data.
3. **Extract the shared `GameFooter` / `HandTray` components** (section 2) — the
   biggest KISS + Flutter-port win, scheduled as its own TODO because it spans both
   games.
