# Brainstorm: player avatars for the Auction game

Idea: give the Auction players (1 human + 3 AI) avatars to add a human feel —
preferably seniors with diverse backgrounds. No code change yet; this is a survey
of options. The choice bumps up against three of the project's hard rules:

- **Provenance**: any new visual asset must be CC0/MIT/Apache-compatible and
  logged in `ASSETS.md`. Today everything is project-original (the programmatically
  drawn SVG cards).
- **Privacy-first / offline PWA**: no network calls beyond loading the site — so
  avatars must be *bundled*, never fetched from a hosted avatar API at runtime.
- **Flutter port (SPEC §10)**: whatever we pick has to survive a TS→Dart move
  later. Plain SVG/PNG assets or pure-data parameterized drawing port cleanly; a
  JS-only generator library does not.

## Ready-made libraries (illustrated, not photos)

| Option | License | Fit | Notes |
|---|---|---|---|
| **Open Peeps** (Pablo Stanley) | **CC0** | Strong | Hand-drawn, mix-and-match people; can depict older faces, glasses, varied features/skin tones. CC0 = no attribution, fully Apache-compatible. The cleanest off-the-shelf fit. |
| **Avataaars** (Pablo Stanley) | Free commercial / lib MIT | Good | Customizable cartoon avatars, gray hair + glasses + diverse skin tones. Skews younger but you can bias toward "senior." |
| **DiceBear** (offline) | Core MIT; **per-style varies** | Good | Generates SVG locally from a seed — deterministic, great for 3 fixed AI opponents. **Critical:** use the npm packages, *not* `api.dicebear.com` (that's a network call = privacy violation). Pick a **CC0 style** (e.g. `open-peeps`, `personas`, `notionists`) to keep `ASSETS.md` simple; some styles are CC BY 4.0 and need attribution. |
| Boring Avatars / Multiavatar | MIT / check | Weak | Abstract or generic — neither does "seniors" well; Multiavatar's license needs verifying. |

## Roll your own (most on-brand)

Given the cards are already programmatically-drawn original SVGs, parameterized
senior portraits in the same style is the most consistent option: a function
taking skin tone / hair color+style / glasses / accessory, deterministic from a
seed. Pros: zero licensing, full control over age + diversity, tiny, themeable,
accessible, ports to Dart as data. Con: it's real illustration work.

## What to steer away from

- **AI-generated / real photo faces** (StyleGAN "thispersondoesnotexist",
  stock-photo seniors): provenance and copyright on image-model output is
  unsettled, and identifiable real faces raise model-release/privacy issues — a
  poor fit for a project that prides itself on clean provenance.

## Recommendation

For 1 human + 3 AI we only need a handful of distinct faces, not infinite
generation. So either:

1. **Hand-pick ~4–6 Open Peeps (CC0) SVGs**, commit them as static assets, log in
   `ASSETS.md`. Lowest effort, clean license, ports trivially. ✅ default pick.
2. Or **draw our own** parameterized SVGs to match the card art — more work,
   maximally on-brand.

Worth deciding regardless: avatars should stay **decorative** — keep the name +
role label ("Partner"/"Opponent") as the real identifier, give each an `alt`, and
respect contrast/font-scaling.

## Open follow-ups

- Verify the exact current license strings (Open Peeps / DiceBear styles) before
  anything is committed — library licenses drift.
- Decide between option 1 (curated Open Peeps set) and option 2 (own SVGs).
