<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import {
		cardLabel,
		sameCard,
		SUIT_NAMES,
		SUIT_SYMBOLS,
		SUITS,
		isRedSuit,
		type Card,
		type Suit
	} from '$lib/domain/cards.js';
	import {
		startAuction,
		placeBid,
		passBid,
		nameTrump,
		discardKitty,
		drawCards,
		playCard,
		nextHand,
		currentSeat,
		ledCard,
		HUMAN_SEAT,
		type AuctionGameState
	} from '$lib/domain/auction-game-state.js';
	import { teamOf, AUCTION_TARGET, handsPerGame } from '$lib/domain/auction-scoring.js';
	import { legalBids, type BidValue } from '$lib/domain/bidding.js';
	import { analyzePlays } from '$lib/domain/rules-engine.js';
	import { createRng } from '$lib/domain/rng.js';
	import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
	import {
		chooseBid,
		chooseTrump,
		chooseKittyDiscards,
		chooseDraw,
		chooseCardAuction
	} from '$lib/ai/auction-ai.js';
	import PlayingCard from '$lib/ui/PlayingCard.svelte';
	import {
		loadAuctionGame,
		saveAuctionGame,
		loadAuctionConfig,
		loadAuctionStats,
		saveAuctionStats
	} from '$lib/ui/persistence.js';
	import { resolveConfig } from '$lib/domain/auction-config.js';

	const scheme = STANDARD_SCHEME;
	const rng = createRng();
	const AI_DELAY_MS = 750;

	const saved = loadAuctionGame();
	let game = $state<AuctionGameState | null>(saved.game);
	let settings = $state(saved.settings);
	let names = $state(saved.names);

	let selected = $state<Card | null>(null);
	let discardSel = $state<Card[]>([]);
	let quitArmed = $state(false);
	let message = $state('');
	let lastTrick = $state<{ plays: { seat: number; card: Card }[]; winner: number } | null>(null);
	let aiTimer: ReturnType<typeof setTimeout> | undefined;

	function name(seat: number): string {
		return names[seat] ?? `Seat ${seat}`;
	}
	function role(seat: number): string {
		if (seat === HUMAN_SEAT) return 'You';
		return teamOf(seat) === teamOf(HUMAN_SEAT) ? 'Partner' : 'Opponent';
	}

	const humanToBid = $derived(game?.phase.kind === 'bidding' && currentSeat(game) === HUMAN_SEAT);
	const humanToName = $derived(game?.phase.kind === 'naming-trump' && game.biddingSeat === HUMAN_SEAT);
	const humanToDiscard = $derived(
		game?.phase.kind === 'discarding' && game.biddingSeat === HUMAN_SEAT
	);
	const humanToDraw = $derived(
		game?.phase.kind === 'drawing' && currentSeat(game) === HUMAN_SEAT
	);
	/** Cards being chosen: exactly 3 for the kitty discard, 0–5 for the draw. */
	const maxSelect = $derived(humanToDraw ? 5 : 3);
	const humanToPlay = $derived(
		game !== null &&
			game.phase.kind === 'playing' &&
			currentSeat(game) === HUMAN_SEAT &&
			lastTrick === null
	);
	const analysis = $derived(
		game !== null && humanToPlay && game.trumpSuit !== null
			? analyzePlays(game.hands[HUMAN_SEAT], ledCard(game), game.trumpSuit, scheme)
			: null
	);
	const myLegalBids = $derived(
		game?.phase.kind === 'bidding' && humanToBid ? legalBids(game.phase.highBid) : []
	);
	const trumpColor = $derived(
		game?.trumpSuit ? (isRedSuit(game.trumpSuit) ? '#c0262d' : '#3d3a35') : '#3d3a35'
	);
	/** The game is finished once a team has crossed the target and a winner is set. */
	const gameOver = $derived(game?.phase.kind === 'hand-over' && game.phase.gameWinner !== null);

	/**
	 * How the active game finishes (TODO-018). For the in-progress game we read
	 * the snapshotted config; before a game starts, the intro reflects the rule
	 * the next New game will use.
	 */
	const nextGameFinishRule = resolveConfig(loadAuctionConfig()).FINISH_RULE;
	const finishRule = $derived(game?.config.FINISH_RULE ?? nextGameFinishRule);
	/** Short parenthetical shown beside the score. */
	const finishNote = $derived(
		finishRule === 'FOUR_TURNS' ? '(4 turns of the table)' : `(first to ${AUCTION_TARGET})`
	);

	function persist() {
		saveAuctionGame({
			game: game ? ($state.snapshot(game) as AuctionGameState) : null,
			settings: $state.snapshot(settings),
			names: $state.snapshot(names)
		});
	}

	function setGame(next: AuctionGameState | null) {
		game = next;
		persist();
	}

	function newGame() {
		selected = null;
		discardSel = [];
		quitArmed = false;
		lastTrick = null;
		message = '';
		// Snapshot the current rules config into the new game (TODO-011); a game in
		// progress keeps its own rules even if the config page changes later.
		const config = resolveConfig(loadAuctionConfig());
		setGame(startAuction(scheme, rng, undefined, config));
		advance();
	}

	function quitGame() {
		if (!quitArmed) {
			quitArmed = true;
			return;
		}
		clearTimeout(aiTimer);
		quitArmed = false;
		lastTrick = null;
		message = '';
		setGame(null);
	}

	/** Whose decision the table is waiting on (bidder during trump/discard phases). */
	function actor(g: AuctionGameState): number | null {
		if (g.phase.kind === 'naming-trump' || g.phase.kind === 'discarding') return g.biddingSeat;
		return currentSeat(g);
	}

	/** Let the AI act whenever it is a non-human seat's decision. */
	function advance() {
		clearTimeout(aiTimer);
		if (!game || lastTrick) return;
		if (game.phase.kind === 'hand-over') return;
		if (actor(game) === HUMAN_SEAT) return;
		aiTimer = setTimeout(aiAct, AI_DELAY_MS);
	}

	function aiAct() {
		if (!game || lastTrick) return;
		const g = game;
		switch (g.phase.kind) {
			case 'bidding': {
				const seat = currentSeat(g)!;
				if (seat === HUMAN_SEAT) return;
				const d = chooseBid(g, scheme, seat);
				if (d.bid === null) {
					message = `${name(seat)} passed.`;
					setGame(passBid(g, seat));
				} else {
					message = `${name(seat)} bid ${d.bid}.`;
					setGame(placeBid(g, seat, d.bid));
				}
				advance();
				return;
			}
			case 'naming-trump': {
				const seat = g.biddingSeat!;
				if (seat === HUMAN_SEAT) return;
				const suit = chooseTrump(g, scheme, seat);
				message = `${name(seat)} named ${SUIT_NAMES[suit]} ${SUIT_SYMBOLS[suit]} trump.`;
				setGame(nameTrump(g, seat, suit));
				advance();
				return;
			}
			case 'discarding': {
				const seat = g.biddingSeat!;
				if (seat === HUMAN_SEAT) return;
				setGame(discardKitty(g, seat, chooseKittyDiscards(g, scheme, seat)));
				advance();
				return;
			}
			case 'drawing': {
				const seat = currentSeat(g)!;
				if (seat === HUMAN_SEAT) return;
				const discards = chooseDraw(g, scheme, seat);
				message =
					discards.length === 0
						? `${name(seat)} stood pat.`
						: `${name(seat)} drew ${discards.length}.`;
				setGame(drawCards(g, seat, discards));
				advance();
				return;
			}
			case 'playing': {
				const seat = currentSeat(g)!;
				if (seat === HUMAN_SEAT) return;
				applyPlay(seat, chooseCardAuction(g, scheme, seat));
				return;
			}
		}
	}

	function applyPlay(seat: number, card: Card) {
		if (!game) return;
		const tricksBefore = game.completedTricks.length;
		const after = playCard(game, scheme, seat, card);
		selected = null;
		setGame(after);
		if (after.completedTricks.length > tricksBefore) {
			const trick = after.completedTricks[after.completedTricks.length - 1];
			lastTrick = { plays: [...trick.plays], winner: trick.winner };
			recordTrickAndGame(after, trick.winner);
		} else {
			advance();
		}
	}

	/**
	 * Tally stats at the one chokepoint every trick (human or AI) passes through
	 * (TODO-033). A game can only end on a final-trick playCard, so game-completion
	 * is detectable here too. Imperative, so it fires exactly once per transition.
	 */
	function recordTrickAndGame(after: AuctionGameState, trickWinner: number) {
		const myTeam = teamOf(HUMAN_SEAT);
		const stats = loadAuctionStats();
		stats.tricksTotal += 1;
		if (teamOf(trickWinner) === myTeam) stats.tricksWonByTeam += 1;
		if (after.phase.kind === 'hand-over' && after.phase.gameWinner !== null) {
			stats.gamesTotal += 1;
			if (after.phase.gameWinner === myTeam) stats.gamesWonByTeam += 1;
		}
		saveAuctionStats(stats);
	}

	function continueAfterTrick() {
		lastTrick = null;
		message = '';
		advance();
	}

	// --- Human actions ---------------------------------------------------------

	function humanBid(bid: BidValue) {
		if (!game) return;
		message = '';
		setGame(placeBid(game, HUMAN_SEAT, bid));
		advance();
	}
	function humanPass() {
		if (!game) return;
		message = '';
		setGame(passBid(game, HUMAN_SEAT));
		advance();
	}
	function humanName(suit: Suit) {
		if (!game) return;
		message = '';
		setGame(nameTrump(game, HUMAN_SEAT, suit));
		advance();
	}
	function toggleDiscard(card: Card) {
		const i = discardSel.findIndex((c) => sameCard(c, card));
		if (i >= 0) discardSel = discardSel.filter((_, j) => j !== i);
		else if (discardSel.length < maxSelect) discardSel = [...discardSel, card];
	}
	function confirmDiscard() {
		if (!game || discardSel.length !== 3) return;
		setGame(discardKitty(game, HUMAN_SEAT, discardSel));
		discardSel = [];
		message = '';
		advance();
	}
	function confirmDraw() {
		if (!game || !humanToDraw) return;
		setGame(drawCards(game, HUMAN_SEAT, discardSel));
		discardSel = [];
		message = '';
		advance();
	}

	function tapCard(card: Card) {
		if (!game) return;
		quitArmed = false;
		if (humanToDiscard || humanToDraw) {
			toggleDiscard(card);
			return;
		}
		if (!humanToPlay || !analysis) return;
		if (!analysis.legal.some((c) => sameCard(c, card))) {
			message = `You can't play the ${cardLabel(card)}. ${analysis.constraint ?? ''}`;
			return;
		}
		message = '';
		if (settings.confirmPlay && !(selected && sameCard(selected, card))) {
			selected = card;
			return;
		}
		applyPlay(HUMAN_SEAT, card);
	}

	function dealNext() {
		if (!game) return;
		lastTrick = null;
		message = '';
		setGame(nextHand(game, scheme, rng));
		advance();
	}

	function isDimmed(card: Card): boolean {
		if (!settings.highlightLegal || !humanToPlay || !analysis) return false;
		return !analysis.legal.some((c) => sameCard(c, card));
	}
	function isSelected(card: Card): boolean {
		if (humanToDiscard || humanToDraw) return discardSel.some((c) => sameCard(c, card));
		return selected !== null && sameCard(selected, card);
	}

	/** The cards shown in the trick area: the live trick, or the just-finished one. */
	const shownPlays = $derived(lastTrick ? lastTrick.plays : (game?.currentTrick ?? []));

	/** Per-seat bidding status line. */
	function bidStatus(seat: number): string {
		if (!game || game.phase.kind !== 'bidding') return '';
		const p = game.phase;
		if (p.highBidder === seat) return `bid ${p.highBid}`;
		if (p.passed[seat]) return 'passed';
		if (p.turn === seat) return 'thinking…';
		return 'waiting';
	}

	const turnPrompt = $derived.by(() => {
		if (!game || lastTrick) return '';
		switch (game.phase.kind) {
			case 'bidding':
				return humanToBid ? 'Your bid.' : `${name(currentSeat(game)!)} is bidding…`;
			case 'naming-trump':
				return humanToName ? 'Name the trump suit.' : `${name(game.biddingSeat!)} is naming trump…`;
			case 'discarding':
				return humanToDiscard
					? 'Choose three cards to discard.'
					: `${name(game.biddingSeat!)} is taking the kitty…`;
			case 'drawing':
				return humanToDraw
					? 'Choose cards to exchange (or stand pat).'
					: `${name(currentSeat(game)!)} is drawing…`;
			case 'playing':
				if (currentSeat(game) !== HUMAN_SEAT) return `${name(currentSeat(game)!)} is thinking…`;
				if (ledCard(game) === null) return 'Your lead — play any card.';
				return analysis?.constraint ?? 'Your turn — play any card.';
			default:
				return '';
		}
	});

	onMount(() => {
		advance(); // resume a saved game that was mid-AI-turn
		return () => clearTimeout(aiTimer);
	});
</script>

<svelte:head>
	<title>Auction Forty-Fives</title>
	<meta
		name="description"
		content="Play Auction Forty-Fives for four: bid, name trump, take the kitty, and play in partnership to 120."
	/>
</svelte:head>

<main>
	<nav class="top-nav">
		<a class="home-link" href="{base}/">← Home</a>
	</nav>

	{#if game === null}
		<header>
			<h1>Auction Forty-Fives</h1>
			<p class="subtitle">Four players · partners · bid, name trump, take the kitty</p>
		</header>
		<section class="intro">
			<p>
				You and your partner sit opposite two opponents. Everyone gets five cards and a three-card
				kitty waits in the middle. Bid 15, 20, 25 or 30 for the right to name trump and take the
				kitty; make your bid or be set. Tricks are five points each, plus five for the highest
				trump —
				{#if nextGameFinishRule === 'FOUR_TURNS'}
					highest score after 4 turns of the table ({handsPerGame()} hands) wins.
				{:else}
					first team to {AUCTION_TARGET} wins.
				{/if}
			</p>
			<button type="button" class="big-button start-button" onclick={newGame}>Start a game</button>
			<p class="config-link-wrap">
				<a class="config-link" href="{base}/auction/config">Configure →</a>
				<a class="config-link" href="{base}/auction/stats">Stats →</a>
			</p>
		</section>
	{:else}
		<header class="game-header">
			<h1 class="visually-hidden">Auction Forty-Fives</h1>
			<div class="status-bar">
				<span class="score" aria-label="Game score">
					Your team {game.scores[teamOf(HUMAN_SEAT)]} · Opponents {game.scores[1 - teamOf(HUMAN_SEAT)]}
					<span class="target">{finishNote}</span>
				</span>
				{#if game.trumpSuit}
					<span class="trump-badge" style="color: {trumpColor}">
						Trump: {SUIT_SYMBOLS[game.trumpSuit]} {SUIT_NAMES[game.trumpSuit]}
					</span>
				{/if}
			</div>
			<div class="hand-info">
				Hand {finishRule === 'FOUR_TURNS'
					? `${game.handNumber} of ${handsPerGame()}`
					: game.handNumber}
				{#if game.bid}· bid {game.bid} by {name(game.biddingSeat!)}{/if}
				{#if game.phase.kind === 'playing'}
					· trick {Math.min(game.completedTricks.length + 1, 5)} of 5
				{/if}
				· {name(game.dealer)} dealt
			</div>
		</header>

		<div class="table-layout">
			<section class="seats" aria-label="The other players">
			{#each [2, 1, 3] as seat (seat)}
				<div
					class="seat"
					class:north={seat === 2}
					class:east={seat === 1}
					class:west={seat === 3}
					class:active={!lastTrick && actor(game) === seat}
				>
					<span class="seat-name">{name(seat)}</span>
					<span class="seat-role" class:partner={teamOf(seat) === teamOf(HUMAN_SEAT)}>
						{role(seat)}
					</span>
					<div class="seat-cards" style="--card-width: 34px" aria-hidden="true">
						{#each game.hands[seat] as _, i (i)}
							<PlayingCard facedown />
						{/each}
					</div>
					<!-- Always rendered (empty off-bidding) so the seat panel keeps a constant
					     height across phases — see TODO-015 (anti-jump). -->
					<span class="seat-status">{game.phase.kind === 'bidding' ? bidStatus(seat) : ''}</span>
				</div>
			{/each}
		</section>

		<section class="trick-area" aria-label="Current trick">
			{#if shownPlays.length === 0}
				<p class="trick-placeholder">{turnPrompt}</p>
			{:else}
				<div class="trick-cards">
					{#each shownPlays as play (play.seat)}
						<PlayingCard
							card={play.card}
							caption={`${name(play.seat)}${sameCard(play.card, shownPlays[0].card) ? ' led' : ''}`}
							highlight={lastTrick && play.seat === lastTrick.winner ? 'winner' : null}
						/>
					{/each}
				</div>
				{#if !lastTrick}
					<p class="trick-placeholder">{turnPrompt}</p>
				{/if}
			{/if}

			{#if lastTrick}
				{@const won = teamOf(lastTrick.winner) === teamOf(HUMAN_SEAT)}
				<div class="feedback" class:correct={won} class:incorrect={!won}>
					<p class="verdict">
						{lastTrick.winner === HUMAN_SEAT
							? '✓ You take the trick.'
							: `${name(lastTrick.winner)} (${role(lastTrick.winner).toLowerCase()}) takes the trick.`}
					</p>
				</div>
				<button type="button" class="big-button" onclick={continueAfterTrick}>
					{game.phase.kind === 'hand-over' ? 'See the hand score' : 'Next trick'}
				</button>
			{/if}
		</section>

		<div class="message-area" aria-live="polite">
			{#if message}<p class="message">{message}</p>{/if}
			{#if !lastTrick && humanToPlay && analysis && analysis.renegingNow.length > 0}
				<p class="message renege-note">
					Your {analysis.renegingNow.map(cardLabel).join(' and ')} may renege — you are not forced
					to play {analysis.renegingNow.length > 1 ? 'them' : 'it'}.
				</p>
			{/if}
		</div>

		<!-- Persistent slot for the one-at-a-time action panels: it reserves a
		     constant block of space (in the wide table layout) so phase changes
		     don't collapse/expand the bottom of the table — TODO-015 (anti-jump). -->
		<div class="panel-slot">
		{#if humanToBid && !lastTrick}
			<section class="panel" aria-label="Your bid">
				<h2>Your bid</h2>
				<p>
					{#if game.phase.kind === 'bidding' && game.phase.highBid}
						Standing bid: {game.phase.highBid} by {name(game.phase.highBidder!)}.
					{:else}
						No one has bid yet.
					{/if}
				</p>
				<div class="panel-buttons">
					{#each myLegalBids as b (b)}
						<button type="button" class="big-button" onclick={() => humanBid(b)}>Bid {b}</button>
					{/each}
					<button type="button" class="big-button" onclick={humanPass}>Pass</button>
				</div>
			</section>
		{/if}

		{#if humanToName && !lastTrick}
			<section class="panel" aria-label="Name trump">
				<h2>You won the bid — name trump</h2>
				<div class="panel-buttons">
					{#each SUITS as suit (suit)}
						<button
							type="button"
							class="big-button suit-button"
							style="color: {isRedSuit(suit) ? '#c0262d' : '#3d3a35'}"
							onclick={() => humanName(suit)}
						>
							{SUIT_SYMBOLS[suit]} {SUIT_NAMES[suit]}
						</button>
					{/each}
				</div>
			</section>
		{/if}

		{#if humanToDiscard && !lastTrick}
			<section class="panel" aria-label="Discard the kitty">
				<h2>Discard three cards</h2>
				<p>You took the kitty. Tap three cards below to discard ({discardSel.length}/3 chosen).</p>
				<div class="panel-buttons">
					<button
						type="button"
						class="big-button"
						disabled={discardSel.length !== 3}
						onclick={confirmDiscard}
					>
						Discard these {discardSel.length === 3 ? 'three' : `(${discardSel.length}/3)`}
					</button>
				</div>
			</section>
		{/if}

		{#if humanToDraw && !lastTrick}
			<section class="panel" aria-label="Exchange cards">
				<h2>Exchange cards</h2>
				<div class="panel-buttons">
					<button type="button" class="big-button" onclick={confirmDraw}>
						{discardSel.length === 0 ? 'Stand pat' : `Exchange ${discardSel.length}`}
					</button>
				</div>
			</section>
		{/if}

		{#if game.phase.kind === 'hand-over' && !lastTrick}
			{@const hs = game.phase.handScore}
			{@const myTeam = teamOf(HUMAN_SEAT)}
			<section class="panel" aria-label="Hand result">
				<h2>Hand {game.handNumber} complete</h2>
				<ul class="hand-score">
					<li>Your team took {hs.teamGross[myTeam]} points.</li>
					<li>Opponents took {hs.teamGross[1 - myTeam]} points.</li>
					<li class="bonus-line">
						{#if hs.bonusCard}
							Highest trump in play: {cardLabel(hs.bonusCard)} (+{scheme.scoring.highestTrumpBonus}
							to {name(hs.bonusSeat!)})
						{:else}
							No trump was played — no bonus this hand.
						{/if}
					</li>
					<li class="bonus-line">
						{name(game.biddingSeat!)} bid {game.bid} —
						{hs.bidMade
							? 'made it.'
							: `came up short, so ${teamOf(game.biddingSeat!) === myTeam ? 'your team loses' : 'the opponents lose'} ${game.bid}.`}
					</li>
				</ul>
				<p class="totals">
					Totals — Your team {game.scores[myTeam]} · Opponents {game.scores[1 - myTeam]}
				</p>
				{#if game.phase.gameWinner !== null}
					<p class="game-result" class:won={game.phase.gameWinner === myTeam}>
						{game.phase.gameWinner === myTeam
							? '🎉 Your team wins the game!'
							: 'The opponents win the game.'}
					</p>
					<button type="button" class="big-button" onclick={newGame}>New game</button>
				{:else}
					<button type="button" class="big-button" onclick={dealNext}>Deal the next hand</button>
				{/if}
			</section>
		{/if}
		</div>

		<section class="your-hand" aria-label="Your hand">
			{#if game.hands[HUMAN_SEAT].length > 0}
				<h2 class="hand-heading">
					Your hand{humanToDiscard ? ' — tap three to discard' : ''}{humanToDraw
						? ' — tap to exchange'
						: ''}
					{#if game.trumpSuit}
						<span class="hand-trump" style="color: {trumpColor}">
							· {SUIT_SYMBOLS[game.trumpSuit]} {SUIT_NAMES[game.trumpSuit]} trump
						</span>
					{/if}
				</h2>
				<div class="hand-cards" style="--card-width: clamp(72px, 16vw, 104px)">
					{#each game.hands[HUMAN_SEAT] as card (cardLabel(card))}
						<PlayingCard
							{card}
							onpick={() => tapCard(card)}
							disabled={!humanToPlay && !humanToDiscard && !humanToDraw}
							selected={isSelected(card)}
							dimmed={isDimmed(card)}
						/>
					{/each}
				</div>
				{#if settings.confirmPlay && humanToPlay}
					<p class="confirm-hint">
						{selected
							? `Tap the ${cardLabel(selected)} again to play it.`
							: 'Tap a card to raise it, tap again to play.'}
					</p>
				{/if}
			{/if}
		</section>
		</div>

		{#if !gameOver}
			<section class="game-footer">
				<button type="button" class="small-button quit" onclick={quitGame}>
					{quitArmed ? 'Tap again to abandon the game' : 'Abandon game'}
				</button>
			</section>
		{/if}
	{/if}
</main>

<style>
	main {
		max-width: 44rem;
		margin: 0 auto;
		padding: 1rem 1rem 1.5rem;
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
		margin-bottom: 1rem;
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

	h2 {
		font-size: 1.25rem;
		margin: 0 0 0.5rem;
	}

	.subtitle {
		margin: 0.25rem 0 0;
		font-family: var(--serif);
		font-style: italic;
		color: var(--muted);
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	.intro {
		font-size: 1.1rem;
	}

	.big-button {
		min-height: 60px;
		padding: 0.75rem 1.25rem;
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

	.big-button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.suit-button {
		font-size: 1.3rem;
	}

	.start-button {
		width: 100%;
		margin-top: 1rem;
	}

	.config-link-wrap {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem 1.5rem;
		margin: 1rem 0 0;
	}

	.config-link {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 0.5rem;
		color: var(--accent-deep);
		font-weight: 700;
		text-decoration: none;
	}

	.config-link:hover,
	.config-link:focus-visible {
		text-decoration: underline;
	}

	.config-link:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
		border-radius: 8px;
	}

	.game-header {
		text-align: left;
		margin-bottom: 0.5rem;
		padding-bottom: 0.4rem;
		border-bottom: 2px solid var(--accent);
	}

	.status-bar {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
	}

	.score {
		font-size: 1.2rem;
		font-weight: 700;
	}

	.target {
		font-weight: 400;
		font-size: 0.95rem;
		color: var(--muted);
	}

	.trump-badge {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.hand-info {
		font-size: 0.98rem;
		font-style: italic;
		color: var(--muted);
		margin-top: 0.2rem;
	}

	.seats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.seat {
		flex: 1 1 8rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--rule);
		border-radius: 6px;
		background: var(--panel);
	}

	.seat.active {
		border-color: var(--accent);
		box-shadow: 0 0 0 2px var(--accent);
	}

	.seat-name {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--accent-deep);
	}

	.seat-role {
		font-size: 0.85rem;
		font-style: italic;
		color: var(--muted);
	}

	.seat-role.partner {
		color: var(--accent);
		font-weight: 700;
		font-style: normal;
	}

	.seat-cards {
		display: flex;
		gap: 0.15rem;
		margin-top: 0.2rem;
		/* Reserve a row's height so a seat doesn't shrink as its face-down cards
		   are played out (5 → 0) — TODO-015 (anti-jump). */
		min-height: 48px;
	}

	.seat-status {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--ink);
		/* Always reserved (the span renders empty off-bidding) so the seat keeps a
		   constant height across phases — TODO-015 (anti-jump). */
		min-height: 1.25rem;
	}

	.trick-area {
		min-height: 11rem;
		margin: 1rem 0;
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid var(--rule);
		background: rgba(61, 58, 53, 0.04);
		text-align: center;
	}

	.trick-cards {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: clamp(0.75rem, 4vw, 1.75rem);
		--card-width: clamp(64px, 18vw, 96px);
	}

	.trick-placeholder {
		font-size: 1.15rem;
		color: var(--ink);
		margin: 0.75rem 0;
	}

	.feedback {
		border-radius: 6px;
		padding: 0.9rem 1.1rem;
		margin: 1rem 0;
		background: var(--panel);
		color: var(--ink);
		border: 1px solid var(--rule);
		border-left: 10px solid;
		text-align: left;
	}

	.feedback.correct {
		border-left-color: var(--good);
	}

	.feedback.incorrect {
		border-left-color: var(--bad);
	}

	.verdict {
		font-size: 1.2rem;
		font-weight: 700;
		margin: 0;
	}

	.message-area {
		min-height: 1.5rem;
	}

	.message {
		margin: 0.4rem 0;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--accent-deep);
	}

	.renege-note {
		color: var(--muted);
		font-weight: 400;
		font-style: italic;
	}

	.panel {
		border-radius: 6px;
		border: 1px solid var(--rule);
		border-left: 4px solid var(--accent);
		background: var(--panel);
		color: var(--ink);
		padding: 1rem 1.25rem;
		margin: 1rem 0;
		box-shadow: 0 1px 3px rgba(61, 58, 53, 0.08);
	}

	.panel-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.hand-score {
		margin: 0.5rem 0;
		padding-left: 1.2rem;
		font-size: 1.08rem;
	}

	.hand-score li {
		margin-bottom: 0.3rem;
	}

	.bonus-line {
		list-style: none;
		margin-left: -1.2rem;
		color: var(--muted);
	}

	.totals {
		font-size: 1.15rem;
		font-weight: 700;
	}

	.game-result {
		font-size: 1.4rem;
		font-weight: 700;
		margin: 0.75rem 0;
	}

	.game-result.won {
		color: var(--good);
	}

	.your-hand {
		margin-top: 0.5rem;
	}

	.hand-heading {
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent-deep);
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--rule);
		margin-bottom: 0.75rem;
	}

	/* Trump reminder folded into the hand heading (TODO-029): keeps "what's trump"
	   beside the cards you act on, so mobile players needn't scroll to the header.
	   Colour rides on the suit name + symbol, never alone (SPEC §7). */
	.hand-trump {
		white-space: nowrap;
	}

	.hand-cards {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.confirm-hint {
		font-size: 0.95rem;
		font-style: italic;
		color: var(--muted);
		margin: 0.6rem 0 0;
	}

	.game-footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-top: 0.75rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--rule);
	}

	.small-button {
		min-height: 48px;
		padding: 0.5rem 1rem;
		font-size: 1rem;
		border: 1px solid var(--muted);
		border-radius: 6px;
		background: transparent;
		color: var(--ink);
		cursor: pointer;
	}

	.small-button:hover {
		border-color: var(--accent);
		color: var(--accent-deep);
	}

	.small-button:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
	}

	/* Larger than mobile: seat the four players around the central trick area —
	   user at south, partner at north, opponents at east/west (TODO-014). This is
	   a CSS-only re-layout via grid-template-areas; the DOM order is unchanged, so
	   keyboard tab order and screen-reader flow stay exactly as on mobile. */
	@media (min-width: 48rem) {
		main {
			max-width: 58rem;
		}

		.table-layout {
			display: grid;
			grid-template-columns: minmax(7rem, 1fr) minmax(0, 2fr) minmax(7rem, 1fr);
			grid-template-areas:
				'.      north  .'
				'west   center east'
				'south  south  south'
				'msg    msg    msg'
				'panels panels panels';
			column-gap: 1rem;
			row-gap: 0.5rem;
			align-items: center;
		}

		/* Let the three seat panels become direct grid items of .table-layout so
		   each can be placed at its own compass point. */
		.seats {
			display: contents;
		}

		/* Reserve a constant height for each seat so the side/partner panels never
		   resize between phases (bid-status line, cards played out) — TODO-015. */
		.seat {
			justify-self: center;
			width: 100%;
			max-width: 13rem;
			min-height: 9.5rem;
		}

		.seat.north {
			grid-area: north;
		}
		.seat.east {
			grid-area: east;
		}
		.seat.west {
			grid-area: west;
		}

		/* Fixed height sized to the worst case (four played cards + the trick-winner
		   feedback + the Next-trick button), so finishing a trick fills already-
		   reserved space instead of growing the cell and re-centering the cross.
		   The trick cards are pinned to a single row (below) to keep this sane. */
		.trick-area {
			grid-area: center;
			margin: 0;
			height: 18rem;
			display: flex;
			flex-direction: column;
			justify-content: center;
		}

		.trick-cards {
			flex-wrap: nowrap;
			gap: 0.6rem;
			--card-width: 64px;
		}

		.message-area {
			grid-area: msg;
		}

		/* Reserve the South row so it doesn't collapse when the hand empties at the
		   end of a hand (the section stays mounted but renders nothing then). */
		.your-hand {
			grid-area: south;
			min-height: 12rem;
		}

		/* The one-at-a-time action panels share a single slot. It sits below the
		   cross (south/msg/panels rows), so its growth moves only the footer, not
		   the table — hence it is left to size naturally. */
		.panel-slot {
			grid-area: panels;
		}
	}
</style>
