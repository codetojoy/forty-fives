<script lang="ts">
	import { base } from '$app/paths';
	import {
		loadPlayStats,
		savePlayStats,
		emptyPlayStats,
		type PlayStats
	} from '$lib/ui/persistence.js';

	let stats = $state<PlayStats>(loadPlayStats());

	/** A whole-number percentage, or an em dash when there's nothing to divide. */
	function pct(part: number, total: number): string {
		return total === 0 ? '—' : `${Math.round((100 * part) / total)}%`;
	}

	let resetArmed = $state(false);

	function resetStats() {
		if (!resetArmed) {
			resetArmed = true;
			return;
		}
		stats = emptyPlayStats();
		savePlayStats(stats);
		resetArmed = false;
	}
</script>

<svelte:head>
	<title>Stats — Forty-Fives</title>
	<meta name="description" content="Your lifetime tallies for Forty-Fives." />
</svelte:head>

<main>
	<nav class="top-nav">
		<a class="home-link" href="{base}/play">← Back to Play</a>
	</nav>

	<header>
		<h1>Your Stats</h1>
		<p class="subtitle">Lifetime totals. Stored only on this device.</p>
	</header>

	<section class="stats" aria-label="Your statistics">
		<h2 class="group-heading">Tricks</h2>
		<dl class="stat-grid">
			<div class="stat">
				<dt>Total tricks</dt>
				<dd>{stats.tricksTotal}</dd>
			</div>
			<div class="stat">
				<dt>Won by you</dt>
				<dd>{pct(stats.tricksWonByUser, stats.tricksTotal)}</dd>
			</div>
		</dl>

		<h2 class="group-heading">Games</h2>
		<dl class="stat-grid">
			<div class="stat">
				<dt>Total games</dt>
				<dd>{stats.gamesTotal}</dd>
			</div>
			<div class="stat">
				<dt>Won by you</dt>
				<dd>{pct(stats.gamesWonByUser, stats.gamesTotal)}</dd>
			</div>
		</dl>
	</section>

	<div class="actions">
		<button type="button" class="big-button" onclick={resetStats}>
			{resetArmed ? 'Tap again to reset' : 'Reset stats'}
		</button>
	</div>
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1rem 1rem 3rem;
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

	.big-button {
		min-height: 56px;
		padding: 0.75rem 2rem;
		font-size: 1.2rem;
		font-weight: 700;
		border: 1px solid var(--rule);
		border-radius: 6px;
		background: var(--panel);
		color: var(--ink);
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(61, 58, 53, 0.08);
	}

	.big-button:hover {
		border-color: var(--accent);
	}

	.big-button:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
	}
</style>
