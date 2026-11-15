/**
 * Search-engine head metadata (TODO-063): one table of per-route titles and
 * descriptions, plus the canonical-URL and title-pattern helpers. Rendered once,
 * for every route, by `Seo.svelte` in the root layout — routes do not write their
 * own <title> or meta description (tests/ui/seo.test.ts enforces this).
 *
 * UI layer only; nothing here goes near src/lib/domain/.
 *
 * Search intent per page (keep them from competing with each other):
 *  - `/`                  umbrella: both games + the trainer
 *  - `/play`              Forty-Fives, aka "45s" (the 2-player game)
 *  - `/auction`           Auction Forty-Fives, aka "Auction 45s" (4 players, partners)
 *  - `/trainer/reference` "forty fives trump order / card rankings"
 *  - `/trainer`           learning the rankings
 *
 * Deliberately absent: `<meta name="keywords">` (ignored by Google since 2009)
 * and any analytics/verification tags (privacy, SPEC §3).
 */

/**
 * The one public origin. Verified against production (doc/BRAINSTORM-SEO.md §0):
 * www.45s.ca and codetojoy.github.io/forty-fives both 301 here, and `/faq/`
 * (trailing slash) 404s — so canonical URLs are apex, no trailing slash.
 */
export const SITE_URL = 'https://45s.ca';

export const SITE_NAME = 'Forty-Fives';

export interface PageSeo {
	/** Page name; suffixed with " — Forty-Fives" unless `suffix` is false. */
	title: string;
	/** Use `title` verbatim (pages whose title already names the game). Default true. */
	suffix?: boolean;
	/** 120–160 characters for indexed pages. */
	description: string;
	/** Keep out of search results (settings, per-device stats, build stamp). */
	noindex?: boolean;
}

/** Keyed by SvelteKit route id. A route missing here fails the prerender. */
export const PAGE_SEO: Record<string, PageSeo> = {
	'/': {
		title: 'Forty-Fives & Auction 45s — free Maritime card games',
		suffix: false,
		description:
			'Play Forty-Fives (45s) head-to-head or Auction Forty-Fives with a partner, and learn the tricky trump rankings. Free, open source, and works offline.'
	},
	'/play': {
		title: 'Play Forty-Fives (45s) — free 2-player card game',
		suffix: false,
		description:
			'Play Forty-Fives (45s), the Maritime Canadian card game, head-to-head against the computer: rob the turn-up, win tricks, and race to 45. Free, works offline.'
	},
	'/auction': {
		title: 'Auction Forty-Fives (Auction 45s) — free 4-player game',
		suffix: false,
		description:
			'Play Auction Forty-Fives (Auction 45s) for four: you and a partner against two opponents. Bid 15 to 30, name trump, take the kitty, and race to 120.'
	},
	'/trainer': {
		title: 'Learn the Trump Rankings',
		description:
			'Learn the unusual Forty-Fives card rankings two cards at a time — the 5, the jack, the ace of hearts — with a plain explanation for every answer.'
	},
	'/trainer/reference': {
		title: 'Card Rankings & Trump Order',
		description:
			'The Forty-Fives card rankings for every suit, trump and off-trump: why the 5 of trumps is top, the A♥ is always trump, and black number cards run backwards.'
	},
	'/faq': {
		title: 'FAQ',
		description:
			'Answers to common questions about the free Forty-Fives app: how to play, and what the Auction rules profiles (Common PEI, Rec Hall, Tignish) mean.'
	},
	'/feedback': {
		title: 'Feedback',
		description:
			'Does your table play Forty-Fives differently — other trumps, kitty, or scoring? Tell us where you play, or report a bug. No account or sign-up needed.'
	},
	'/about': {
		title: 'About',
		description:
			'Version and build information for Forty-Fives, a free and open-source Maritime Canadian card game app released under the Apache 2.0 license.',
		noindex: true
	},
	'/play/config': {
		title: 'Play Settings',
		description: 'Display and interaction preferences for playing Forty-Fives head-to-head.',
		noindex: true
	},
	'/play/stats': {
		title: 'Play Stats',
		description: 'Your lifetime tallies for Forty-Fives, stored only on this device.',
		noindex: true
	},
	'/auction/config': {
		title: 'Auction Settings',
		description: 'Choose the rules profile and preferences for Auction Forty-Fives.',
		noindex: true
	},
	'/auction/stats': {
		title: 'Auction Stats',
		description: "Your team's lifetime tallies for Auction Forty-Fives, stored only on this device.",
		noindex: true
	}
};

/** "<Page> — Forty-Fives", or `title` verbatim when `suffix` is false. */
export function pageTitle(title: string, suffix = true): string {
	return suffix ? `${title} — ${SITE_NAME}` : title;
}

/**
 * Absolute canonical URL for a SvelteKit route id ("/", "/trainer/reference").
 *
 * Built from the route id rather than `page.url.pathname` so it is independent
 * of the deploy base: a BASE_PATH subpath build still canonicalizes to the apex
 * site. (Stripping `base` from the pathname does not work — during prerender
 * `base` is a relative path like "..", since `paths.relative` defaults to true.)
 * Every route here is static, so its id *is* its URL path; a dynamic
 * (`[param]`) or grouped (`(group)`) route id is not, and is refused.
 * Drops any trailing slash except on home (45s.ca/faq/ is a 404).
 */
export function canonicalUrl(routeId: string): string {
	if (/[[(]/.test(routeId)) {
		throw new Error(`canonicalUrl: route id "${routeId}" is not a static path`);
	}
	let path = routeId;
	if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
	if (path === '') path = '/';
	return `${SITE_URL}${path}`;
}

/**
 * The sitemap (TODO-063 item 4), derived from `PAGE_SEO` so it cannot drift:
 * every indexed route by its canonical URL, and no `noindex` page. Served as
 * the prerendered `/sitemap.xml` (src/routes/sitemap.xml/+server.ts) and
 * advertised in static/robots.txt. No `<lastmod>`: there is no honest per-page
 * date to give, and Google ignores inaccurate ones.
 */
export function sitemapXml(): string {
	const urls = Object.entries(PAGE_SEO)
		.filter(([, seo]) => !seo.noindex)
		.map(([id]) => `\t<url><loc>${canonicalUrl(id)}</loc></url>`);
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...urls,
		'</urlset>',
		''
	].join('\n');
}
