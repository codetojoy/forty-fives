<script lang="ts">
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>Forty-Fives</title>
	<meta
		name="description"
		content="Play and learn Forty-Fives, the Maritime Canadian trick-taking card game. Free, open source, works offline."
	/>
</svelte:head>

<main>
	<header>
		<h1>Forty-Fives</h1>
		<p class="subtitle">For Maritimers!</p>
	</header>

	<nav class="modes" aria-label="Choose a mode">
		<a class="mode" href="{base}/play">
			<span class="mode-icon" aria-hidden="true">🂠</span>
			<span class="mode-text">
				<span class="mode-title">Play Forty-Fives</span>
				<span class="mode-desc">
					Head-to-head against a friendly opponent.
				</span>
			</span>
		</a>
		<a class="mode" href="{base}/auction">
			<span class="mode-icon" aria-hidden="true">🃏</span>
			<span class="mode-text">
				<span class="mode-title">Play Auction</span>
				<span class="mode-desc">
					Auction Forty-Fives for four: you and a partner against two opponents.
				</span>
			</span>
		</a>
		<a class="mode" href="{base}/trainer">
			<span class="mode-icon" aria-hidden="true">🎓</span>
			<span class="mode-text">
				<span class="mode-title">Learn Ranking</span>
				<span class="mode-desc">
					Practice the tricky trump rankings, two cards at a time, with an explanation for every
					answer.
				</span>
			</span>
		</a>
	</nav>
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

	.modes {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Big, obvious tap targets (SPEC §7). */
	.mode {
		display: flex;
		align-items: center;
		gap: 1rem;
		min-height: 72px;
		padding: 1rem 1.25rem;
		border: 1px solid var(--rule);
		border-left: 4px solid var(--accent);
		border-radius: 6px;
		background: var(--panel);
		color: var(--ink);
		text-decoration: none;
		box-shadow: 0 1px 3px rgba(61, 58, 53, 0.08);
	}

	.mode:hover {
		border-color: var(--accent);
	}

	.mode:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
	}

	.mode-icon {
		font-size: 2.4rem;
		line-height: 1;
		color: var(--accent);
	}

	.mode-text {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.mode-title {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent-deep);
	}

	.mode-desc {
		font-size: 1.02rem;
		line-height: 1.4;
	}
</style>
