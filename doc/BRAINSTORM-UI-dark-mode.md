# Brainstorm: dark mode

A scoping note and concrete plan for a dark-mode option, cross-checked against
the codebase. Question that prompted it: *how much work is dark mode, and does it
touch assets?* Verdict up front: **it is almost entirely HTML/CSS**, it does
**not** require regenerating or re-authoring any binary asset, and the real work
is (a) choosing a dark palette and (b) auditing scattered hardcoded hex — not the
theming mechanism, which the existing design tokens make cheap.

---

## 1. Why it's tractable — the token layer already exists

`src/routes/+layout.svelte` defines a single `:root` design-token block:

```css
--bg: #f7f2e7;      --panel: #fffdf6;   --ink: #3d3a35;
--muted: #6f6758;   --accent: #b0503a;  --accent-deep: #9c4632;
--rule: #ddd5c4;    --focus: #9c4632;   --good: #2c6e3f;  --bad: #b3261e;
```

Most UI consumes these via `var(--…)` (auction alone: 45 uses; play: 38; config:
28; trainer: 26). So the core of dark mode is: **provide a second set of values
for those ~10 tokens.** Everything already token-driven flips for free. This is
the load-bearing fact — without it dark mode would be a slog; with it the
mechanism is a dozen lines.

## 2. What is NOT touched (the "assets" question)

- **Fonts** (`static/fonts/*.woff2`) — colour-agnostic; unchanged.
- **Avatar SVGs** (`src/lib/assets/avatars/peep-*.svg`) — faces render fine on
  any background. No regeneration, no `ASSETS.md` change, no provenance work.
- **Favicon / PWA icons** (`favicon.svg`, `icon-*.png`, `apple-touch-icon.png`)
  — unchanged.
- **Card faces** — drawn as *inline SVG in `PlayingCard.svelte`* (code, not an
  asset file), so there is no asset pipeline to touch. **Recommendation: keep
  card faces light even in dark mode.** Real playing cards are white/cream, and a
  bright card on a dark table is exactly the high-contrast affordance SPEC §7
  asks for. So the card's `#fffdf6` face, `#c0262d` red and `#1a1a1a` black at
  `PlayingCard.svelte:42` are a *deliberate non-change* — only the card's border
  / shadow needs a glance to confirm it reads against a dark table. This is the
  single most important design call in the whole feature.

So: **no asset work.** The entire feature is CSS plus a small amount of
persistence/UI glue.

## 3. The actual work, in order of effort

1. **Define the dark palette** — small in code, but the real design decision.
   Dark `--bg`/`--panel`, lightened `--ink`/`--muted`, and re-tuned
   `--accent`/`--good`/`--bad` for adequate contrast on dark. SPEC §7 makes
   contrast a hard requirement, not polish, so this deserves a real check (aim
   WCAG AA on body text).
2. **Audit scattered raw hex** — the medium chunk, and the only tedious part.
   Several places hardcode colours instead of using tokens and would stay stuck
   in light values under a dark theme. Files with raw hex today:

   | File | raw hex count |
   |---|---|
   | `src/routes/+layout.svelte` | 10 (the token defs themselves + a few strays) |
   | `src/routes/trainer/reference/+page.svelte` | 8 |
   | `src/routes/auction/+page.svelte` | 8 |
   | `src/routes/play/+page.svelte` | 4 |
   | `src/lib/ui/TrumpRankingHelp.svelte` | 4 |
   | `src/routes/trainer/+page.svelte` | 3 |
   | `src/routes/auction/config/+page.svelte` | 3 |
   | `src/lib/ui/StatsPage.svelte` | 2 |

   Each stray hex becomes either an existing token or a new dark-aware one.
   Mechanical, but touches ~8 files and needs a visual sweep of each screen.
3. **`app.html` theme-color** — `<meta name="theme-color" content="#9c4632">` is
   fixed. Either leave it (harmless) or, with a manual toggle, update it from the
   pre-paint script. Minor.

## 4. The one design fork that drives scope

**OS-following vs. a config toggle.**

- **A — OS-following only** (`@media (prefers-color-scheme: dark)`): pure CSS, no
  persistence, no config UI, no flash-of-wrong-theme risk. Cheapest; ~half a day
  once the palette is chosen. But the user asked for a *config setting*, which
  this is not.
- **B — Light / Dark / System toggle** (recommended): honours the request. Adds
  a persisted preference and a tiny pre-paint script to stamp `data-theme` on
  `:root` before first paint (avoids a light→dark flash on load). ~a day.

Recommendation: **B**, and note the theme is **global, not per-game.** A colour
theme is a device/display preference, not an Auction rule and not a per-save
setting. So it should **not** go into `AuctionConfig` (rules profile) nor be
duplicated into each game's `AuctionGameSettings` / play settings. It belongs in
a single app-wide settings slot.

## 5. Concrete plan (option B)

CSS mechanism — dual signal so both OS-following and the manual override work,
and the override always wins:

```css
:root { /* light tokens (unchanged) */ }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { /* dark token values */ }
}
:root[data-theme='dark'] { /* dark token values */ }
```

(Mirrors the theme-aware pattern already used elsewhere: dark as the media
default, explicit `data-theme` overriding in both directions.)

Persistence — reuse the existing `localStorage` chokepoint:

- Add a global `theme: 'system' | 'light' | 'dark'` to `src/lib/ui/persistence.ts`
  under a new app-level key (e.g. `forty-fives.app.v1`), **not** inside a game
  envelope. Keep it `browser`-guarded and SSR-safe like the rest of the module
  (all routes are prerendered by adapter-static).
- Because the token block lives in the layout, a **new "Theme" control** is best
  placed either in `/about` or a small global settings affordance reachable from
  the home chooser. (Deliberately *not* the per-game config pages — it's not a
  game setting.)

Pre-paint stamp — avoid the flash. A tiny inline script in `app.html`
`<head>` reads the stored value and sets `document.documentElement.dataset.theme`
before first paint. It must be inline (no import) and null-safe. `'system'`
leaves `data-theme` unset so the media query drives it.

Card faces — leave `PlayingCard.svelte` as-is (§2); verify the card border /
outer shadow against dark `--bg` and bump only if the edge disappears.

## 6. Verification recipe (house pattern)

- `npm run check` → 0 errors / 0 warnings.
- `npm test` → full suite green (no domain logic changes; a persistence
  default/round-trip test for `theme` is the only plausible new test — parallels
  the existing `persistence.test.ts` envelope tests).
- `npm run build` + `npm run preview` → walk `/`, `/trainer`, `/play`,
  `/auction`, each `config`, `/about` in both themes; confirm no light-stuck
  panels and adequate contrast. (The in-game views don't prerender, so they're
  eyeballed under preview, not grepped from static HTML.)
- Toggle System/Light/Dark, reload → no flash, preference sticks.
- Bump version when implemented.

## 7. Open questions for the human

1. **Toggle or OS-only?** (Drives §4; recommend the toggle since you framed it as
   a config setting.)
2. **Where does the Theme control live?** `/about`, or a new global settings
   entry from the home chooser? (Recommend not the per-game config pages.)
3. **Card faces stay light** — agreed? (Recommended; real-card metaphor +
   SPEC §7 contrast.)

Nothing implemented — this is a plan. On a go-ahead this would become
`doc/TODO-0NN.md` per the usual capture → implement → mark-complete flow.
