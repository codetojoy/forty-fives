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

## Note on the card deck

SPEC §8 names a public-domain SVG deck (Byron Knoll's, or a CC0 deck from Wikimedia
Commons / Kenney.nl) as the first choice for card faces. For Milestone 0 the trainer only
ever shows two static cards, so the cards are drawn programmatically instead: a single
small component, sharper text scaling, and bigger rank/suit glyphs than traditional decks
provide. When full-hand play arrives (Milestone 1), revisit vendoring a public-domain deck
— and record its provenance in this file.
