<script lang="ts">
	import { base } from '$app/paths';
	import StatsPage, { pct, type StatGroup } from '$lib/ui/StatsPage.svelte';
	import {
		loadAuctionStats,
		saveAuctionStats,
		emptyAuctionStats,
		type AuctionStats
	} from '$lib/ui/persistence.js';

	let stats = $state<AuctionStats>(loadAuctionStats());

	const groups = $derived<StatGroup[]>([
		{
			heading: 'Tricks',
			rows: [
				{ label: 'Total tricks', value: stats.tricksTotal },
				{ label: 'Won by your team', value: pct(stats.tricksWonByTeam, stats.tricksTotal) }
			]
		},
		{
			heading: 'Games',
			rows: [
				{ label: 'Total games', value: stats.gamesTotal },
				{ label: 'Won by your team', value: pct(stats.gamesWonByTeam, stats.gamesTotal) }
			]
		}
	]);

	function resetStats() {
		stats = emptyAuctionStats();
		saveAuctionStats(stats);
	}
</script>

<svelte:head>
	<title>Auction Stats — Forty-Fives</title>
	<meta name="description" content="Your lifetime tallies for Auction Forty-Fives." />
</svelte:head>

<StatsPage
	title="Auction Stats"
	subtitle="Lifetime totals for your team. Stored only on this device."
	backHref="{base}/auction"
	backLabel="Back to Auction"
	{groups}
	onreset={resetStats}
/>
