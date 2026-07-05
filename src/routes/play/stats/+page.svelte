<script lang="ts">
	import { base } from '$app/paths';
	import StatsPage, { pct, type StatGroup } from '$lib/ui/StatsPage.svelte';
	import {
		loadPlayStats,
		savePlayStats,
		emptyPlayStats,
		type PlayStats
	} from '$lib/ui/persistence.js';

	let stats = $state<PlayStats>(loadPlayStats());

	const groups = $derived<StatGroup[]>([
		{
			heading: 'Tricks',
			rows: [
				{ label: 'Total tricks', value: stats.tricksTotal },
				{ label: 'Won by you', value: pct(stats.tricksWonByUser, stats.tricksTotal) }
			]
		},
		{
			heading: 'Games',
			rows: [
				{ label: 'Total games', value: stats.gamesTotal },
				{ label: 'Won by you', value: pct(stats.gamesWonByUser, stats.gamesTotal) }
			]
		}
	]);

	function resetStats() {
		stats = emptyPlayStats();
		savePlayStats(stats);
	}
</script>

<svelte:head>
	<title>Stats — Forty-Fives</title>
	<meta name="description" content="Your lifetime tallies for Forty-Fives." />
</svelte:head>

<StatsPage
	title="Your Stats"
	subtitle="Lifetime totals. Stored only on this device."
	backHref="{base}/play"
	backLabel="Back to Play"
	{groups}
	onreset={resetStats}
/>
