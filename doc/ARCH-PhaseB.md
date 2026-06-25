# Phase B: shipping to the app stores

How to take the current Phase A PWA to native app stores. Reference: `doc/SPEC.md`
§3 (phases), §4 (the two paths), §9 (publishing), §10 (the domain-purity bet). For
the current architecture see `doc/ARCH-overview.md`. Audience: a senior dev who
knows the games but is new to Svelte. Brevity over completeness.

## Where we are, and the decision

Phase A is shipped: a fully static, offline PWA (SvelteKit + adapter-static) with a
manifest, icons, a service worker, three game modes, and a pure TS game engine.
Phase B is **deferred until tester feedback is in** (SPEC §3) and forks two ways:

```
   Phase A feedback ─▶ is the iOS PWA experience good enough?
                          │
                  yes ────┴──── no
                   │             │
                   ▼             ▼
            Path 1            Path 2
            Capacitor wrap    Flutter rewrite
            (lowest effort)   (native feel/animation)
```

Path 1 reuses this codebase inside a thin native shell. Path 2 rewrites the UI in
Flutter but **ports the engine** — which is exactly why `domain/`+`ai/` were kept
UI-free (SPEC §10). The cheap move is to ship Path 1 first and escalate to Path 2
only if iOS feel/animation is the blocker.

## Shared prerequisites (either path)

From SPEC §9 — these are unavoidable the moment you target stores:

- **Accounts:** Google Play $25 (one-time), Apple $99/yr (recurring).
- **A Mac** for iOS builds (Mac Mini, or a cloud Mac: Codemagic / MacStadium).
- **Name/trademark** search both stores for existing "Forty-Fives" / "45s" apps.
- **Asset licensing:** every visual asset CC0/MIT/Apache and logged in `ASSETS.md`
  (today all assets are project-original — clean).
- **Privacy policy:** minimal — still no accounts, no analytics, no network calls.

---

## Path 1 — Capacitor wrap

Capacitor is a thin native shell (an `WKWebView`/`WebView`) that loads your built
static site from the app bundle and exposes native APIs via plugins. Because we
already emit static HTML, **there is no SSR to remove** — adapter-static's `build/`
is exactly what Capacitor wants.

```
   ┌──────────── native app (iOS / Android) ───────────┐
   │  Capacitor shell                                   │
   │   ├─ WKWebView / WebView                            │
   │   │    └─ loads build/  (the same prerendered PWA)  │
   │   └─ plugins: Preferences, SplashScreen, StatusBar… │
   └────────────────────────────────────────────────────┘
```

**Steps**

1. `npm i @capacitor/core && npm i -D @capacitor/cli`, then `npx cap init`.
2. Set `webDir` to the adapter-static output (`build/`).
3. `npm i @capacitor/ios @capacitor/android`, then `npx cap add ios` / `add android`.
4. `npm run build && npx cap copy`, then `npx cap open ios` (Xcode) / `open android`.

**Gotchas specific to this app**

- **Base path.** The site is hosted on GitHub Pages under a subpath (`base` is `''`
  at root but e.g. `/forty-fives` on Pages). In a native bundle the app loads from
  `capacitor://`/`file://`, so you must **build with `base: ''`** for the native
  target (a separate build env), or every asset URL 404s in the webview.
- **Durable storage.** Migrate `lib/ui/persistence.ts` from `localStorage` to the
  Capacitor **Preferences** plugin — WebView `localStorage` can be evicted by the
  OS. This is a one-file change: persistence is the single chokepoint, so swap its
  internals behind the same API. Still local-only; privacy unchanged.
- **Service worker** is largely redundant inside the shell (assets are already
  bundled and offline). Keep it harmless or disable it; don't let its update logic
  fight the native bundle.
- **Safe areas / notch:** add `viewport-fit=cover` and `env(safe-area-inset-*)`
  padding to the fixed chrome (headers, footers).
- **Native niceties:** SplashScreen + StatusBar plugins; handle the Android back
  button. Tap targets are already ≥48px (SPEC §7), so touch ergonomics carry over.

**Trade-off:** lowest effort, one shared codebase and engine — but shipping an
asset change now means a store review (unlike the instant-deploy PWA), and the iOS
"feel" is still a webview, which is the very thing Path 2 exists to fix.

---

## Path 2 — Flutter rewrite

The rewrite is **not** from zero: the engine ports, only the UI is rebuilt. This is
the payoff of the domain-purity rule.

```
   PORTS (mechanical TS ─▶ Dart)        REBUILT (no port path)
   ────────────────────────────        ───────────────────────
   src/lib/domain/  ~1980 LOC           Svelte pages/components ─▶ Flutter widgets
   src/lib/ai/      ~370  LOC           SVG cards ─▶ CustomPainter / flutter_svg
   trump-scheme JSON  (as-is, data)     localStorage ─▶ shared_preferences
   tests (oracle+traps) ─▶ Dart tests   routing ─▶ go_router / Navigator
                                        runes ($state) ─▶ Riverpod / Provider
```

**What ports cleanly**

- **`domain/` + `ai/` (~2,350 LOC of pure TS)** hand-translate to Dart — mechanical
  work, no framework entanglement (SPEC §10).
- **Trump-scheme JSON** ships unchanged; only the loader/validator is rewritten.
  "Data, not code" pays off here.
- **The test suite is the safety net.** Re-implement the exhaustive oracle sweeps
  and named trap cases in Dart **first**, then make the port pass them. TDD the
  translation — the oracles independently re-derive the rules, so a faithful port
  is provable, not hoped-for.

**What is rebuilt from scratch** — the entire UI layer (`routes/` + `lib/ui/`).

**Svelte → Flutter mapping**

| Svelte (current) | Flutter equivalent |
|---|---|
| `$state` / `$derived` | state notifier / computed (Riverpod or `setState`) |
| `$props()` | widget constructor fields |
| `+page.svelte` (route) | a screen widget + route entry |
| `$lib/...` import | Dart package import |
| `PlayingCard.svelte` (inline SVG) | `CustomPainter` (or `flutter_svg`) |
| adapter-static build | `flutter build ios/apk` |
| `localStorage` via persistence.ts | `shared_preferences` |

**Sequence**

1. Port `domain/` + `ai/` to Dart, driven by the translated test harness.
2. Rebuild UI mode-by-mode, smallest first: **Trainer → 1v1 Play → Auction**.
3. Wire persistence (`shared_preferences`) behind the same small interface.
4. Native packaging (icons, splash, store metadata).

**Trade-off:** high effort (a full UI rebuild) and a second language to maintain —
but de-risked into mechanical work by the pure engine and the portable test suite.
Buys true-native animation and feel.

---

## How to choose

- **Default to Path 1.** Cheapest way into the stores; validates demand and store
  logistics with the code you already have.
- **Escalate to Path 2** only if tester feedback says the iOS webview feel or
  animation quality is the actual blocker.
- Either way the Phase A investment carries: the engine and tests are reused by
  Path 1 outright and ported (not rewritten) by Path 2.

## Current state: ready vs. needs work

**Already Phase-B-ready**

- Static prerendered output (no SSR to unwind) — Capacitor-shaped already.
- `manifest.webmanifest` + icons (192/512/apple-touch/svg) + `theme-color`.
- Domain purity: `domain/`+`ai/` have zero UI imports (the Path 2 enabler).
- Single persistence chokepoint (`lib/ui/persistence.ts`).
- Trump schemes as JSON data.
- Tap targets ≥48px, OS font-scaling respected (SPEC §7).

**Needs attention for native**

- Build with `base: ''` for the native target (vs. the GitHub Pages subpath).
- Swap persistence to durable native storage (Preferences / shared_preferences).
- Safe-area / notch CSS on the fixed chrome.
- Decide the service worker's fate inside a Capacitor shell.
