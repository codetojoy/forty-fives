// /sitemap.xml (TODO-063 item 4): prerendered to a static file at build time,
// generated from the PAGE_SEO route table — see sitemapXml() in seo.ts.
import { sitemapXml } from '$lib/ui/seo.js';

export const prerender = true;

export function GET(): Response {
	return new Response(sitemapXml(), {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
}
