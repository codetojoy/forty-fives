# Brainstorm v2: SPEC's Phase B path options — findings cross-checked

A verification pass over `doc/SPEC.md`'s Phase B "path" material (§3 strategy,
§4 Phase B tech stack, §9 publishing/legal, §10 the domain-purity bet),
cross-checked against the repo as actually built, `doc/DEPLOY.md`,
`doc/ARCH-PhaseB.md`, the two Phase-B/avatar v2 notes, and — because two §9
claims are about external store policy — one targeted check of current Google
Play policy (July 2026). SPEC's Phase-B text dates from the project's start
(2026-06-10).

Verdict up front: the two-path structure (Capacitor default, Flutter
escalation) is sound and both paths' premises verify against the code. But §9's
"Google is fast (hours)" is materially wrong for this project's first-time
publisher, §4's Path 2 trigger is framed too narrowly, several §4/§9 Phase A
facts have drifted from reality, and one genuinely useful third path (Android
TWA) is missing.

---

## 1. Confirmed (brief)

- **Path 1's premise holds in the code.** The build is fully static
  (adapter-static, every route prerendered, no SSR), persistence has a single
  chokepoint (`lib/ui/persistence.ts`), and the service worker precaches the
  bundle — exactly the shape a Capacitor shell wants. `ARCH-PhaseB.md`
  documents the concrete steps and gotchas.
- **Path 2's premise holds in the code.** Domain purity is verified fact
  (every `domain/`+`ai/` import is relative; see
  `BRAINSTORM-PHASE-B-flutter-v2.md`), so "the engine ports, only the UI is
  rebuilt" is real.
- **"Decision deferred until Phase A feedback is in"** is respected everywhere
  downstream — no premature native work exists in the repo.
- **Store fees are accurate**: Google Play $25 one-time; Apple $99 USD/year
  recurring.
- **The GPL warning is sound.** GPL's incompatibility with App Store terms is
  the long-standing position (the VLC precedent); Apache 2.0 — the actual
  project license — is compatible.
- **The PWA's instant-update advantage (§3) is real and its loss under Path 1
  is already acknowledged** in `ARCH-PhaseB.md` ("shipping an asset change now
  means a store review").

## 2. Disagreements

### 2.1 "Review: Google is fast (hours)" is wrong for this developer — and it changes Phase A/B sequencing

§9's claim describes established accounts. **Personal Play developer accounts
created after 2023-11-13 must first run a closed test with at least 12 testers
opted in for 14 consecutive days**, then *apply* for production access
(requirement reduced from 20 testers in December 2024; organization accounts
are exempt). SPEC §2 says "first-time app publisher," so this applies in full:
the first Play release is gated by weeks of mandatory testing logistics, not
hours of review.

The silver lining is a near-perfect fit the SPEC doesn't notice: §3's
validation plan is "~10–20 Maritime testers" — almost exactly Google's
required cohort. **Run the Phase A tester group *through Play closed testing*
(Path 1 or TWA build) rather than only via the PWA URL**, and the mandatory
14-day gate doubles as the product validation the SPEC already wanted.
Otherwise the project validates via PWA, then must recruit ~12 testers a
second time just to unlock production. This is the strongest argument found
anywhere in this review for starting Path 1 packaging *during* late Phase A
rather than strictly after it.

### 2.2 Path 2's trigger ("iOS experience too rough") conflates problems the wrap already fixes

§4 frames the fork as: iOS PWA too rough → Flutter for "true native feel and
better animation." But for *this* app — offline, no push, no sound, everything
persisted to `localStorage` — the iOS PWA roughness testers will actually hit
first is:

- **Install friction**: Safari's Share → "Add to Home Screen" flow, with no
  install prompt — a real barrier for the senior target audience (§7).
- **Storage durability**: the app's entire state (games, stats, settings)
  lives in `localStorage`, which Safari's intelligent tracking prevention can
  evict after ~7 days of non-use for non-installed usage. A lapsed tester
  losing their 45s stats is a bug report waiting to happen.

Both are distribution/storage problems that **Path 1 fixes cheaply** (a real
store install; Capacitor Preferences — the exact migration `ARCH-PhaseB.md`
already prescribes). Neither justifies a Flutter rewrite. The trigger should be
sharpened: *escalate to Path 2 only if the blocker survives the Capacitor
wrap* — i.e. it is genuinely webview feel/animation, not installability or
storage. As written, "iOS experience too rough" invites over-escalating to the
expensive path on evidence the cheap path would have cured.

### 2.3 Stale Phase A facts in §4/§9 that leak into Phase B logistics

- **Hosting**: §4 says Cloudflare Pages or Netlify; reality is GitHub Pages
  (`DEPLOY.md`, `BASE_PATH` in `vite.config.ts`). Not cosmetic for Phase B:
  subpath hosting is why a native build must be produced with `base: ''` — the
  gotcha `ARCH-PhaseB.md` flags.
- **PWA tooling**: §4 says "Vite PWA plugin"; reality is SvelteKit's built-in
  service worker (`src/service-worker.ts`), hand-registered prod-only. Any
  Phase B decision about "the service worker's fate" concerns that file, not a
  plugin config.
- **License**: §9 leads with "MIT license" while §2's constraint table says
  Apache 2 and the actual `LICENSE` is Apache 2.0 — SPEC is internally
  inconsistent and §9's lead is the stale half. (§10's repo-tree comment
  "LICENSE # MIT" has the same drift.)
- **The Mac barrier is gone.** §3's rationale defers Phase B partly to avoid
  "buying a Mac," and §9 budgets a Mac Mini or cloud Mac — but development now
  happens on macOS (this repo's toolchain runs on Darwin). The remaining real
  Phase B costs are Apple's $99/yr and Play's $25; the Mac line item can be
  struck, which weakens the cost case for deferral and slightly cheapens
  Path 1.

## 3. Clarifications

### 3.1 A missing third option: Android-only TWA ("Path 0")

Google Play accepts PWAs packaged as **Trusted Web Activities** (the
PWABuilder route): a tiny signed shell that loads the *hosted* site, verified
via digital asset links over HTTPS. For this app it needs no Capacitor, no code
changes beyond asset-links, keeps the PWA's instant-update property even for
the store build (content isn't in the review loop), and works offline via the
existing service worker after first load. Limits: Android only (no iOS
equivalent, so Apple still needs Path 1 or 2), and storage remains web storage.
As a cheap way to get the Play listing and satisfy the §2.1 closed-testing
gate early, it belongs in the option table even if Capacitor supersedes it.

### 3.2 "Apple is more opinionated" has a concrete name: Guideline 4.2

The Path 1 risk §9 gestures at is App Review Guideline 4.2 ("minimum
functionality") — thin webview wrappers get rejected. Mitigation is mostly
already in hand: this is a complete offline game, not a repackaged website,
and Capacitor games routinely pass; the polish items `ARCH-PhaseB.md` lists
(splash, status bar, safe areas, durable storage) are exactly what reads as
"real app" to review. Worth naming so a rejection isn't a surprise.

### 3.3 "Single codebase" (§2) is only fully true under Path 1

§2's constraint is "iOS + Android, single codebase." Path 1 satisfies it with
*one codebase total* (web + both stores). Path 2 satisfies the letter (one
Flutter codebase covers iOS + Android) but leaves the project with **two
codebases if the web PWA lives on** — the SPEC never says what happens to the
PWA after a Flutter rewrite. Retire it, freeze it, or ship Flutter Web: any
Path 2 decision should answer that explicitly, since "free, shareable via
URL/QR" (§3) is itself a product feature for the target audience.

---

## 4. Bottom line

The two-path strategy survives cross-checking, and the code is genuinely ready
for either path. Corrections to carry forward: (1) plan for Google's 12-tester
/ 14-day closed-testing gate and fold it into the Phase A tester cohort rather
than treating Play review as "hours"; (2) sharpen Path 2's trigger to "the
blocker survives the Capacitor wrap," since the likely iOS complaints
(install friction, storage eviction) are wrap-fixable; (3) fix SPEC's drifted
facts (GitHub Pages hosting, built-in service worker, Apache 2.0 in §9, Mac
already in hand); (4) consider the Android TWA route as a cheap early Play
presence; (5) any Path 2 call must also decide the PWA's fate to preserve the
spirit of §2's single-codebase constraint.

Sources for the Play closed-testing requirement:
[Play Console Help — app testing requirements for new personal developer
accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en);
[Play Developer Community — everything about the 12 testers
requirement](https://support.google.com/googleplay/android-developer/community-guide/255621488/everything-about-the-12-testers-requirement?hl=en).
