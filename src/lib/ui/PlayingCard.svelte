<script lang="ts">
	import { SUIT_NAMES, SUIT_SYMBOLS, isRedSuit, type Card } from '$lib/domain/cards.js';

	interface Props {
		/** Omitted only for face-down cards. */
		card?: Card;
		/** Render the card back instead of the face. */
		facedown?: boolean;
		/** Caption above the card, e.g. "Led first". */
		caption?: string;
		onpick?: () => void;
		disabled?: boolean;
		/** Raised + ringed, for the confirm-before-playing first tap. */
		selected?: boolean;
		/** Faded, for cards that are not legal to play right now. */
		dimmed?: boolean;
		/** Outcome highlight once the trick/question is resolved. */
		highlight?: 'winner' | 'wrong-pick' | null;
	}

	let {
		card,
		facedown = false,
		caption,
		onpick,
		disabled = false,
		selected = false,
		dimmed = false,
		highlight = null
	}: Props = $props();

	const uid = $props.id();

	const RANK_NAMES: Record<string, string> = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };

	const cardName = $derived(
		facedown || !card
			? 'Face-down card'
			: `${RANK_NAMES[card.rank] ?? card.rank} of ${SUIT_NAMES[card.suit]}`
	);
	const ariaLabel = $derived(caption ? `${caption}: ${cardName}` : cardName);
	const color = $derived(card && isRedSuit(card.suit) ? '#c0262d' : '#1a1a1a');
</script>

{#snippet face()}
	<svg viewBox="0 0 200 280" role="img" aria-hidden="true">
		{#if facedown || !card}
			<rect x="3" y="3" width="194" height="274" rx="14" fill="#fffdf6" stroke="#222" stroke-width="3" />
			<defs>
				<pattern id="back-{uid}" width="16" height="16" patternUnits="userSpaceOnUse">
					<rect width="16" height="16" fill="#9c4632" />
					<path d="M0 8 H16 M8 0 V16" stroke="#b0503a" stroke-width="2" />
				</pattern>
			</defs>
			<rect x="14" y="14" width="172" height="252" rx="8" fill="url(#back-{uid})" />
			<circle cx="100" cy="140" r="42" fill="#9c4632" stroke="#f7f2e7" stroke-width="3" />
			<text x="100" y="156" font-size="44" font-weight="700" fill="#f7f2e7" text-anchor="middle">45</text>
		{:else}
			<rect x="3" y="3" width="194" height="274" rx="14" fill="#fffdf6" stroke="#222" stroke-width="3" />
			<g fill={color} text-anchor="middle">
				<text x="30" y="48" font-size="36" font-weight="700">{card.rank}</text>
				<text x="30" y="86" font-size="34">{SUIT_SYMBOLS[card.suit]}</text>
				<g transform="rotate(180 100 140)">
					<text x="30" y="48" font-size="36" font-weight="700">{card.rank}</text>
					<text x="30" y="86" font-size="34">{SUIT_SYMBOLS[card.suit]}</text>
				</g>
				<text x="100" y="138" font-size="76" font-weight="700">{card.rank}</text>
				<text x="100" y="232" font-size="86">{SUIT_SYMBOLS[card.suit]}</text>
			</g>
		{/if}
	</svg>
{/snippet}

<div class="slot">
	{#if caption}
		<span class="caption">{caption}</span>
	{/if}
	{#if onpick}
		<button
			type="button"
			class="card"
			class:winner={highlight === 'winner'}
			class:wrong-pick={highlight === 'wrong-pick'}
			class:selected
			class:dimmed
			onclick={onpick}
			{disabled}
			aria-label={ariaLabel}
			aria-pressed={selected}
		>
			{@render face()}
		</button>
	{:else}
		<div
			class="card static"
			class:winner={highlight === 'winner'}
			class:wrong-pick={highlight === 'wrong-pick'}
			class:dimmed
			role="img"
			aria-label={ariaLabel}
		>
			{@render face()}
		</div>
	{/if}
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
		font-weight: 700;
		color: var(--muted);
	}

	.card {
		display: block;
		width: var(--card-width, clamp(130px, 38vw, 190px));
		padding: 0;
		background: none;
		border: none;
		border-radius: 14px;
		transition: transform 120ms ease;
	}

	button.card {
		cursor: pointer;
	}

	button.card:not(:disabled):hover,
	button.card:not(:disabled):focus-visible {
		transform: translateY(-6px);
	}

	button.card:focus-visible {
		outline: 5px solid var(--focus);
		outline-offset: 3px;
	}

	button.card:disabled {
		cursor: default;
	}

	.card svg {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 14px;
	}

	.card.winner {
		box-shadow: 0 0 0 6px var(--good);
	}

	.card.wrong-pick {
		box-shadow: 0 0 0 6px var(--bad);
	}

	.card.selected {
		transform: translateY(-10px);
		box-shadow: 0 0 0 5px var(--accent);
	}

	button.card.selected:not(:disabled):hover,
	button.card.selected:not(:disabled):focus-visible {
		transform: translateY(-10px);
	}

	.card.dimmed {
		opacity: 0.45;
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
		button.card:not(:disabled):hover,
		button.card:not(:disabled):focus-visible,
		.card.selected {
			transform: none;
		}
	}
</style>
