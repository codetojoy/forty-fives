# Asset provenance

Per SPEC §9, every visual asset in this repository is listed here with its origin and
license. The only third-party assets are the two bundled font families (SIL OFL,
Apache-compatible); everything else is original to this project.

| Asset | Origin | License |
|---|---|---|
| `static/fonts/lato-400.woff2`, `lato-400-italic.woff2`, `lato-700.woff2` | [Lato](https://fonts.google.com/specimen/Lato) by Łukasz Dziedzic; latin-subset woff2 files obtained via Google Fonts, self-hosted so the app makes no network calls (SPEC §3) | SIL Open Font License 1.1 |
| `static/fonts/lora-600.woff2`, `lora-400-italic.woff2` | [Lora](https://fonts.google.com/specimen/Lora) by Cyreal; latin-subset woff2 files obtained via Google Fonts, self-hosted | SIL Open Font License 1.1 |
| `src/lib/ui/PlayingCard.svelte` (card faces) | Original — cards are drawn as inline SVG (rank + suit glyphs), designed for large, high-contrast accessibility (SPEC §7) | Apache 2.0 (project license) |
| `src/lib/ui/PlayingCard.svelte` (card back) | Original — rust lattice with a "45" roundel, drawn as inline SVG in the same component | Apache 2.0 (project license) |
| `src/lib/assets/favicon.svg`, `static/icon.svg` | Original "45" app icon, hand-written SVG | Apache 2.0 (project license) |
| `static/icon-192.png`, `static/icon-512.png`, `static/apple-touch-icon.png` | Rendered from `static/icon.svg` | Apache 2.0 (project license) |
| `src/lib/assets/trump-schemes/standard.json` | Card-ranking *rules* transcribed from the [Forty-fives Wikipedia article](https://en.wikipedia.org/wiki/Forty-fives); game rules are facts and not copyrightable, and the JSON encoding is original | Apache 2.0 (project license) |
| `src/lib/assets/avatars/peep-*.svg` (6 files) | [Open Peeps](https://www.openpeeps.com/) by Pablo Stanley, rendered offline via the [DiceBear](https://www.dicebear.com/styles/open-peeps/) `open-peeps` style (see "Note on avatars" below); each SVG embeds the license statement in its `<metadata>` | CC0 1.0 (public domain) |

## Note on avatars

SPEC §8 names DiceBear (procedural, seed-deterministic) for avatars, with the guidance
"keep avatars small and unobtrusive — the game is in the cards, not the faces." That is
honored here with one deliberate twist (TODO-038, `doc/BRAINSTORM-avatar-v2-fable.md`):
DiceBear was run **offline, once, at development time** — never at runtime, never via
`api.dicebear.com` — and the resulting static SVGs are committed. The shipped app carries
no generator library and makes no network calls (privacy, SPEC §3), and plain SVG assets
survive either Phase B path (Capacitor reuse or a Flutter port) unchanged.

Generation record, for exact reproducibility: `@dicebear/core` **9.4.2** +
`@dicebear/collection` **9.4.2** (`open-peeps` style — a CC0 remix of Open Peeps by
Pablo Stanley), Node 26, with every option pinned (`accessoriesProbability: 100`,
`facialHairProbability` 100 when a beard is listed else 0, `maskProbability: 0`):

| File | seed | face | head | facialHair | accessories | skinColor | clothingColor | headContrastColor |
|---|---|---|---|---|---|---|---|---|
| `peep-01.svg` | `peep-01` | `old` | `grayBun` | — | `glasses` | `ffdbb4` | `9ddadb` | `e8e8e8` |
| `peep-02.svg` | `peep-02` | `smile` | `grayShort` | `moustache9` | `glasses2` | `edb98a` | `8fa7df` | `e8e8e8` |
| `peep-04.svg` | `peep-04` | `smileTeethGap` | `noHair1` | `full4` | `glasses` | `edb98a` | `e78276` | `e8e8e8` |
| `peep-05.svg` | `peep-05` | `old` | `noHair2` | — | `glasses5` | `694d3d` | `78e185` | `c8c8c8` |
| `peep-06.svg` | `peep-06` | `calm` | `mediumBangs2` | — | `glasses4` | `d08b5b` | `e279c7` | `c8c8c8` |
| `peep-16.svg` | `peep-16` | `smile` | `grayMedium` | — | `glasses5` | `ae5d29` | `78e185` | `e8e8e8` |

The file numbering preserves the candidate-sheet numbers from the TODO-038 curation pass
(16 generated, 6 kept). Three are wired to the Auction AI seats (Stewart `peep-02`,
Margaret `peep-01`, Bernadette `peep-16`, fixed by seat index); `peep-04/05/06` are
reserves for the `/play` opponent or a future human spot. Avatars are decorative:
`alt=""` + `aria-hidden`, with the visible seat name and role as the real identifiers.

## Note on the card deck

SPEC §8 names a public-domain SVG deck (Byron Knoll's, or a CC0 deck from Wikimedia
Commons / Kenney.nl) as the first choice for card faces. For Milestone 0 the trainer only
ever shows two static cards, so the cards are drawn programmatically instead: a single
small component, sharper text scaling, and bigger rank/suit glyphs than traditional decks
provide. When full-hand play arrives (Milestone 1), revisit vendoring a public-domain deck
— and record its provenance in this file.
