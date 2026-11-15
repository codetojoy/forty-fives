/**
 * SEO head metadata (TODO-063): canonical URLs, the title pattern, per-route
 * title/description hygiene, and which routes are `noindex`.
 *
 * The route table is checked against the filesystem so a new route without an
 * SEO entry fails here (and would also fail the prerender, see Seo.svelte), and
 * against the route sources so nobody reintroduces a hand-rolled <title> or
 * description that would drift from the table.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { SITE_URL, PAGE_SEO, canonicalUrl, pageTitle, sitemapXml } from '$lib/ui/seo.js';

const ROUTES_DIR = join(process.cwd(), 'src', 'routes');

/** Every `+page.svelte` under src/routes, as a SvelteKit route id ("/", "/play/config"). */
function routeIds(): string[] {
	const found: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.name === '+page.svelte') {
				const rel = relative(ROUTES_DIR, dir).split(sep).join('/');
				found.push(rel === '' ? '/' : `/${rel}`);
			}
		}
	};
	walk(ROUTES_DIR);
	return found.sort();
}

function routeSource(id: string): string {
	return readFileSync(join(ROUTES_DIR, id, '+page.svelte'), 'utf8');
}

describe('canonicalUrl', () => {
	it('is the bare apex origin for home, with its slash', () => {
		expect(canonicalUrl('/')).toBe('https://45s.ca/');
		expect(canonicalUrl('')).toBe('https://45s.ca/');
	});

	it('has no trailing slash for other pages (45s.ca/faq/ is a 404)', () => {
		expect(canonicalUrl('/faq')).toBe('https://45s.ca/faq');
		expect(canonicalUrl('/faq/')).toBe('https://45s.ca/faq');
		expect(canonicalUrl('/trainer/reference')).toBe('https://45s.ca/trainer/reference');
	});

	it('maps every route id in the table to a URL under the apex origin', () => {
		for (const id of Object.keys(PAGE_SEO)) {
			expect(canonicalUrl(id)).toBe(id === '/' ? 'https://45s.ca/' : `https://45s.ca${id}`);
		}
	});

	it('refuses dynamic or grouped route ids, whose id is not a URL', () => {
		expect(() => canonicalUrl('/game/[id]')).toThrow();
		expect(() => canonicalUrl('/(marketing)/faq')).toThrow();
	});

	it('uses the apex domain, never www or github.io', () => {
		expect(SITE_URL).toBe('https://45s.ca');
	});
});

describe('pageTitle', () => {
	it('suffixes the site name by default: "<Page> — Forty-Fives"', () => {
		expect(pageTitle('FAQ')).toBe('FAQ — Forty-Fives');
	});

	it('uses the title verbatim when the suffix is turned off', () => {
		expect(pageTitle('Auction Forty-Fives', false)).toBe('Auction Forty-Fives');
	});
});

describe('PAGE_SEO route table', () => {
	const ids = routeIds();

	it('has exactly one entry per route', () => {
		expect(Object.keys(PAGE_SEO).sort()).toEqual(ids);
	});

	it('noindexes the settings, stats, and build-stamp pages, and nothing else', () => {
		const noindexed = Object.entries(PAGE_SEO)
			.filter(([, seo]) => seo.noindex)
			.map(([id]) => id)
			.sort();
		expect(noindexed).toEqual([
			'/about',
			'/auction/config',
			'/auction/stats',
			'/play/config',
			'/play/stats'
		]);
	});

	it('keeps every full title within ~60 characters so Google does not truncate it', () => {
		for (const [id, seo] of Object.entries(PAGE_SEO)) {
			const full = pageTitle(seo.title, seo.suffix ?? true);
			expect(full.length, `${id}: "${full}"`).toBeLessThanOrEqual(60);
		}
	});

	it('gives indexed pages a 120–160 character description', () => {
		for (const [id, seo] of Object.entries(PAGE_SEO)) {
			if (seo.noindex) continue;
			const len = seo.description.length;
			expect(len, `${id} (${len}): ${seo.description}`).toBeGreaterThanOrEqual(120);
			expect(len, `${id} (${len}): ${seo.description}`).toBeLessThanOrEqual(160);
		}
	});

	it('gives every page a description of at most 160 characters', () => {
		for (const [id, seo] of Object.entries(PAGE_SEO)) {
			expect(seo.description.length, id).toBeGreaterThan(0);
			expect(seo.description.length, id).toBeLessThanOrEqual(160);
		}
	});

	it('has a unique title and description for every page', () => {
		const titles = Object.values(PAGE_SEO).map((s) => pageTitle(s.title, s.suffix ?? true));
		const descs = Object.values(PAGE_SEO).map((s) => s.description);
		expect(new Set(titles).size).toBe(titles.length);
		expect(new Set(descs).size).toBe(descs.length);
	});

	it('names each game, with its nickname, on its own page', () => {
		expect(PAGE_SEO['/play'].title).toContain('Forty-Fives (45s)');
		expect(PAGE_SEO['/auction'].title).toContain('Auction Forty-Fives');
		expect(PAGE_SEO['/auction'].title).toContain('Auction 45s');
		// Home is the umbrella: it names both games.
		expect(PAGE_SEO['/'].title).toContain('Forty-Fives');
		expect(PAGE_SEO['/'].title).toContain('Auction 45s');
	});
});

describe('route sources', () => {
	it('leave <title> and the meta description to the shared <Seo> (no drift)', () => {
		for (const id of routeIds()) {
			const src = routeSource(id);
			expect(src, id).not.toMatch(/<title>/);
			expect(src, id).not.toMatch(/name="description"/);
		}
	});
});

describe('sitemapXml', () => {
	const xml = sitemapXml();
	const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]).sort();

	it('lists exactly the indexed routes, by canonical URL', () => {
		const expected = Object.entries(PAGE_SEO)
			.filter(([, seo]) => !seo.noindex)
			.map(([id]) => canonicalUrl(id))
			.sort();
		expect(locs).toEqual(expected);
	});

	it('never lists a noindex page (a sitemap entry would contradict the robots tag)', () => {
		for (const [id, seo] of Object.entries(PAGE_SEO)) {
			if (seo.noindex) expect(locs, id).not.toContain(canonicalUrl(id));
		}
	});

	it('is a sitemaps.org urlset document', () => {
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
	});

	it('is advertised in robots.txt at its absolute URL', () => {
		const robots = readFileSync(join(process.cwd(), 'static', 'robots.txt'), 'utf8');
		expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
	});
});
