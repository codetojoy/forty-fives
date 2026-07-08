<script lang="ts">
	import { base } from '$app/paths';

	// Placeholder Q&A for now (TODO-054). Real entries land in a follow-up; this
	// proves routing, prerendering, and the home-footer link.
	const faqs = [
		{
			q: 'What is Forty-Fives?',
			a: 'A Maritime Canadian trick-taking card game with unusual, region-specific trump rankings. More detail coming soon.'
		},
		{
			q: 'How do I play?',
			a: 'Each game mode has a "How to play" panel on its page, and the Learn Ranking trainer teaches the card rankings. Fuller answers coming soon.'
		}
	];
</script>

<svelte:head>
	<title>FAQ — Forty-Fives</title>
	<meta name="description" content="Frequently asked questions about the Forty-Fives app." />
</svelte:head>

<main>
	<header>
		<h1>FAQ</h1>
		<p class="subtitle">Frequently asked questions</p>
	</header>

	<p class="placeholder-note">
		More questions and answers are on the way. For now, a couple to get started:
	</p>

	<dl class="faqs">
		{#each faqs as item (item.q)}
			<dt>{item.q}</dt>
			<dd>{item.a}</dd>
		{/each}
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

	.placeholder-note {
		font-size: 1.05rem;
		line-height: 1.5;
		color: var(--muted);
	}

	.faqs {
		margin: 1.5rem 0 0;
	}

	dt {
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--accent-deep);
		margin-top: 1.5rem;
	}

	dd {
		margin: 0.4rem 0 0;
		font-size: 1.05rem;
		line-height: 1.5;
	}

	.note {
		margin-top: 2.5rem;
		text-align: center;
	}

	.note a {
		color: var(--accent);
		font-weight: 600;
	}
</style>
