<!-- The stats-page chrome shared by /play/stats and /auction/stats (TODO-045):
     back link, header, grouped stat rows, and the armed reset button. The
     routes keep their own <svelte:head>, persistence wiring, and reset logic,
     and describe everything else as data. -->
<script module lang="ts">
	export interface StatRow {
		label: string;
		value: string | number;
	}

	export interface StatGroup {
		heading: string;
		rows: StatRow[];
	}

	/** A whole-number percentage, or an em dash when there's nothing to divide. */
	export function pct(part: number, total: number): string {
		return total === 0 ? '—' : `${Math.round((100 * part) / total)}%`;
	}
</script>

<script lang="ts">
	import ArmedButton from './ArmedButton.svelte';
	import BackLink from './BackLink.svelte';

	interface Props {
		title: string;
		subtitle: string;
		/** Back-link destination, already prefixed with `base`. */
		backHref: string;
		/** Back-link text without the arrow (e.g. "Back to Play"). */
		backLabel: string;
		groups: StatGroup[];
		/** Called when the reset button's two-tap confirm fires. */
		onreset: () => void;
	}

	let { title, subtitle, backHref, backLabel, groups, onreset }: Props = $props();
</script>

<main>
	<BackLink href={backHref} label={backLabel} />

	<header>
		<h1>{title}</h1>
		<p class="subtitle">{subtitle}</p>
	</header>

	<section class="stats" aria-label="Your statistics">
		{#each groups as group (group.heading)}
			<h2 class="group-heading">{group.heading}</h2>
			<dl class="stat-grid">
				{#each group.rows as row (row.label)}
					<div class="stat">
						<dt>{row.label}</dt>
						<dd>{row.value}</dd>
					</div>
				{/each}
			</dl>
		{/each}
	</section>

	<div class="actions">
		<ArmedButton
			variant="big"
			label="Reset stats"
			armedLabel="Tap again to reset your statistics"
			onconfirm={onreset}
		/>
	</div>
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1rem 1rem 3rem;
	}

	header {
		margin-bottom: 1.25rem;
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

	.stats {
		border: 1px solid var(--rule);
		border-radius: 6px;
		margin: 0 0 1.25rem;
		padding: 0.75rem 1rem 1rem;
		background: var(--panel);
	}

	.group-heading {
		margin: 1rem 0 0.5rem;
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent-deep);
	}

	.group-heading:first-child {
		margin-top: 0;
	}

	.stat-grid {
		margin: 0;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0;
	}

	.stat {
		display: contents;
	}

	.stat dt,
	.stat dd {
		min-height: 56px;
		display: flex;
		align-items: center;
		padding: 0.5rem 0;
		border-top: 1px solid var(--rule);
	}

	.stat:first-child dt,
	.stat:first-child dd {
		border-top: none;
	}

	.stat dt {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.stat dd {
		margin: 0;
		justify-content: flex-end;
		font-size: 1.25rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--accent-deep);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
</style>
