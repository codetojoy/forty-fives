# BRAINSTORM-028 — keeping the trump suit visible on mobile

Brainstorm only (TODO-028): no code change, no version bump. Ideas for mitigating
the mobile scrolling problem in Auction Forty-Fives, ranked by preference.

## The problem

On a phone (narrow viewport, `< 48rem`) the Auction page stacks everything in one
vertical column, in DOM order:

```
   top-nav (Home)
   header  ── score · TRUMP BADGE · hand-info     ◀── trump lives up here
   seats   (3 AI players)
   trick-area
   message-area
   panel-slot (bid / name-trump / discard / hand-result)
   your-hand  ── your cards + confirm hint         ◀── but you ACT down here
   footer (Abandon)
```

The trump indicator sits in `.status-bar` at the **top** (`auction/+page.svelte:401`),
while you choose and play cards from `.your-hand` at the **bottom**
(`auction/+page.svelte:597`). To confirm "what's trump?" while looking at your hand,
you have to scroll back up. On wide screens the `@media (min-width: 48rem)` grid
seats the players around the central trick area and the whole table fits on screen,
so **this is a mobile-specific problem** — fixes should target mobile and must not
regress the desktop grid.

## Constraints any fix must respect

- **Never color-only.** Color-blind players and the "A♥ is always trump" wrinkle
  mean a trump cue must always pair the **suit symbol + suit name** (color is a
  bonus, never the signal). (SPEC §7)
- **OS font scaling + ≥48px tap targets.** A sticky band can balloon when the user
  scales text — reserve space and keep it slim; don't cover the cards.
- **Anti-jump (TODO-015).** Several heights are deliberately reserved so phases
  don't make the table hop. Any new element should keep layout stable, not add a
  jump.
- **No swipe-only gestures; KISS; Flutter-portable.** Prefer cues that translate
  cleanly to the planned Flutter client (a heading string, a sticky bar, and a
  duplicated badge all port trivially).

---

## Mitigations, ranked by preference

### 1. Trump on the "Your hand" heading  ★ recommended
Fold the trump suit into the hand heading itself, e.g.

> **Your hand · ♥ Hearts are trump**

The hand heading is the last thing before the cards — exactly where the decision is
made and exactly where the eye already is on mobile. It puts the answer *at the
point of action* with no scrolling, no new sticky machinery, and effectively zero
added height (the heading already exists, `auction/+page.svelte:599`).

- **A11y:** symbol + name + (optional) trump colour; reads naturally to a screen
  reader as part of the heading.
- **Effort:** tiny — extend one existing heading string.
- **Why #1:** highest value for the least change; solves the literal complaint
  ("scroll to confirm trump") by removing the need to scroll at all.

### 2. Sticky condensed status strip
A slim **sticky** line that stays pinned while you scroll — score · trump · whose
turn — condensed from the current `.status-bar`. Trump is then visible from *any*
scroll position, not just near one element.

- **A11y / layout:** must stay slim under font scaling and not occlude the hand;
  reserve its height so content isn't hidden beneath it; honour safe-area insets
  for notched phones.
- **Effort:** medium — new sticky element + spacing/anti-jump care.
- **Why #2:** the most *robust* fix (works regardless of where you are on the
  page) and bonus-surfaces score + turn, but it costs vertical space and the most
  layout care. Strong candidate if a single change should cover everything.

### 3. Trump icon on every section heading  *(seed idea B)*
Give the section headings (trick area, your hand, action panels) the current
trump-suit symbol, so trump is reinforced wherever you happen to be looking.

- **A11y:** **not icon-only** — pair the symbol with the suit name or an
  `aria-label`, or it's invisible to screen readers and ambiguous to anyone who
  glanced away.
- **Effort:** low.
- **Why #3:** cheap, repeated reinforcement — but each heading still has to be on
  screen to help, so it complements #1 rather than replacing it. Natural pairing:
  do #1 and let #3 echo it elsewhere.

### 4. Trump badge at top *and* bottom  *(seed idea A)*
Duplicate the existing trump badge lower down (e.g. just above the footer / below
the hand), so a copy is always near the action.

- **A11y:** straightforward; the duplicate should be `aria-hidden` or worded so a
  screen reader doesn't announce trump twice in a row.
- **Effort:** low.
- **Why #4:** achieves the same "trump near the action" goal as #1, but as a
  standalone repeated badge it adds a little height and feels more redundant than
  folding it into the heading. #1 is the tidier version of this idea.

### 5. Flag the trump cards inside your hand
Mark which of *your* cards are trump (a small pip/badge or subtle ring), so you
needn't even recall the suit — the relevant cards announce themselves. Naturally
reinforces "A♥ is always trump."

- **Risk:** collides with the existing legal-play **highlight**, **dim**, and
  **selected** states on the same cards (`isDimmed`, `selected`); stacking a fourth
  visual state risks noise and a11y confusion.
- **Effort:** medium, and needs careful visual design to coexist with the other
  states.
- **Why #5:** the most *direct* answer to "which can I play as trump," but the
  visual-collision risk and added complexity push it below the cheaper cues.

### 6. Trump in the turn prompt / trick placeholder
Append trump to the contextual prompt the player reads each turn, e.g. *"Your
turn — ♥ is trump."* The trick area sits mid-column and is usually in view.

- **Effort:** low.
- **Why #6:** nearly free, but the prompt is contextual and can be empty between
  states, so it's a supporting cue rather than a dependable anchor.

### 7. Trump-colour tint / border / watermark on the hand area
An ambient cue: tint the hand section's border, or a faint trump-suit watermark
behind the cards, in the trump colour.

- **A11y:** colour-only fails the rule — only acceptable *alongside* a textual cue
  (so it rides on top of #1/#3, never alone).
- **Effort:** low.
- **Why #7:** pleasant polish, weak as a standalone fix.

### 8. Compact mobile layout to reduce scrolling overall
Attack the root cause — the column is simply tall. Tighten mobile spacing (shrink
seat panels, condense `hand-info`, trim the `trick-area` min-height) so more of the
table fits without scrolling.

- **Effort:** higher / broader — touches multiple sections and the anti-jump
  reserved heights.
- **Why #8:** valuable for general ergonomics, but it doesn't *guarantee* trump
  visibility and is a bigger, riskier change than the targeted cues. Best treated
  as separate follow-up work, not the trump fix.

---

## Recommendation

Lead with the cheap, high-value pair:

1. **#1 — trump in the "Your hand" heading** (the primary fix; puts the answer
   where you act), optionally echoed by
2. **#3 — trump icon on the other section headings** (reinforcement, with suit
   names for a11y).

If we'd rather solve it with a single, position-independent change, **#2 (sticky
status strip)** is the robust alternative — at the cost of vertical space and more
layout care. The options compose: #1 + #3 is the low-risk default; #2 can be added
later if testers still report hunting for trump.

**Non-goals / guardrails:** nothing colour-only, no swipe-only gestures, don't
regress the desktop grid, and preserve the TODO-015 anti-jump reserved heights.
