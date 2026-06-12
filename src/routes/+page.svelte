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
		<p class="subtitle">The Maritime trick-taking card game — learn it, then play it.</p>
	</header>

	<nav class="modes" aria-label="Choose a mode">
		<a class="mode" href="/play">
			<span class="mode-icon" aria-hidden="true">🂠</span>
			<span class="mode-text">
				<span class="mode-title">Play Forty-Fives</span>
				<span class="mode-desc">
					Head-to-head against a friendly opponent. Five tricks a hand, five points a trick,
					first to 45 wins.
				</span>
			</span>
		</a>
		<a class="mode" href="/trainer">
			<span class="mode-icon" aria-hidden="true">🎓</span>
			<span class="mode-text">
				<span class="mode-title">Ranking Trainer</span>
				<span class="mode-desc">
					Learn the famous trump rankings two cards at a time, with an explanation for every
					answer.
				</span>
			</span>
		</a>
	</nav>

	<p class="note">
		Free and open source. No accounts, no ads, no tracking — and it keeps working offline once
		you've opened it.
	</p>
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
	}

	h1 {
		font-size: 2.2rem;
		margin: 0;
	}

	.subtitle {
		margin: 0.4rem 0 0;
		font-size: 1.15rem;
		color: #cfe3d6;
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
		border: 2px solid #0d3520;
		border-radius: 14px;
		background: #f3efe4;
		color: #14311f;
		text-decoration: none;
	}

	.mode:hover {
		background: #ffffff;
	}

	.mode:focus-visible {
		outline: 4px solid #ffd54a;
		outline-offset: 2px;
	}

	.mode-icon {
		font-size: 2.4rem;
		line-height: 1;
	}

	.mode-text {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.mode-title {
		font-size: 1.35rem;
		font-weight: 700;
	}

	.mode-desc {
		font-size: 1.02rem;
		line-height: 1.4;
	}

	.note {
		margin-top: 2rem;
		text-align: center;
		font-size: 0.95rem;
		color: #cfe3d6;
	}
</style>
