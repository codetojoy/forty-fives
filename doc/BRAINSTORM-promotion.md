# Brainstorm: promotion beyond basic SEO

A scoping note on how to promote the app (assuming a dedicated domain is
purchased), and what a minimal Google paid plan would cost. Treat the dollar
figures as ballparks as of early 2026 — ad pricing shifts, verify before
spending. Verdict up front: **for a free, niche, privacy-first app the best ROI
is organic community seeding, not paid ads.** Spend $0 on ads first; keep paid
Google as a small later experiment, with **Google Ad Grants** as the real prize
*if* nonprofit status is ever on the table.

---

## 1. Two constraints unique to this app

1. **Privacy-first fights conversion tracking.** The app makes no network calls
   and has no analytics (SPEC §3). Google Ads tracks *clicks* on their side (no
   change to our site needed), but *conversion* tracking ("did they play a
   game?") requires a tag/cookie on the page — which breaks the privacy posture.
   So decide up front we optimize for **clicks/reach, not conversions**; measure
   "clicks to the site," not on-site engagement.
2. **It is a genuinely niche term.** "Forty-fives card game," "Auction 45s,"
   "Maritime card game" have low search competition — *good* for paid ads (cheap
   clicks) but *thin* for organic volume (few searchers). The growth ceiling is
   the size of the interested community, not the ad budget.

## 2. Free / organic channels (best ROI for a niche free app)

Almost certainly outperform paid ads here:

- **Community seeding** — the Maritime card-playing community lives in specific
  places: Reddit (r/cardgames, regional subs like r/NovaScotia, r/Newfoundland),
  Facebook groups (large for seniors and regional games — "45s" / "Auction 45s"
  groups exist), and Kijiji / community boards. One good post in the right
  Facebook group beats a month of ads for this audience.
- **BoardGameGeek** — has a Forty-Fives entry; a polished free implementation is
  genuinely welcome there.
- **Wikipedia** — the [Forty-fives article](https://en.wikipedia.org/wiki/Forty-fives)
  is the app's rules source. An external-links entry to a free, no-ads,
  privacy-respecting implementation is legitimate and durable. Follow their
  guidelines; don't spam.
- **Open-source discovery** — Apache-2.0 on GitHub: a strong README, topic tags,
  a Show HN / Lobsters post, and a listing on AlternativeTo. "Free, offline,
  no-tracking card game" is a story those audiences like.
- **The privacy angle as the hook** — "no accounts, no ads, no tracking, works
  offline" is a real differentiator worth putting in every description; it
  resonates with both the senior audience and the OSS crowd.

## 3. Paid — Google specifically

- **No minimum spend, no contract.** Google Ads (Search) lets you set a daily
  budget as low as you like; billed per click. A realistic minimal test is
  **~$5–10/day → roughly $150–300/month**, pausable anytime.
- **Cost per click** for these low-competition terms is likely **low
  ($0.10–0.70)** vs. the multi-dollar CPCs of competitive verticals. So
  ~$150/month might buy several hundred clicks — but capped by how many people
  search these terms at all.
- **Google Ad Grants — the one to actually chase.** Registered
  nonprofits/charities get **up to $10,000/month in free Search ads**, which
  dwarfs any self-funded budget. Caveats: Search-only, capped CPC bids, requires
  a real website and ongoing account activity, and needs nonprofit validation
  (via Percent / TechSoup). An open-source project is **not** automatically
  eligible — it needs actual registered nonprofit/charity status (in Canada, a
  registered charity). Worth investigating given the app is free and mission-ish.
- **Where Google Ads underdelivers here:** display / YouTube ads are poor fits
  (paying for broad impressions to people who'll never play a regional card
  game). If paying at all, stick to **Search intent**.

## 4. Recommendation

For a free, niche, privacy-first app: **spend $0 on ads first.** Put the effort
into the Facebook 45s groups, the Wikipedia external link, BGG, and a solid
GitHub/OSS launch — that is where the actual audience is and it costs nothing. If
paid reach is wanted later, a **$5/day Google Search campaign on the niche
terms** is a low-risk experiment, and **Google Ad Grants** is the real prize *if*
nonprofit status is on the table.

## 5. Possible next artifacts (not yet produced)

- A tuned set of Google Search keywords + ad copy for the niche terms.
- A short launch blurb adaptable for BGG / Reddit / a Facebook 45s group.

Nothing implemented — this is a planning/marketing note, not a code task.
