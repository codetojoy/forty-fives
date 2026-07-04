# Brainstorm: sound effects consistent with the Phase B plan

*Written by Claude (Fable 5), 2026-07-04, in answer to: "What are some options for
sound effects that are consistent with plan for Phase B?"*

## Framing

Sound is explicitly anticipated by the docs — SPEC §7 says "no sound by default,
with optional audio toggle" and SPEC §8 defers it with the shape already decided:
"short, gentle audio cues (card-play, trick-won). No music." So the question is
really about sourcing and plumbing that stay consistent with the Phase B fork
(`doc/ARCH-PhaseB.md`: Path 1 Capacitor wrap vs. Path 2 Flutter rewrite).

## Where the sounds come from

1. **Kenney.nl CC0 packs (pragmatic favorite).** Kenney is already named in SPEC §8
   as a trusted CC0 source for card art, and their audio packs (there's a
   casino-themed one with card slides, flips, and chip sounds) are CC0 like
   everything else they publish. Pick 3–5 short samples, log them in `ASSETS.md`
   with provenance, done. Being plain audio *files*, they port to Flutter untouched
   if Path 2 ever happens.

2. **Generate your own samples offline (most on-brand).** The project's ethos is
   project-original assets — the cards are programmatically drawn SVGs. The audio
   equivalent: a small script (Web Audio offline render, or sox/ffmpeg) synthesizes
   a card-swish (filtered noise burst), a soft tap, and a gentle two-note chime,
   and the resulting WAV/M4A files are committed as assets. Zero third-party
   provenance, and again the files port to either Phase B path. Slightly more
   effort to make them feel "gentle" rather than arcade-y.

3. **Freesound.org, filtered to CC0.** Bigger selection, real recorded card
   sounds, but the licenses must be filtered carefully (much of it is CC-BY or NC,
   which fails the Apache-compatible bar) and exact provenance recorded per file in
   `ASSETS.md`.

4. **Live Web Audio synthesis (no files at all).** Tempting for the web build —
   nothing to ship or license — but ruled out for Phase B consistency: synthesis
   code is JavaScript, so a Flutter rewrite would have to re-implement the sounds
   in Dart rather than just playing the same assets. Files are the portable
   contract; code isn't.

## How they play, per Phase B path

- **Phase A / Path 1 (Capacitor):** use the **Web Audio API** (decode files into
  buffers once, fire `BufferSource`s on events) rather than `<audio>` elements —
  `HTMLAudioElement` has noticeable latency on iOS. WKWebView requires the
  `AudioContext` be unlocked by a user gesture, which is free here since every cue
  follows a tap. If latency still bothers on-device,
  `@capacitor-community/native-audio` is the escalation, mirroring the doc's
  "escalate only if it's the blocker" stance.
- **Path 2 (Flutter):** the same asset files via a standard audio package
  (`audioplayers` or similar). This is why file format matters: **short WAV or
  M4A/AAC** work everywhere; avoid OGG (Safari/WKWebView won't decode it).

## Plumbing that keeps the Phase B bet intact

Mirror the `persistence.ts` pattern: one UI-layer module, say
`src/lib/ui/sound.ts`, as the single chokepoint — it owns the toggle (persisted
with the other settings, **off by default** per SPEC §7), the buffer cache, and a
handful of named cues (`cardPlayed`, `trickWon`, maybe `bidPlaced`, `gameWon`).
Pages call `sound.cardPlayed()`; **the domain never knows sound exists**, so domain
purity and the Flutter-port viability (SPEC §10) are untouched. And per the
accessibility posture (SPEC §7), sound is always redundant reinforcement — never
the only signal for anything.

## Bottom line

Option 2 if everything should stay project-original, option 1 to have it done in
an afternoon — both end as small committed audio files logged in `ASSETS.md`,
played through a single `sound.ts` chokepoint, off by default. That satisfies
SPEC §7/§8 and works identically under both Phase B paths.
