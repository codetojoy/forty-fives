
### TODO-054 [COMPLETE]

Add two new secondary pages to the app, in the same family as `/about`:

1. **FAQ** (`/faq`)
2. **Feedback** (`/feedback`)

Both are standard, About-like static pages. Link them from the home page footer,
alongside the existing About link.

* bump version to 0.2.54

---

### Placement decision (settled)

The home footer, next to About, is the right home for both links. Rationale:

* All three (FAQ / About / Feedback) are *meta* pages, **not game modes**. The
  footer already carries that semantic — the comment at `src/routes/+page.svelte`
  (`.site-footer`) notes About "is not a game mode, so it's a lighter link set
  apart from the mode cards by a divider." FAQ and Feedback are the same class,
  so grouping them there keeps the three mode cards as the clear primary
  call-to-action and doesn't dilute them.
* It matches universal web convention (About / FAQ / Contact live in the footer),
  so it is discoverable without thought.
* It reuses the existing divider + secondary-link styling — no new visual region
  invented.

### Requirements

**(a) Stack the three links vertically on mobile.** The footer currently centers
a single link. With three, use a layout that **stacks vertically on narrow
screens** (a row that wraps, or a column at a mobile breakpoint). Every link must
keep the **48px min-height tap target** (SPEC §7) — three inline links crowd on a
phone, so a vertical stack on mobile is the clearer choice. Reuse the existing
`.about-link` styling for all three.

**(b) Placeholder content for now.** FAQ and Feedback ship as About-like pages
with **placeholder body content** only — enough structure to prove the routing,
prerendering, `<title>`/meta, and links. Real FAQ entries and the final Feedback
mechanism come later (see the Feedback note below).

**(c) Link order: FAQ · About · Feedback.** FAQ first (most useful to a confused
newcomer with a rules question), About in the middle (reference), Feedback last
(the "now tell us" endpoint).

**(d) Feedback mechanism — privacy-first (note for when placeholder is filled
in).** A Feedback *form that posts somewhere* would be a network call and would
break the privacy posture (SPEC §3: no network calls beyond loading the site, no
accounts, no analytics). To stay in keeping, the real Feedback action should be a
**`mailto:`** link (`codetojoy@gmail.com`) or a link out to **GitHub issues** —
i.e. it leaves the app rather than collecting data inside it. For this TODO the
page is a placeholder, but build it expecting an outbound link, not an in-app
form.

### Future consideration (not in this TODO)

The home footer is the right *primary* home for these links, but a player deep in
a game never returns to `/`, so they won't see the footer mid-game. If FAQ (or
Feedback) later proves worth reaching without leaving a game, surface it from the
**in-game help** as well — but do **not** crowd the home footer trying to solve
that here. Out of scope for TODO-054; recorded so it isn't lost.

### Notes / scope

* Both new routes are prerendered static pages (adapter-static), same as
  `/about` — so their content **can** be verified with a static-HTML grep, unlike
  the in-game views.
* Follow the `/about` page as the structural template (main/header/`svelte:head`
  title + meta description, existing tokens and styles).
* No domain logic, no persistence, no tests needed — this is static UI + routing.
* Verify the usual way: `npm run check` (0 errors/0 warnings), `npm test`,
  `npm run build`, and grep the prerendered `/`, `/faq`, `/feedback` HTML for the
  expected strings and the three footer links in order.

**Status: complete** (implemented 2026-07-08).

### Implementation notes (done)

* **Two new prerendered routes**, both modelled on `/about`:
  `src/routes/faq/+page.svelte` and `src/routes/feedback/+page.svelte`. Prerender
  is inherited from `src/routes/+layout.ts` (`prerender = true`), so no per-page
  config was needed. They emit as flat `build/faq.html` / `build/feedback.html`
  (same as `about.html`), so both are **grep-verifiable** static HTML.
* **FAQ** (`/faq`): a `<dl>` of two placeholder Q&A entries plus a "more coming"
  note — enough to prove routing/title/meta. Real entries are a follow-up.
* **Feedback** (`/feedback`): **no in-app form** — that would be a network call /
  data collection and break the privacy posture (SPEC §3). Instead two real
  **outbound** links, a `mailto:codetojoy@gmail.com` and the GitHub issues page
  (`target="_blank"` + `rel="noopener noreferrer"`), each a 48px tap target. The
  page is still "placeholder" in wording but the mechanism is the final one.
* **(a) Mobile stack.** The home footer became a mobile-first flex **column**
  (`.site-footer`), switching to a centered **row** at `min-width: 30rem`. So the
  three links stack vertically on a phone (no crowding) and sit in a row with
  room to spare. Each link keeps the existing `.about-link` styling and its 48px
  min-height tap target (SPEC §7).
* **(c) Order** is FAQ · About · Feedback, as laid out in the markup.
* The footer element changed from `<footer>` to `<nav aria-label="More">` since it
  is now a group of navigation links, not a single control (better semantics/a11y).
* No domain logic, persistence, or tests — static UI + routing only. The service
  worker precache already derives from the whole `prerendered` set dynamically
  (`src/service-worker.ts`), so the two new routes are cached offline with no
  change needed there.

### (d) Future consideration (recorded, not done)

The home footer is the right *primary* home for these links, but a player deep in
a game never returns to `/`, so they won't see the footer mid-game. If FAQ (or
Feedback) later proves worth reaching without leaving a game, surface it from the
**in-game help** as well. Out of scope for TODO-054.

Version bumped 0.2.53 → 0.2.54. Verified: `npm run check` 0 errors/0 warnings,
444/444 tests, production build succeeds; grep of the prerendered HTML confirms
the home footer links (`./faq` FAQ, `./about` About, `./feedback` Feedback in
order), both new page `<title>`s, and the Feedback `mailto:` + GitHub issues
links.

### Files committed

* `src/routes/faq/+page.svelte` (new — placeholder FAQ page)
* `src/routes/feedback/+page.svelte` (new — placeholder Feedback page, outbound links)
* `src/routes/+page.svelte` (home footer: 3 links, mobile-stack → row, `<nav>`)
* `package.json` (version 0.2.53 → 0.2.54)
* `doc/TODO-054.md` (this file)
