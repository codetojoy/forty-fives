<!-- The trump badge with its "peek at the ranking" HelpDisclosure (TODO-036/041),
     shared by /play and /auction so the learner-facing ranking popover has one
     source of truth (TODO-043). -->
<script lang="ts">
	import {
		cardLabel,
		parseCardId,
		isRedSuit,
		SUIT_NAMES,
		SUIT_SYMBOLS,
		type Suit
	} from '$lib/domain/cards.js';
	import type { TrumpScheme } from '$lib/domain/trump-scheme.js';
	import HelpDisclosure from './HelpDisclosure.svelte';

	interface Props {
		/** The hand's trump suit. */
		trumpSuit: Suit;
		/** The scheme whose ranking table is shown. */
		scheme: TrumpScheme;
		/** Which edge the popover aligns to (passed through to HelpDisclosure). */
		align?: 'start' | 'end';
	}

	let { trumpSuit, scheme, align = 'end' }: Props = $props();

	const trumpColor = $derived(isRedSuit(trumpSuit) ? '#c0262d' : '#3d3a35');
	/** The trump suit's full ranking, highest first. */
	const ranking = $derived(scheme.trumpRankings[trumpSuit].map(parseCardId));
</script>

<span class="trump-wrap">
	<span class="trump-badge" style="color: {trumpColor}" aria-label={`Trump: ${SUIT_NAMES[trumpSuit]}`}>
		Trump: {SUIT_SYMBOLS[trumpSuit]}
	</span>
	<HelpDisclosure label="Show the trump ranking" {align}>
		<h2 class="rank-heading" style="color: {trumpColor}">
			Trump ranking — {SUIT_NAMES[trumpSuit]} {SUIT_SYMBOLS[trumpSuit]}
		</h2>
		<p class="rank-note">
			Highest to lowest. The 5, Jack and A♥ are the top three trumps in every suit.
		</p>
		<ol class="rank-list">
			{#each ranking as c (cardLabel(c))}
				<li class="rank-chip" style="color: {isRedSuit(c.suit) ? '#c0262d' : '#3d3a35'}">
					{cardLabel(c)}
				</li>
			{/each}
		</ol>
	</HelpDisclosure>
</span>

<style>
	.trump-wrap {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.trump-badge {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.rank-heading {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 1.15rem;
		margin: 0 0 0.4rem;
	}

	.rank-note {
		margin: 0 0 0.6rem;
		font-size: 0.95rem;
		color: var(--muted);
	}

	.rank-list {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0;
		padding: 0;
	}

	.rank-chip {
		min-width: 2.5rem;
		padding: 0.3rem 0.45rem;
		text-align: center;
		font-size: 1.05rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		background: var(--bg, #fffdf6);
		border: 1px solid var(--rule);
		border-radius: 5px;
	}
</style>
