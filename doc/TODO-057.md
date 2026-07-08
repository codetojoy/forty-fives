
### TODO-057

Rewrite the Feedback page (`/feedback`) copy from placeholder wording into a
real, warm ask. Prompted by preparing an alpha feedback post to r/PEI: the page
is where those users land to give feedback, so it must not announce itself as
"a placeholder — the wording will be filled in soon."

Scope is **copy only**. Keep the existing mechanism unchanged: no in-app form
(privacy-first, SPEC §3 — that would be a network call / data collection), just
the two outbound channels already in place — `mailto:codetojoy@gmail.com` and the
GitHub issues link — each a 48px tap target.

* bump version to 0.2.57

**Status: complete** (implemented 2026-07-08).

### Implementation notes (done)

Only `src/routes/feedback/+page.svelte` changed — copy + the stale code comment.
No structural, styling, or mechanism change; the two channel links and the Home
link are untouched.

* Removed the "This page is a placeholder — the wording will be filled in soon"
  sentence entirely.
* New intro is a genuine, warm ask that leans into the alpha's actual purpose
  (getting the regional rules right — SPEC §6), which is the reason for the r/PEI
  post: it explicitly invites players to say how *their* table plays and where
  they're from, mirroring the FAQ "We play Auction differently" entry (TODO-056).
* Reassures on privacy in passing (no account or sign-up needed) — consistent
  with the app's no-accounts / no-tracking posture and a selling point for the
  community post.
* Updated the leading code comment so it no longer calls the page a placeholder.

Version bumped 0.2.56 → 0.2.57. Verified: `npm run check` 0 errors/0 warnings,
444/444 tests, production build succeeds; grep of prerendered `build/feedback.html`
confirms the word "placeholder" is gone and both the `mailto:` and GitHub issues
links remain.

### Files committed

* `src/routes/feedback/+page.svelte` (real warm-ask copy; stale comment updated)
* `package.json` (version 0.2.56 → 0.2.57)
* `doc/TODO-057.md` (this file)
