<script lang="ts">
	import { base } from '$app/paths';

	// An answer is either plain text, or a sequence of segments where a segment is
	// either a run of text or an in-app link (TODO-056). This keeps most answers as
	// simple strings while letting one embed a link to the Feedback page without
	// resorting to {@html}.
	type LinkSegment = { href: string; text: string };
	type Answer = string | Array<string | LinkSegment>;

	const faqs: Array<{ q: string; a: Answer }> = [
		{
			q: 'What is Forty-Fives?',
			a: 'A Maritime Canadian trick-taking card game with unusual, region-specific trump rankings.'
		},
		{
			q: 'How do I play?',
			a: 'Each game mode has a "How to play" panel on its page, and the Learn Ranking trainer teaches the card rankings.'
		},
		{
			q: 'In Configure for Auction, what is Wikipedia vs Rec Hall?',
			a: 'They set different configuration values based on the style of play. For example, Wikipedia uses a kitty, where typical Rec Hall games (on PEI) do not.'
		},
		{
			q: 'In Configure for Auction, what is "Always exchange non-trump"?',
			a: 'When enabled, this provides a button for convenient discard of all non-trump cards, so you don’t have to select each one.'
		},
		{
			q: 'In Configure for Auction, what is "Hide other players"?',
			a: 'When enabled, this removes the rendering of computer players, which is cleaner on mobile devices.'
		},
		{
			q: 'We play Auction differently than this game.',
			a: [
				'We are listening! Please let us know the differences and where you are located. See ',
				{ href: `${base}/feedback`, text: 'the Feedback page' },
				'. We will try and incorporate the changes.'
			]
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

	<dl class="faqs">
		{#each faqs as item (item.q)}
			<dt>{item.q}</dt>
			<dd>
				{#if typeof item.a === 'string'}
					{item.a}
				{:else}
					{#each item.a as seg}
						{#if typeof seg === 'string'}{seg}{:else}<a href={seg.href}>{seg.text}</a>{/if}
					{/each}
				{/if}
			</dd>
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

	dd a {
		color: var(--accent);
		font-weight: 600;
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
