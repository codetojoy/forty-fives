
### TODO-036 [COMPLETE]

Re-examined items 3a and 3b of doc/BRAINSTORM-UI.md against the current Auction
page — both still valid (the intro paragraph was still dense; the trump badge
still showed only the suit, nothing about the 5→J→A♥ ladder) — and implemented
both via one new accessible, Flutter-portable disclosure component.

New `src/lib/ui/HelpDisclosure.svelte`: a generic tap-toggle `?`-disclosure (not a
hover `title=`, which is invisible on touch and won't port). A 48px trigger button
with `aria-expanded`/`aria-controls`, an absolutely-positioned popover (overlays
rather than reflowing the table — respects the TODO-015 anti-jump reserves),
width-capped for mobile, `align="end"` to right-anchor near the viewport edge.
Closes on Esc (restoring focus to the trigger), outside tap/click, the × button,
or re-tap; listeners attach only while open.

* 3a — intro: replaced the dense rules paragraph with a one-line tagline ("Bid,
  name trump, take the kitty — and play in partnership.") plus a "How to play"
  disclosure holding the full rules (finish-rule conditional preserved). Lowers
  first-screen density.
* 3b — trump ranking: a `?` beside the trump badge opens the current trump suit's
  full ranking (highest first) as card-label chips, with a note that the 5, Jack
  and A♥ are the top three in every suit. Pure display of existing scheme data
  (`scheme.trumpRankings[trumpSuit]` via a new `trumpRanking` derived); colour is
  decorative, the rank+suit text carries meaning (SPEC §7).

Auction-only; no `/play`, domain, or AI changes. Did not pull in the adjacent
brainstorm findings (1a copy module, §2 component extraction) — separately scoped.

Verified: `npm run check` clean (0 errors, 0 warnings); full suite 410 passing;
production build succeeds; preview smoke confirmed the intro tagline + "How to
play" trigger render and /about shows 0.1.36. The in-game trump `?` is client-only
(gated on an active game) so it isn't in prerendered HTML; its markup is
type-checked and the ranking derive verified. Version bumped to 0.1.36. Original
task notes below.

For Auction Forty-Fives, let's re-examine and implement some suggestions contained in doc/BRAINSTORM-UI.md

Goals:
* re-examine items 3a and 3b (from doc/BRAINSTORM-UI.md) to see if they are still valid
* if valid, implement those items as this TODO task
* version bump to 0.1.36

