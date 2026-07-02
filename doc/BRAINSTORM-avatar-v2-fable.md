# Brainstorm v2: player avatars — findings cross-checked

A verification pass over `doc/BRAINSTORM-avatar.md` (the v1 note), checking its
claims against the codebase and `doc/SPEC.md`. Method: read `ASSETS.md`, the
service worker, `persistence.ts` (seat names), the auction page's seat layout,
and SPEC §3/§7/§8/§9/§10.

Verdict up front: v1's constraints and recommendation are sound, but it missed
that **SPEC §8 already has an Avatars section** naming DiceBear and setting the
design tone — and its "everything is project-original" premise is contradicted
by `ASSETS.md` itself. The good news: reconciling v1 with SPEC §8 produces a
single approach that satisfies both, and the layout facts sharpen the plan.

---

## 1. Confirmed (brief)

- **The three "hard rules" are real.** Provenance: `ASSETS.md` exists per SPEC
  §9 and logs every asset with origin + license. Privacy: no network calls is
  enforced to the point that the fonts are self-hosted specifically "so the app
  makes no network calls"; a hosted avatar API is indeed disqualified. Bundled
  assets work offline for free — the service worker precaches both the built
  bundle and everything in `static/`, so committed SVGs need no SW changes.
- **"Seniors" is not just a nice idea — it's the stated audience.** SPEC §7
  opens with "Target users include seniors." v1's theme choice aligns with the
  spec, not merely with taste.
- **The cards-are-programmatic-SVG claim is right** (`PlayingCard.svelte`,
  logged as original in `ASSETS.md`), so "roll your own to match" is coherent.
- **Deterministic per-seat avatars fit the data model.** Seats are fixed
  (0 human, 2 partner, 1/3 opponents) and named in `persistence.ts`.
- **The steer away from AI-generated / photographic faces** is consistent with
  the project's provenance posture; nothing in the repo contradicts it.
- The external license claims (Open Peeps CC0, DiceBear per-style variance)
  cannot be verified from the repo; v1's own "verify before committing"
  follow-up stands.

## 2. Disagreements

### 2.1 SPEC §8 already has an Avatars section — v1 surveys as if greenfield

SPEC §8 ("Assets") contains:

> **Avatars** — DiceBear (MIT-licensed, procedural) — generates unique avatars
> from a seed string. No image files to ship. Keep avatars small and
> unobtrusive. The game is in the cards, not the faces.

CLAUDE.md calls SPEC the authoritative plan — "read it before making design
decisions" — yet v1 never cites §8, ranks DiceBear third, and proposes Open
Peeps as the default pick without noting it is overriding a named SPEC choice.
Two consequences:

- The **design guidance is already decided**: small, unobtrusive, subordinate
  to the cards. v1's closing "avatars should stay decorative" independently
  re-derives this; it should cite §8 as the authority.
- **Departing from DiceBear needs to be an explicit SPEC-level call**, the way
  the card deck departure was handled: `ASSETS.md` has a "Note on the card
  deck" section documenting why the SPEC's named choice (a public-domain deck)
  was set aside for programmatic cards. An avatar decision should leave the
  same kind of note.

That said, v1's *reasoning* improves on §8 in two places, which is exactly what
a brainstorm should surface (see §3.1 for the reconciliation):

- §8's "MIT-licensed" is only true of the DiceBear core; v1's per-style caveat
  (some styles are CC BY 4.0) is the more precise statement.
- §8's "no image files to ship" implies runtime generation via the JS library —
  which fails v1's own portability criterion (a JS-only generator doesn't move
  to Dart) and adds a runtime dependency for what is ultimately 4 fixed faces.

### 2.2 "Today everything is project-original" is contradicted by ASSETS.md

`ASSETS.md` states the two bundled font families (Lato, Lora) are third-party
under the SIL Open Font License, self-hosted. So the repo is *not* all
project-original (CLAUDE.md makes the same overstatement, for what it's worth).
This actually *helps* v1's option 1: there is established precedent for
logging a third-party, Apache-compatible asset in `ASSETS.md` — curated CC0
avatar SVGs would follow the fonts' existing pattern, not break new ground.

## 3. Clarifications

### 3.1 The reconciliation: DiceBear as a one-time tool, Open Peeps as the output

v1 presents Open Peeps (option 1) and DiceBear (row 3) as competing choices.
They aren't: DiceBear's `open-peeps` style *is* Open Peeps (CC0). Running the
DiceBear npm package **offline, once, at development time** — never at runtime,
never via `api.dicebear.com` — to generate a curated set of senior-looking
peeps, then committing those N static SVGs and logging them in `ASSETS.md`,
satisfies every constraint simultaneously:

- SPEC §8's named tool (DiceBear, seed-deterministic) — honored;
- v1's default pick (curated CC0 Open Peeps SVGs) — that's the output;
- privacy (nothing fetched at runtime), provenance (CC0, logged), and
  portability (plain SVG assets move to Capacitor unchanged and to Flutter as
  bundled assets — no generator library in the shipped app).

This turns v1's "either option 1 or DiceBear" into "option 1, *produced by*
DiceBear," and removes the only real conflict with the SPEC.

### 3.2 The layout has no human seat panel — "1 human + 3 AI" needs a decision

The auction page renders seat panels only for seats `[2, 1, 3]` (partner and
the two opponents); the human's south area is the hand itself, with no seat
card. So there is currently **no home for a human avatar**. Either ship 3 AI
avatars only (simplest, and arguably right — the human knows who they are), or
find the human's a spot (e.g. beside the "Your hand" heading). Relatedly, the
wide layout reserves fixed seat geometry (`min-height: 9.5rem`) under the
TODO-015 anti-jump discipline — adding an avatar to the seat panel means
deliberately re-sizing that reservation, not letting it grow.

### 3.3 Seed by seat index, not by name

Default names are `['You', 'Stewart', 'Margaret', 'Bernadette']` — already
senior-Maritime-flavored, a nice confirmation of v1's theme. Names are
persisted and validated but there is **no name-editing UI today**; if one ever
arrives, an avatar seeded from the *name* would change faces on rename. Seed
from the stable seat index (or ship fixed per-seat assets, which moots the
question — another point for curated files over runtime generation).

### 3.4 Decorative means `alt=""`, not "give each an alt"

v1 says "give each an `alt`". Since the visible seat name + role label sit
directly beside the avatar, a descriptive alt would be read *in addition to*
the name — noise for screen-reader users. The house pattern already exists: the
face-down seat cards are `aria-hidden="true"`. Truly decorative avatars should
follow it (`alt=""` / `aria-hidden`), which also honors §8's "the game is in
the cards, not the faces."

### 3.5 Scope notes

- The **1v1 game (`/play`) has one AI opponent** and could reuse whatever is
  picked; v1 scopes to Auction only. Worth one line in any TODO so the asset
  set is chosen with 5 faces in mind, not 4.
- The Flutter-portability rule v1 cites is softer than "hard rule": per SPEC
  §3/§4 (and `doc/BRAINSTORM-PHASE-B-flutter-v2.md`), Flutter is the contingent
  Path 2; the default Phase B (Capacitor) reuses these assets outright. Static
  SVGs satisfy both paths, so the conclusion is unchanged — but the citation
  belongs to §3/§4, not §10.

---

## 4. Bottom line

Adopt v1's recommendation in its reconciled form: use the DiceBear npm package
offline as a one-time generator (CC0 `open-peeps` style), curate ~4–6
senior-looking faces (5+ if `/play` joins), commit them as static SVGs, log
them in `ASSETS.md` following the fonts' third-party precedent, and add a
"Note on avatars" there recording how this honors SPEC §8. Ship 3 AI-seat
avatars first (the human has no seat panel), keep them `aria-hidden` beside
the name/role labels, and respect the TODO-015 reserved seat geometry when
sizing.
