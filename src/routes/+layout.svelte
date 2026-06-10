<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}

	:global(html) {
		/* Respect OS font-size accessibility settings (SPEC §7). */
		font-size: 100%;
	}

	:global(body) {
		margin: 0;
		min-height: 100vh;
		background: #14492e;
		color: #f3efe4;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		line-height: 1.5;
		-webkit-text-size-adjust: 100%;
	}
</style>
