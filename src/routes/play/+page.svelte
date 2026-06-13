<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import {
		cardLabel,
		sameCard,
		SUIT_NAMES,
		SUIT_SYMBOLS,
		isRedSuit,
		type Card
	} from '$lib/domain/cards.js';
	import {
		currentSeat,
		declineRob,
		ledCard,
		nextHand,
		playCard,
		rob,
		startGame,
		type CompletedTrick,
		type GameState
	} from '$lib/domain/game-state.js';
	import { analyzePlays } from '$lib/domain/rules-engine.js';
	import { createRng } from '$lib/domain/rng.js';
	import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
	import { explainTrick } from '$lib/domain/trick.js';
	import { chooseCard, chooseRob } from '$lib/ai/heuristic.js';
	import PlayingCard from '$lib/ui/PlayingCard.svelte';
	import { loadGame, saveGame } from '$lib/ui/persistence.js';

	const scheme = STANDARD_SCHEME;
	const rng = createRng();
	const HUMAN = 0;
	const AI = 1;
	const AI_NAMES = ['Margaret', 'Stewart'];
	const AI_DELAY_MS = 800;

	const saved = loadGame();
	let game = $state<GameState | null>(saved.game);
	let settings = $state(saved.settings);
	let opponentName = $state(saved.opponentName);

	let selected = $state<Card | null>(null);
	let robPicking = $state(false);
	let quitArmed = $state(false);
	let message = $state('');
	let lastTrick = $state<{ trick: CompletedTrick; explanation: string } | null>(null);
	let aiTimer: ReturnType<typeof setTimeout> | undefined;

	const humanTurn = $derived(
		game !== null &&
			game.phase.kind === 'playing' &&
			currentSeat(game) === HUMAN &&
			lastTrick === null
	);
	const aiTurn = $derived(
		game !== null &&
			lastTrick === null &&
			((game.phase.kind === 'playing' && currentSeat(game) === AI) ||
				(game.phase.kind === 'robbing' && game.phase.seat === AI))
	);
	const analysis = $derived(
		game !== null && humanTurn
			? analyzePlays(game.hands[HUMAN], ledCard(game), game.trumpSuit, scheme)
			: null
	);
	const humanRobbing = $derived(
		game !== null && game.phase.kind === 'robbing' && game.phase.seat === HUMAN && !lastTrick
	);
	const trumpColor = $derived(game && isRedSuit(game.trumpSuit) ? '#c0262d' : '#3d3a35');

	function seatName(seat: number): string {
		return seat === HUMAN ? 'You' : opponentName;
	}

	function persist() {
		saveGame({
			game: game ? ($state.snapshot(game) as GameState) : null,
			settings: $state.snapshot(settings),
			opponentName
		});
	}

	function setGame(next: GameState | null) {
		game = next;
		persist();
	}

	function newGame() {
		opponentName = rng.pick(AI_NAMES);
		selected = null;
		robPicking = false;
		quitArmed = false;
		lastTrick = null;
		message = '';
		setGame(startGame(scheme, rng));
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

	/** Let the AI act whenever the state says it is its decision. */
	function advance() {
		if (!game || lastTrick) return;

		if (game.phase.kind === 'robbing' && game.phase.seat === AI) {
			clearTimeout(aiTimer);
			aiTimer = setTimeout(() => {
				if (!game || game.phase.kind !== 'robbing') return;
				const decision = chooseRob(game, scheme);
				message = decision.rob
					? `${opponentName} robbed the turn-up (took the ${cardLabel(game.turnUp)}).`
					: `${opponentName} declined to rob.`;
				setGame(decision.rob ? rob(game, decision.discard!) : declineRob(game));
				advance();
			}, AI_DELAY_MS);
			return;
		}

		if (game.phase.kind === 'playing' && currentSeat(game) === AI) {
			clearTimeout(aiTimer);
			aiTimer = setTimeout(() => {
				if (!game || game.phase.kind !== 'playing' || currentSeat(game) !== AI) return;
				applyPlay(AI, chooseCard(game, scheme, AI));
			}, AI_DELAY_MS);
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
			lastTrick = {
				trick,
				explanation: explainTrick(
					trick.plays[0].card,
					trick.plays[1].card,
					after.trumpSuit,
					scheme
				)
			};
		} else {
			advance();
		}
	}

	function continueAfterTrick() {
		lastTrick = null;
		message = '';
		advance();
	}

	function tapCard(card: Card) {
		if (!game) return;
		quitArmed = false;
		if (robPicking) {
			const turnUpLabel = cardLabel(game.turnUp);
			setGame(rob(game, card));
			robPicking = false;
			message = `You took the ${turnUpLabel} and gave up the ${cardLabel(card)}.`;
			advance();
			return;
		}
		if (!humanTurn || !analysis) return;
		if (!analysis.legal.some((c) => sameCard(c, card))) {
			message = `You can't play the ${cardLabel(card)}. ${analysis.constraint ?? ''}`;
			return;
		}
		message = '';
		if (settings.confirmPlay && !(selected && sameCard(selected, card))) {
			selected = card;
			return;
		}
		applyPlay(HUMAN, card);
	}

	function robTurnUp() {
		robPicking = true;
		message = 'Tap the card you want to give up.';
	}

	function keepHand() {
		if (!game) return;
		robPicking = false;
		message = '';
		setGame(declineRob(game));
		advance();
	}

	function dealNext() {
		if (!game) return;
		lastTrick = null;
		message = '';
		setGame(nextHand(game, scheme, rng));
		advance();
	}

	function isDimmed(card: Card): boolean {
		if (!settings.highlightLegal || !humanTurn || !analysis) return false;
		return !analysis.legal.some((c) => sameCard(c, card));
	}

	/** The two cards shown in the trick area: the live trick, or the just-finished one. */
	const shownPlays = $derived(
		lastTrick ? lastTrick.trick.plays : (game?.currentTrick ?? [])
	);

	const turnPrompt = $derived.by(() => {
		if (!game || lastTrick) return '';
		if (game.phase.kind === 'robbing') {
			return game.phase.seat === AI ? `${opponentName} is deciding whether to rob…` : '';
		}
		if (game.phase.kind !== 'playing') return '';
		if (currentSeat(game) === AI) return `${opponentName} is thinking…`;
		if (ledCard(game) === null) return 'Your lead — play any card.';
		return analysis?.constraint ?? 'Your turn — play any card.';
	});

	onMount(() => {
		advance(); // resume a saved game that was mid-AI-turn
		return () => clearTimeout(aiTimer);
	});
</script>

<svelte:head>
	<title>Play Forty-Fives</title>
	<meta
		name="description"
		content="Play Forty-Fives head-to-head: five tricks a hand, five points a trick, first to 45 wins."
	/>
</svelte:head>

<main>
	<nav class="top-nav">
		<a class="home-link" href="{base}/">← Home</a>
	</nav>

	{#if game === null}
		<header>
			<h1>Play Forty-Fives</h1>
			<p class="subtitle">Five tricks a hand · five points a trick · first to 45 wins</p>
		</header>
		<section class="intro">
			<p>
				You and your opponent each get five cards; the next card is turned up and its suit is
				trump for the hand. Win tricks for 5 points each — and 5 more if you take the highest
				trump in play. Renege rules are enforced, with explanations when a play isn't allowed.
			</p>
			<button type="button" class="big-button start-button" onclick={newGame}>
				Start a game
			</button>
		</section>
	{:else}
		<header class="game-header">
			<h1 class="visually-hidden">Play Forty-Fives</h1>
			<div class="status-bar">
				<span class="score" aria-label="Game score">
					You {game.scores[HUMAN]} · {opponentName} {game.scores[AI]}
					<span class="target">(first to {scheme.scoring.gameTarget})</span>
				</span>
				<span class="trump-badge" style="color: {trumpColor}">
					Trump: {SUIT_SYMBOLS[game.trumpSuit]} {SUIT_NAMES[game.trumpSuit]}
				</span>
			</div>
			<div class="hand-info">
				Hand {game.handNumber} · trick {Math.min(game.completedTricks.length + 1, 5)} of 5 ·
				{seatName(game.dealer)} dealt
			</div>
		</header>

		<section class="opponent" aria-label="{opponentName}'s side">
			<div class="opponent-row">
				<span class="opponent-name">{opponentName}</span>
				<div class="opponent-cards" style="--card-width: 52px">
					{#each game.hands[AI] as _, i (i)}
						<PlayingCard facedown />
					{/each}
				</div>
				<div class="turn-up" style="--card-width: 52px">
					{#if game.turnUpTaken}
						<span class="turn-up-note">Turn-up robbed</span>
					{:else}
						<PlayingCard card={game.turnUp} />
						<span class="turn-up-note">Turn-up</span>
					{/if}
				</div>
			</div>
		</section>

		<section class="trick-area" aria-label="Current trick">
			{#if shownPlays.length === 0}
				<p class="trick-placeholder">{turnPrompt}</p>
			{:else}
				<div class="trick-cards" style="--card-width: clamp(96px, 26vw, 140px)">
					{#each shownPlays as play (play.seat)}
						<PlayingCard
							card={play.card}
							caption={`${seatName(play.seat)} ${sameCard(play.card, shownPlays[0].card) ? 'led' : 'played'}`}
							highlight={lastTrick && play.seat === lastTrick.trick.winner ? 'winner' : null}
						/>
					{/each}
				</div>
				{#if !lastTrick}
					<p class="trick-placeholder">{turnPrompt}</p>
				{/if}
			{/if}

			{#if lastTrick}
				<div class="feedback" class:correct={lastTrick.trick.winner === HUMAN} class:incorrect={lastTrick.trick.winner === AI}>
					<p class="verdict">
						{lastTrick.trick.winner === HUMAN ? '✓ You take the trick.' : `${opponentName} takes the trick.`}
					</p>
					<p class="explanation">{lastTrick.explanation}</p>
				</div>
				<button type="button" class="big-button" onclick={continueAfterTrick}>
					{game.phase.kind === 'hand-over' ? 'See the hand score' : 'Next trick'}
				</button>
			{/if}
		</section>

		<div class="message-area" aria-live="polite">
			{#if message}
				<p class="message">{message}</p>
			{/if}
			{#if !lastTrick && humanTurn && analysis && analysis.renegingNow.length > 0}
				<p class="message renege-note">
					Your {analysis.renegingNow.map(cardLabel).join(' and ')} may renege — you are not
					forced to play {analysis.renegingNow.length > 1 ? 'them' : 'it'}.
				</p>
			{/if}
		</div>

		{#if humanRobbing}
			<section class="panel" aria-label="Robbing">
				<h2>
					{#if game.turnUp.rank === 'A'}
						You dealt the {cardLabel(game.turnUp)} — you may rob it.
					{:else}
						You hold the ace of trumps — you may rob the {cardLabel(game.turnUp)}.
					{/if}
				</h2>
				{#if robPicking}
					<p>Tap the card in your hand to give up, or cancel.</p>
					<div class="panel-buttons">
						<button type="button" class="big-button" onclick={() => { robPicking = false; message = ''; }}>
							Cancel
						</button>
					</div>
				{:else}
					<p>Take the turn-up into your hand in exchange for any card, or keep your hand as dealt.</p>
					<div class="panel-buttons">
						<button type="button" class="big-button" onclick={robTurnUp}>
							Take the {cardLabel(game.turnUp)}
						</button>
						<button type="button" class="big-button" onclick={keepHand}>Keep my hand</button>
					</div>
				{/if}
			</section>
		{/if}

		{#if game.phase.kind === 'hand-over' && !lastTrick}
			<section class="panel" aria-label="Hand result">
				<h2>Hand {game.handNumber} complete</h2>
				<ul class="hand-score">
					<li>
						You: {game.phase.handScore.points[HUMAN]} points
						({game.phase.handScore.trickCounts[HUMAN]} tricks{game.phase.handScore.bonusSeat === HUMAN ? ' + highest trump' : ''})
					</li>
					<li>
						{opponentName}: {game.phase.handScore.points[AI]} points
						({game.phase.handScore.trickCounts[AI]} tricks{game.phase.handScore.bonusSeat === AI ? ' + highest trump' : ''})
					</li>
					<li class="bonus-line">
						{#if game.phase.handScore.bonusCard}
							Highest trump in play: {cardLabel(game.phase.handScore.bonusCard)}
							(+{scheme.scoring.highestTrumpBonus} to {game.phase.handScore.bonusSeat === HUMAN ? 'you' : opponentName})
						{:else}
							No trump was played — no bonus this hand.
						{/if}
					</li>
				</ul>
				<p class="totals">
					Totals — You {game.scores[HUMAN]} · {opponentName} {game.scores[AI]}
				</p>
				{#if game.phase.gameWinner !== null}
					<p class="game-result" class:won={game.phase.gameWinner === HUMAN}>
						{game.phase.gameWinner === HUMAN
							? '🎉 You win the game!'
							: `${opponentName} wins the game.`}
					</p>
					<button type="button" class="big-button" onclick={newGame}>New game</button>
				{:else}
					<button type="button" class="big-button" onclick={dealNext}>Deal the next hand</button>
				{/if}
			</section>
		{/if}

		{#if game.hands[HUMAN].length > 0}
			<section class="your-hand" aria-label="Your hand">
				<h2 class="hand-heading">Your hand</h2>
				<div class="hand-cards" style="--card-width: clamp(88px, 18vw, 120px)">
					{#each game.hands[HUMAN] as card (cardLabel(card))}
						<PlayingCard
							{card}
							onpick={() => tapCard(card)}
							disabled={!humanTurn && !robPicking}
							selected={selected !== null && sameCard(selected, card)}
							dimmed={isDimmed(card)}
						/>
					{/each}
				</div>
				{#if settings.confirmPlay && humanTurn}
					<p class="confirm-hint">
						{selected ? `Tap the ${cardLabel(selected)} again to play it.` : 'Tap a card to raise it, tap again to play.'}
					</p>
				{/if}
			</section>
		{/if}

		<section class="game-footer">
			<label class="toggle">
				<input type="checkbox" bind:checked={settings.highlightLegal} onchange={persist} />
				Highlight legal cards
			</label>
			<label class="toggle">
				<input type="checkbox" bind:checked={settings.confirmPlay} onchange={persist} />
				Confirm before playing
			</label>
			<button type="button" class="small-button quit" onclick={quitGame}>
				{quitArmed ? 'Tap again to abandon the game' : 'Abandon game'}
			</button>
		</section>
	{/if}
</main>

<style>
	main {
		max-width: 44rem;
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

	.start-button {
		width: 100%;
		margin-top: 1rem;
	}

	.game-header {
		text-align: left;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
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

	.opponent {
		padding-top: 0.25rem;
	}

	.opponent-row {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}

	.opponent-name {
		font-size: 1.15rem;
		font-weight: 700;
		min-width: 5.5rem;
		color: var(--accent-deep);
	}

	.opponent-cards {
		display: flex;
		gap: 0.3rem;
		flex: 1;
	}

	.turn-up {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
	}

	.turn-up-note {
		font-size: 0.85rem;
		font-style: italic;
		color: var(--muted);
	}

	.trick-area {
		min-height: 12rem;
		margin: 1rem 0;
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid var(--rule);
		background: rgba(61, 58, 53, 0.04);
		text-align: center;
	}

	.trick-cards {
		display: flex;
		justify-content: center;
		gap: clamp(1rem, 6vw, 2.5rem);
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
		margin: 0 0 0.4rem;
	}

	.explanation {
		font-size: 1.05rem;
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
		margin-top: 1.75rem;
		padding-top: 1rem;
		border-top: 1px solid var(--rule);
	}

	/* 48px tap targets for the toggles too (SPEC §7). */
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 48px;
		font-size: 1.02rem;
		cursor: pointer;
	}

	.toggle input {
		width: 26px;
		height: 26px;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.toggle input:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
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
		margin-left: auto;
	}

	.small-button:hover {
		border-color: var(--accent);
		color: var(--accent-deep);
	}

	.small-button:focus-visible {
		outline: 4px solid var(--focus);
		outline-offset: 2px;
	}
</style>
