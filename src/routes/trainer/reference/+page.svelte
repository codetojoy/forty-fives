<script lang="ts">
	import { base } from '$app/paths';
	import {
		SUITS,
		SUIT_NAMES,
		SUIT_SYMBOLS,
		isRedSuit,
		parseCardId,
		type Suit
	} from '$lib/domain/cards.js';
	import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
	import PlayingCard from '$lib/ui/PlayingCard.svelte';

	const scheme = STANDARD_SCHEME;

	function suitColor(suit: Suit): string {
		return isRedSuit(suit) ? '#c0262d' : '#3d3a35';
	}

	/** Card ids (highest first) for the named scenario, parsed to cards. */
	function order(ids: string[]) {
		return ids.map((id) => parseCardId(id));
	}
</script>

<svelte:head>
	<title>Ranking Reference — Forty-Fives</title>
	<meta
		name="description"
		content="A quick reference for the Forty-Fives card rankings: the order of every suit, both as trump and off-trump."
	/>
</svelte:head>

<main>
	<nav class="top-nav">
		<a class="home-link" href="{base}/trainer">← Back to Trainer</a>
	</nav>
	<header>
		<h1>Ranking Reference</h1>
		<p class="subtitle">The order of the cards, at a glance.</p>
	</header>

	<section aria-labelledby="trump-heading">
		<h2 id="trump-heading">When the suit is trump</h2>
		<p class="section-note">
			Highest to lowest. The <strong>5</strong>, <strong>Jack</strong> and
			<strong>A&#9829;</strong> are always the three highest trumps — and the A&#9829; is trump no
			matter which suit is named.
		</p>
		{#each SUITS as suit (suit)}
			<div class="scenario">
				<h3 style="color: {suitColor(suit)}">
					{SUIT_SYMBOLS[suit]}
					{SUIT_NAMES[suit]} are trump
				</h3>
				<ol class="rank-row" style="--card-width: 44px">
					{#each order(scheme.trumpRankings[suit]) as card (`${card.rank}${card.suit}`)}
						<li><PlayingCard {card} /></li>
					{/each}
				</ol>
			</div>
		{/each}
	</section>

	<section aria-labelledby="plain-heading">
		<h2 id="plain-heading">When the suit is not trump</h2>
		<p class="section-note">
			Highest to lowest. The A&#9829; never appears here (it is always trump), and the
			<strong>A&#9830;</strong> is the lowest diamond.
		</p>
		{#each SUITS as suit (suit)}
			<div class="scenario">
				<h3 style="color: {suitColor(suit)}">
					{SUIT_SYMBOLS[suit]}
					{SUIT_NAMES[suit]} (not trump)
				</h3>
				<ol class="rank-row" style="--card-width: 44px">
					{#each order(scheme.plainRankings[suit]) as card (`${card.rank}${card.suit}`)}
						<li><PlayingCard {card} /></li>
					{/each}
				</ol>
			</div>
		{/each}
	</section>

	<p class="scheme-note">
		Rules: {scheme.name}. Regional variants (PEI, Northern&nbsp;NB, Cape&nbsp;Breton) are coming
		once validated with local players.
	</p>
</main>

<style>
	main {
		max-width: 48rem;
		margin: 0 auto;
		padding: 1.25rem 1rem 3rem;
	}

	.top-nav {
		margin-bottom: 0.5rem;
	}

	.home-link {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 0.5rem;
		color: var(--accent-deep);
		font-size: 1.05rem;
		font-weight: 700;
		text-decoration: none;
	}

	.home-link:hover,
	.home-link:focus-visible {
		text-decoration: underline;
	}

	.home-link:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
		border-radius: 8px;
	}

	header {
		text-align: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--accent);
	}

	h1 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 1.8rem;
		margin: 0;
		color: var(--accent);
	}

	.subtitle {
		margin: 0.25rem 0 0;
		font-family: var(--serif);
		font-style: italic;
		color: var(--muted);
	}

	h2 {
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent-deep);
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--rule);
		margin: 2rem 0 0.75rem;
	}

	.section-note {
		font-size: 1.05rem;
		margin: 0 0 1.25rem;
	}

	.scenario {
		margin-bottom: 1.5rem;
	}

	h3 {
		font-size: 1.2rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
	}

	.rank-row {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0;
		padding: 0;
	}

	.scheme-note {
		margin-top: 2rem;
		font-size: 0.95rem;
		font-style: italic;
		color: var(--muted);
	}
</style>
