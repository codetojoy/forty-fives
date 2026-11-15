<!-- The experimental 3D table (doc/BRAINSTORM-3D.md).

     A thin Svelte shell shared by both games: the page supplies the card
     placements (from the pure layout.ts / auction-layout.ts) and this hands
     them to the three.js scene, which is loaded with a dynamic import so three.js is only downloaded when this
     component is actually shown (and never runs during prerender).

     The canvas is a picture, not the control surface: the page keeps real
     buttons for the hand (visually hidden) so keyboard and screen-reader play
     works, and passes the focused card in so the scene can show focus. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { Card } from '$lib/domain/cards.js';
	import type { Arrangement, CardPlacement } from './layout.js';
	import type { PortraitSpec, TableScene } from './scene.js';

	interface Props {
		/** Where every card belongs right now, for the wide or compact table. */
		layout: (compact: boolean) => CardPlacement[];
		/** The table's fixed furniture, for the wide or compact table. */
		arrangement: (compact: boolean) => Arrangement;
		/** The other players, in the order of the arrangement's portrait spots. */
		portraits: readonly PortraitSpec[];
		/** Index into `portraits` of the player to act, if it is one of them. */
		activePortrait?: number | null;
		/** Text alternative for the picture. */
		label: string;
		onpick: (card: Card) => void;
		/** WebGL (or the 3D code) could not start — the page falls back to 2D. */
		onerror: () => void;
	}

	let { layout, arrangement, portraits, activePortrait = null, label, onpick, onerror }: Props =
		$props();

	let canvas = $state<HTMLCanvasElement>();
	let scene = $state.raw<TableScene | null>(null);
	let width = $state(0);
	let height = $state(0);
	// Narrow (phone-shaped) canvas: use the tighter arrangement so cards draw larger.
	const compact = $derived(width > 0 && height > 0 && width / height < 1.1);
	// Arrangements are compared by identity in the scene, so build each only once.
	const wideArrangement = $derived(arrangement(false));
	const compactArrangement = $derived(arrangement(true));
	const placements = $derived(layout(compact));

	onMount(() => {
		let cancelled = false;
		let created: TableScene | null = null;
		(async () => {
			try {
				const { TableScene } = await import('./scene.js');
				// Card faces are painted with the page's fonts; wait so they are loaded.
				await document.fonts?.ready;
				if (cancelled || !canvas) return;
				created = new TableScene(canvas, {
					onpick: (card) => onpick(card),
					arrangement: compact ? compactArrangement : wideArrangement,
					portraits
				});
				scene = created;
			} catch {
				if (!cancelled) onerror();
			}
		})();
		return () => {
			cancelled = true;
			created?.dispose();
		};
	});

	$effect(() => {
		scene?.setArrangement(compact ? compactArrangement : wideArrangement);
		scene?.setActivePortrait(activePortrait);
		scene?.update(placements);
	});
</script>

<div
	class="table3d"
	role="img"
	aria-label={label}
	bind:clientWidth={width}
	bind:clientHeight={height}
>
	<canvas bind:this={canvas} aria-hidden="true"></canvas>
	{#if !scene}
		<p class="loading" aria-hidden="true">Setting the table…</p>
	{/if}
</div>

<style>
	.table3d {
		position: relative;
		width: 100%;
		/* Squarish on phones, wider on desktop; never taller than most of the screen,
		   so the prompt and buttons below stay in reach. */
		aspect-ratio: 4 / 5;
		max-height: 62vh;
		border-radius: 10px;
		overflow: hidden;
		background: #2a2320;
		box-shadow: 0 1px 4px rgba(61, 58, 53, 0.25);
	}

	@media (min-width: 40rem) {
		.table3d {
			aspect-ratio: 4 / 3;
		}
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
		/* Let the page scroll vertically through the canvas; taps still land. */
		touch-action: pan-y;
	}

	.loading {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		color: #f7f2e7;
		font-family: var(--serif);
		font-style: italic;
	}
</style>
