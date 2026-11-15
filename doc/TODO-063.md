
### TODO-063 [COMPLETE: items 1, 3, 4, 5, 7]

Improve SEO for Google using `<meta>` tags (and the small amount of adjacent
head/static-file work that makes the meta tags actually useful).

This doc is a **suggestion list**, not yet an agreed spec. Nothing is implemented.
Pick the items worth doing; the rest can be dropped.

* bump version to 0.2.63 (if/when implemented)

---

## Where we are today

Good news first — the site already has the parts that matter most, and they are
easy to under-rate:

* Every route is **prerendered** (adapter-static, `+layout.ts` → `prerender = true`),
  so Google sees real HTML with real text. This is the single biggest SEO factor
  and it is already correct.
* Every route already has a unique `<title>` and `<meta name="description">` in a
  `<svelte:head>` block.
* `static/robots.txt` allows crawling; `app.html` has `charset`, `viewport`, and
  `theme-color`; the site has a real domain (`static/CNAME` → **45s.ca**).

What is missing is everything that tells Google (and link previews) *which URL
this is* and *what kind of thing it is*.

---

## Suggestions, highest value first

### 1. Canonical URLs (`<link rel="canonical">`) — **do this one**

Nothing on the site currently declares its own address. `45s.ca/faq`,
`45s.ca/faq.html`, `www.45s.ca/faq`, and the GitHub Pages `github.io` URL (if the
gh-pages build is ever public) are four addresses for one page, and Google may
split or mis-pick among them. adapter-static emits flat files (`build/faq.html`)
which GitHub Pages also serves at `/faq`, so the duplicate is real, not theoretical.

Add a canonical tag pointing at the one true form:

```html
<link rel="canonical" href="https://45s.ca/faq" />
```

This needs an **absolute origin**, which the app does not have anywhere today
(`$app/paths`'s `base` is a path, not a URL). Suggested: bake it in the same way
the version/build stamp already is, via a `define` in `vite.config.ts`
(`__SITE_URL__`, default `https://45s.ca`, overridable by env for the gh-pages
subpath build).

Caveat worth deciding once: pick `/faq` or `/faq/` and use it everywhere —
canonical, sitemap, and internal links must agree.

### 2. Open Graph + Twitter Card tags

Not a Google *ranking* factor, but this is what makes a link posted to Facebook,
iMessage, Slack, or a PEI community group render as a card with a title, blurb,
and picture instead of a bare blue URL. For an app that spreads by word of mouth
in the Maritimes, this is probably the highest *practical* return on the list.

```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Forty-Fives" />
<meta property="og:locale" content="en_CA" />
<meta property="og:title" content="Auction Forty-Fives" />
<meta property="og:description" content="…same text as the meta description…" />
<meta property="og:url" content="https://45s.ca/auction" />
<meta property="og:image" content="https://45s.ca/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Forty-Fives — the five of trumps, the jack, and the ace of hearts." />
<meta name="twitter:card" content="summary_large_image" />
```

Requires a **1200×630 PNG share image** in `static/`. It must be project-original
(or CC0/MIT/Apache) and recorded in `ASSETS.md` with provenance, per the licensing
constraint. The existing programmatically drawn SVG cards are the obvious source —
the 5/J/A♥ trump ladder is the app's whole identity.

Note `og:image` **must be an absolute URL** — relative paths are ignored by most
scrapers. Same `__SITE_URL__` constant as above.

### 3. Do this as one `<Seo />` component, not 13 copy-pasted head blocks

Thirteen routes each hand-rolling ten tags will drift within a month. Suggested
shape — a `src/lib/ui/Seo.svelte` (UI layer; nothing here goes near `src/lib/domain/`):

```svelte
<Seo
  title="Auction Forty-Fives"
  description="Play Auction Forty-Fives for four: bid, name trump, take the kitty, and play in partnership to 120."
  image="og-auction.png"   <!-- optional; falls back to the site default -->
/>
```

…which renders title + description + canonical + OG + Twitter from one call, deriving
the URL from `page.url.pathname` and `__SITE_URL__`.

**Hard constraint:** this must render during **prerender**, so it cannot read
`window.location` or sit behind a `browser` guard — the tags have to end up in the
static HTML, not be added by JS after hydration. (Google does execute JS, but
Facebook/iMessage/Slack scrapers do not.)

### 4. `sitemap.xml` + a `Sitemap:` line in `robots.txt`

Thirteen prerendered pages, all reachable by link, so Google will find them anyway —
this is a nice-to-have, not a fix. Cheapest version is a hand-written
`static/sitemap.xml` listing the ~8 pages worth indexing (see item 5). It will need
a note in `CLAUDE.md` saying "new route → add it to the sitemap," or it silently
rots. A build-time generator is the alternative if that upkeep sounds annoying.

Then:

```
# static/robots.txt
Sitemap: https://45s.ca/sitemap.xml
```

### 5. `noindex` the pages that shouldn't be in search results

Some routes are UI chrome, not content. A stranger arriving from Google at
`/auction/stats` sees an empty stats table (state is per-device `localStorage`), which
is a bad first impression and a thin-content signal.

Suggested `<meta name="robots" content="noindex, follow" />` on:

* `/play/config`, `/auction/config` — settings screens
* `/play/stats`, `/auction/stats` — empty for any new visitor
* possibly `/feedback` and `/about` — judgement call; `/about` is a build stamp
  (version, commit, timestamp), which is thin but harmless

Keep indexed: `/`, `/trainer`, `/trainer/reference`, `/play`, `/auction`, `/faq`.

### 6. Structured data (JSON-LD) — moderate value, be realistic about it

A `<script type="application/ld+json">` block in the head. Worth doing for the two
places it actually earns something:

* **Home** — `SoftwareApplication` (or `WebApplication`): `name`, `description`,
  `applicationCategory: "GameApplication"`, `operatingSystem: "Any"`, and
  `offers: { price: "0" }`. This is how you tell Google "free app," which is the
  claim we most want to make.
* **`/faq`** — `FAQPage`, mirroring the existing `<dl>` Q&A pairs.

Honest caveat on FAQPage: since 2023 Google shows FAQ rich results **only for
authoritative government and health sites**, so this will almost certainly *not*
produce the expandable Q&A in search results. It still helps Google understand
the page. Do it if it's cheap; don't expect the rich snippet.

### 7. Title & description hygiene

Small, free, and probably the second-best ranking lever after canonical:

* **The home `<title>` is just `Forty-Fives`** — that's the weakest title on the
  site and it's on the most important page. It should carry the phrase people
  actually type. Something like:
  `Forty-Fives — the Maritime Canadian card game (free, plays offline)`.
* Unify the pattern. Today we have `Forty-Fives`, `Auction Forty-Fives`,
  `Forty-Fives Ranking Trainer`, and `About — Forty-Fives` — three different shapes.
  Suggest `<Page> — Forty-Fives` for everything except home.
* Aim descriptions at ~120–160 characters. Two are currently thin:
  `/about` ("Build information for the Forty-Fives app.") and
  `/feedback` ("Send feedback about the Forty-Fives app.").
* `/trainer/reference` is quietly the most *searchable* page on the site — it is the
  full trump ranking table, which is exactly what someone Googling
  *"forty fives card game trump order"* wants. Its title and description deserve the
  most care of any page here.

### 8. `<html lang="en">` → `lang="en-CA"`

One character-ish change in `app.html`. Marginal, but the game is regional and the
spelling is Canadian.

---

## Explicitly *not* recommended

* **`<meta name="keywords">`** — Google has ignored it since 2009. It does nothing
  but tell competitors what you're targeting. Skip it, and skip it deliberately so
  nobody adds it later "just in case."
* **Google Analytics / Tag Manager / any tracking pixel** — violates the privacy
  constraint (no accounts, no analytics, no network calls beyond loading the site).
  Not negotiable for a ranking bump.
* **`<meta name="google-site-verification">`** — *this one is a real choice, not a
  refusal.* Verifying the site in Google Search Console is genuinely useful (it shows
  what queries find you, and whether pages are indexed) and the meta-tag verification
  method adds **no** runtime network call — it's an inert string. But it does mean
  creating a Google account tied to the site, which is a call for the maintainer to
  make, not for me. (The DNS TXT-record method avoids touching the HTML at all.)

---

## Reality check

Meta tags will not, by themselves, move this site up the rankings. There is no meta
tag that outranks content. What will actually rank is the thing this app already
has and few other sites do: **a correct, readable explanation of the Forty-Fives
trump rankings**, the ones that confuse everybody (5 > J > A♥, A♦ low when diamonds
aren't trump, black number cards reversed). The reference page and the FAQ are the
SEO asset. The tags above just make sure Google can index them, attribute them to
one URL, and show them off when someone shares a link.

Suggested order if you only do part of this: **1 (canonical) → 7 (titles) → 2/3
(OG + component) → 5 (noindex) → 4 (sitemap) → 6 (JSON-LD) → 8 (lang)**.

---

## Open questions

* Canonical URL form: `https://45s.ca/faq` or `https://45s.ca/faq/`?
* Is the gh-pages/`BASE_PATH` build ever publicly reachable? If yes it needs its own
  `__SITE_URL__` (or a blanket `noindex`) so it doesn't compete with 45s.ca.
* Is `www.45s.ca` served, and does it redirect to the apex? (Affects canonical.)
* One share image for the whole site, or per-mode (trainer / play / auction)?
* Should `/about` and `/feedback` be indexed or `noindex`?
* Does the maintainer want a Google Search Console property (see above)?

---

### Implementation notes (done: items 1, 3, 5, 7)

Items 2 (Open Graph), 6 (JSON-LD), and 8 (`lang`) were not done. Item 4
(sitemap) was added in a follow-up — see the end of these notes.

Answered open questions (from `doc/BRAINSTORM-SEO.md` §0/§4, verified against
production): canonical form is `https://45s.ca/faq` (no trailing slash; `/faq/`
404s); the gh-pages URL and `www.45s.ca` both 301 to the apex, so there is no
`__SITE_URL__` env override — `SITE_URL` is a plain constant. `/about` is
`noindex` (build stamp); `/feedback` stays indexed (its "does your table play
differently?" text is real content and recruits regional players).

* **One route table instead of a `<Seo title=… />` call per page (item 3).**
  `PAGE_SEO` in `src/lib/ui/seo.ts` holds every route's title, description, and
  `noindex` flag, keyed by SvelteKit route id. `Seo.svelte` is mounted once in
  `+layout.svelte`, looks up `page.route.id`, and renders `<title>`, the
  description, the canonical link, and `robots`. All per-route
  `<svelte:head>` blocks were removed. A route with no entry throws during
  prerender; `tests/ui/seo.test.ts` checks the table against the filesystem and
  enforces the hygiene rules (title ≤60 chars, indexed descriptions 120–160,
  unique titles/descriptions, no hand-written `<title>` in route files).
* **Canonical from the route id, not `page.url.pathname` (item 1).** The first
  version stripped `base` from the pathname, but during prerender `base` is a
  *relative* path (`paths.relative` defaults to true), so a `BASE_PATH` build
  emitted `https://45s.ca/forty-fives/…`. Every route is static, so its id is
  its path; `canonicalUrl` refuses dynamic/grouped ids. Verified both a root and
  a `BASE_PATH=/forty-fives` build emit apex canonicals.
* **noindex (item 5):** `/play/config`, `/auction/config`, `/play/stats`,
  `/auction/stats`, `/about` — `noindex, follow`.
* **Titles (item 7):** pattern `<Page> — Forty-Fives`, except the home page and
  the two game pages, whose titles name the game (and its nickname) directly so
  each page owns one search intent:
  * `/` — "Forty-Fives & Auction 45s — free Maritime card games" (both games)
  * `/play` — "Play Forty-Fives (45s) — free 2-player card game"
  * `/auction` — "Auction Forty-Fives (Auction 45s) — free 4-player game"
  * `/trainer/reference` — "Card Rankings & Trump Order — Forty-Fives"

  Every indexed description was rewritten to 120–160 characters.
* **Visible copy (beyond the head tags, so the body matches the titles):** a
  home intro line naming both games ("Play Forty-Fives (45s) head-to-head or
  Auction 45s with a partner — and learn the tricky trump rankings."), and the
  nicknames in the game-page subtitles ("45s for two · …", "Auction 45s · …").
  This does not adopt `doc/BRAINSTORM-branding.md`'s "45s" wordmark — the `<h1>`
  stays "Forty-Fives".

* **Sitemap (item 4, follow-up).** Generated, not hand-written: `sitemapXml()`
  in `seo.ts` emits every indexed `PAGE_SEO` route by canonical URL (the five
  `noindex` pages are excluded — listing them would contradict their robots
  tag), and `src/routes/sitemap.xml/+server.ts` prerenders it to
  `build/sitemap.xml`. `static/robots.txt` gained the `Sitemap:` line. No
  `<lastmod>` (no honest per-page date). Because it derives from the table, a
  new route needs no sitemap upkeep. Submit `https://45s.ca/sitemap.xml` in
  Search Console → Sitemaps after deploying.

### Files

* `src/routes/sitemap.xml/+server.ts` (new, item 4), `static/robots.txt` (`Sitemap:` line)

* `src/lib/ui/seo.ts` (new: `SITE_URL`, `PAGE_SEO`, `pageTitle`, `canonicalUrl`)
* `src/lib/ui/Seo.svelte` (new: head tags for the current route)
* `src/routes/+layout.svelte` (mount `<Seo />`)
* `src/routes/**/+page.svelte` (all 12: removed `<svelte:head>` blocks)
* `src/routes/+page.svelte` (intro line naming both games)
* `src/routes/play/+page.svelte`, `src/routes/auction/+page.svelte` (subtitles with nicknames)
* `src/lib/ui/StatsPage.svelte` (comment: head tags now come from `<Seo>`)
* `tests/ui/seo.test.ts` (new)
* `CLAUDE.md` (SEO head tags section)
* `package.json` (version 0.2.62 → 0.2.63)
* `doc/TODO-063.md` (this file)
