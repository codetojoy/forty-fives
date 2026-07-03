# Brainstorm: animation in a web/Capacitor solution (vs. Flutter)

*Written by Claude (Fable 5), 2026-07-03, in answer to: "For animation on iOS, the
docs consider Flutter, but is it possible to have animation in a web/Capacitor
solution as well, say by using Three.js (or similar)?"*

## Short answer

Yes — animation is very much possible in a web/Capacitor build, and for this game's
needs the web stack is honestly not the bottleneck. The docs already frame it that
way: `doc/ARCH-PhaseB.md` positions Flutter as the *fallback* "only if iOS
feel/animation is the blocker," not as the presumed winner.

## What a Capacitor build can do

Capacitor renders in WKWebView, which composites CSS `transform`/`opacity`
animations on the GPU (Metal-backed). Card-game animation — dealing cards fanning
out, a card sliding to the trick area, a flip revealing the turn-up, the winner
sweeping the trick, a score counter ticking — is all 2D
translation/rotation/scale/fade, which runs at a solid 60fps this way. Even a "3D"
card flip is one CSS `perspective` + `rotateY` on a DOM element.

And since the UI is already Svelte, most of this comes nearly free with Svelte's
built-ins:

- `transition:fly` / `transition:fade` for cards entering and leaving,
- `animate:flip` for reflowing a hand after a card is played,
- `crossfade` to make a card visually *travel* from the hand to the trick area.

Zero new dependencies, and it degrades cleanly under `prefers-reduced-motion` — an
SPEC §7 accessibility obligation either way.

## Where Three.js fits — and why to avoid it here

WebGL works fine in WKWebView, so Three.js is *possible*. But it is a 3D
scene-graph engine, and using it means rendering cards into a `<canvas>`, which has
real costs for this project specifically:

- **Accessibility regression.** The cards are currently DOM buttons with ARIA
  labels, big tap targets, and OS font scaling. Inside a canvas all of that has to
  be rebuilt by hand — it works against the SPEC §7 hard requirement.
- **Weight and battery.** ~150KB+ gzipped plus a continuous render loop, versus
  compositor-driven CSS animations that cost nothing between frames.
- **No payoff.** Nothing in the game calls for lighting, meshes, or camera work.
  Three.js earns its keep for genuinely 3D scenes, not sliding rectangles.

If Svelte's built-ins ever feel limiting, the sensible middle step is a DOM-based
animation library (Motion One or GSAP — small, drives the same GPU-composited
transforms, keeps the accessible DOM), not a canvas engine. PixiJS (2D WebGL) sits
in the same bucket as Three.js: powerful, but the same canvas trade-offs.

## The honest caveat

Flutter's animation advantage is real at the margins: it drives ProMotion at 120Hz,
while `requestAnimationFrame` in WKWebView has historically been capped at 60Hz,
and web scroll/gesture physics never feel *perfectly* native. But that is a "polish
ceiling," not a "can/can't" — for deal/flip/sweep animations, users won't
distinguish the two.

## Bottom line

If animation were the deciding factor for Phase B, it alone doesn't force Flutter —
Path 1 (Capacitor) with Svelte transitions would carry the game's animation needs,
and the Flutter question can stay what the docs say it is: a fallback if overall
iOS *feel* proves rough in real-device testing.
