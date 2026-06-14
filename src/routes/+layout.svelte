<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { base } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	// Register the service worker ourselves, production-only. SvelteKit's
	// auto-registration is disabled (serviceWorker.register: false in vite.config.ts)
	// because it also fires in dev as a module worker that Chrome can't evaluate.
	// The built worker is a classic script served at `${base}/service-worker.js`.
	onMount(() => {
		if (!dev && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register(`${base}/service-worker.js`);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	/*
	 * The self-hosted @font-face rules live in src/app.html so their URLs can be
	 * base-path-aware via %sveltekit.assets% (CSS url() in a component <style> is
	 * not rewritten for the base path). Fonts: Lato & Lora, both SIL OFL,
	 * no runtime network calls (privacy, SPEC §3); provenance in ASSETS.md.
	 */
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}

	:global(html) {
		/* Respect OS font-size accessibility settings (SPEC §7). */
		font-size: 100%;
	}

	/*
	 * Design tokens for the warm print-inspired theme (doc/TODO-003):
	 * cream paper, terracotta accents, hairline rules, Lora display + Lato body.
	 */
	:global(:root) {
		--bg: #f7f2e7;
		--panel: #fffdf6;
		--ink: #3d3a35;
		--muted: #6f6758;
		--accent: #b0503a;
		--accent-deep: #9c4632;
		--rule: #ddd5c4;
		--focus: #9c4632;
		--good: #2c6e3f;
		--bad: #b3261e;
		--serif: 'Lora', Georgia, 'Times New Roman', serif;
		--sans:
			'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
	}

	:global(body) {
		margin: 0;
		min-height: 100vh;
		background: var(--bg);
		color: var(--ink);
		font-family: var(--sans);
		line-height: 1.5;
		-webkit-text-size-adjust: 100%;
	}
</style>
