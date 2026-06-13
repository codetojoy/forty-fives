<script lang="ts">
	import { base } from '$app/paths';

	// Injected at build time by Vite `define` (see vite.config.ts / TODO-006).
	const version = __APP_VERSION__;
	const buildTime = __BUILD_TIME__;
	const commit = __GIT_COMMIT__;
</script>

<svelte:head>
	<title>About — Forty-Fives</title>
	<meta name="description" content="Build information for the Forty-Fives app." />
</svelte:head>

<main>
	<header>
		<h1>About</h1>
		<p class="subtitle">Build information</p>
	</header>

	<dl class="info">
		<dt>Version</dt>
		<dd>{version}</dd>

		<dt>Built</dt>
		<dd>{buildTime}</dd>

		<dt>Commit</dt>
		<dd>{commit}</dd>
	</dl>

	<p class="note"><a href="{base}/">← Home</a></p>
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 2rem 1rem 3rem;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1.25rem;
		border-bottom: 2px solid var(--accent);
	}

	h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 2.6rem;
		margin: 0;
		color: var(--accent);
	}

	.subtitle {
		margin: 0.4rem 0 0;
		font-family: var(--serif);
		font-style: italic;
		font-size: 1.15rem;
		color: var(--muted);
	}

	.info {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.75rem 1.5rem;
		margin: 0;
	}

	dt {
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.95rem;
		color: var(--accent-deep);
	}

	dd {
		margin: 0;
		font-family: var(--mono, ui-monospace, monospace);
		font-size: 1.05rem;
		word-break: break-all;
	}

	.note {
		margin-top: 2.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--rule);
		text-align: center;
	}

	.note a {
		color: var(--accent);
		font-weight: 600;
	}
</style>
