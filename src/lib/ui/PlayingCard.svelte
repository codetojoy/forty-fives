<script lang="ts">
	import { SUIT_NAMES, SUIT_SYMBOLS, isRedSuit, type Card } from '$lib/domain/cards.js';

	interface Props {
		card: Card;
		/** Caption above the card, e.g. "Led first". */
		caption?: string;
		onpick?: () => void;
		disabled?: boolean;
		/** Outcome highlight once the question is answered. */
		highlight?: 'winner' | 'wrong-pick' | null;
	}

	let { card, caption, onpick, disabled = false, highlight = null }: Props = $props();

	const RANK_NAMES: Record<string, string> = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };

	const cardName = $derived(`${RANK_NAMES[card.rank] ?? card.rank} of ${SUIT_NAMES[card.suit]}`);
	const color = $derived(isRedSuit(card.suit) ? '#c0262d' : '#1a1a1a');
	const symbol = $derived(SUIT_SYMBOLS[card.suit]);
</script>

<div class="slot">
	{#if caption}
		<span class="caption">{caption}</span>
	{/if}
	<button
		type="button"
		class="card"
		class:winner={highlight === 'winner'}
		class:wrong-pick={highlight === 'wrong-pick'}
		onclick={onpick}
		{disabled}
		aria-label={caption ? `${caption}: ${cardName}` : cardName}
	>
		<svg viewBox="0 0 200 280" role="img" aria-hidden="true">
			<rect x="3" y="3" width="194" height="274" rx="14" fill="#fffdf6" stroke="#222" stroke-width="3" />
			<g fill={color} text-anchor="middle">
				<text x="30" y="48" font-size="36" font-weight="700">{card.rank}</text>
				<text x="30" y="86" font-size="34">{symbol}</text>
				<g transform="rotate(180 100 140)">
					<text x="30" y="48" font-size="36" font-weight="700">{card.rank}</text>
					<text x="30" y="86" font-size="34">{symbol}</text>
				</g>
				<text x="100" y="138" font-size="76" font-weight="700">{card.rank}</text>
				<text x="100" y="232" font-size="86">{symbol}</text>
			</g>
		</svg>
	</button>
</div>

<style>
	.slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.caption {
		font-size: 1.1rem;
		font-weight: 600;
		color: #f3efe4;
	}

	.card {
		display: block;
		width: clamp(130px, 38vw, 190px);
		padding: 0;
		background: none;
		border: none;
		border-radius: 14px;
		cursor: pointer;
		transition: transform 120ms ease;
	}

	.card:not(:disabled):hover,
	.card:not(:disabled):focus-visible {
		transform: translateY(-6px);
	}

	.card:focus-visible {
		outline: 5px solid #ffd54a;
		outline-offset: 3px;
	}

	.card:disabled {
		cursor: default;
	}

	.card svg {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 14px;
	}

	.card.winner {
		box-shadow: 0 0 0 6px #2e9e54;
	}

	.card.wrong-pick {
		box-shadow: 0 0 0 6px #d2453a;
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
		.card:not(:disabled):hover,
		.card:not(:disabled):focus-visible {
			transform: none;
		}
	}
</style>
