<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	/*
	 * Self-hosted fonts (no network calls at runtime — privacy, SPEC §3).
	 * Lato & Lora, both SIL OFL; provenance in ASSETS.md.
	 */
	@font-face {
		font-family: 'Lato';
		font-style: normal;
		font-weight: 400;
		font-display: swap;
		src: url('/fonts/lato-400.woff2') format('woff2');
	}

	@font-face {
		font-family: 'Lato';
		font-style: italic;
		font-weight: 400;
		font-display: swap;
		src: url('/fonts/lato-400-italic.woff2') format('woff2');
	}

	@font-face {
		font-family: 'Lato';
		font-style: normal;
		font-weight: 700;
		font-display: swap;
		src: url('/fonts/lato-700.woff2') format('woff2');
	}

	@font-face {
		font-family: 'Lora';
		font-style: normal;
		font-weight: 600;
		font-display: swap;
		src: url('/fonts/lora-600.woff2') format('woff2');
	}

	@font-face {
		font-family: 'Lora';
		font-style: italic;
		font-weight: 400;
		font-display: swap;
		src: url('/fonts/lora-400-italic.woff2') format('woff2');
	}

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
