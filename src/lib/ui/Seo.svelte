<!-- Search-engine head tags for the current route (TODO-063): <title>, meta
     description, canonical URL, and `noindex` where the route table says so.
     Rendered once from the root layout; per-route text lives in seo.ts.

     Must render during prerender — the tags have to be in the static HTML, since
     link-preview scrapers don't run JS — so no `browser` guard and no `window`.
     `page.route` is available while prerendering. -->
<script lang="ts">
	import { page } from '$app/state';
	import { PAGE_SEO, canonicalUrl, pageTitle } from './seo.js';

	const seo = $derived.by(() => {
		const id = page.route.id;
		// No route id = an error page (e.g. a 404); leave its head alone.
		if (id === null) return null;
		const entry = PAGE_SEO[id];
		// Fail the prerender rather than ship a page with no title/description.
		if (!entry) throw new Error(`No SEO entry for route "${id}" — add it to src/lib/ui/seo.ts`);
		return { ...entry, canonical: canonicalUrl(id) };
	});
</script>

<svelte:head>
	{#if seo}
		<title>{pageTitle(seo.title, seo.suffix ?? true)}</title>
		<meta name="description" content={seo.description} />
		<link rel="canonical" href={seo.canonical} />
		{#if seo.noindex}
			<meta name="robots" content="noindex, follow" />
		{/if}
	{/if}
</svelte:head>
