<script lang="ts">
	import { SUITS, SUIT_NAMES, SUIT_SYMBOLS, cardLabel, isRedSuit } from '$lib/domain/cards.js';
	import { createRng } from '$lib/domain/rng.js';
	import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
	import { generateQuestion, type Question } from '$lib/domain/trainer.js';
	import type { TrickWinner } from '$lib/domain/trick.js';
	import PlayingCard from '$lib/ui/PlayingCard.svelte';
	import {
		emptyStats,
		loadSaved,
		saveState,
		type TrumpChoice
	} from '$lib/ui/persistence.js';

	const scheme = STANDARD_SCHEME;
	const rng = createRng();

	const saved = loadSaved();
	let trumpChoice = $state<TrumpChoice>(saved.trumpChoice);
	let stats = $state(saved.stats);
	let question = $state<Question | null>(null);
	let picked = $state<TrickWinner | null>(null);

	const accuracy = $derived(
		stats.asked === 0 ? null : Math.round((100 * stats.correct) / stats.asked)
	);
	const wasCorrect = $derived(question !== null && picked !== null && picked === question.correct);
	const trumpColor = $derived(
		question && isRedSuit(question.trumpSuit) ? '#ffb3b8' : '#f3efe4'
	);

	function persist() {
		saveState({ stats: $state.snapshot(stats), trumpChoice });
	}

	function start(choice: TrumpChoice) {
		trumpChoice = choice;
		persist();
		nextQuestion();
	}

	function nextQuestion() {
		picked = null;
		question = generateQuestion(scheme, rng, trumpChoice === 'random' ? undefined : trumpChoice);
	}

	function answer(which: TrickWinner) {
		if (!question || picked !== null) return;
		picked = which;
		if (which === question.correct) {
			stats.correct += 1;
			stats.streak += 1;
			stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
		} else {
			stats.streak = 0;
		}
		stats.asked += 1;
		persist();
	}

	function resetScore() {
		stats = emptyStats();
		persist();
	}

	function changeTrump() {
		question = null;
		picked = null;
	}

	function highlightFor(slot: TrickWinner): 'winner' | 'wrong-pick' | null {
		if (!question || picked === null) return null;
		if (slot === question.correct) return 'winner';
		if (slot === picked) return 'wrong-pick';
		return null;
	}
</script>

<svelte:head>
	<title>Forty-Fives Ranking Trainer</title>
	<meta
		name="description"
		content="Learn the unusual card rankings of Forty-Fives, the Maritime Canadian trick-taking game."
	/>
</svelte:head>

<main>
	<nav class="top-nav">
		<a class="home-link" href="/">← Home</a>
	</nav>
	<header>
		<h1>Forty-Fives Ranking Trainer</h1>
		<p class="subtitle">Learn which card wins — the Maritime way.</p>
	</header>

	{#if question === null}
		<section class="setup" aria-labelledby="setup-heading">
			<h2 id="setup-heading">Pick a trump suit to practise</h2>
			<p>
				You'll be shown two cards from a trick: one led, one played to it. Tap the card you think
				wins. Every answer comes with an explanation.
			</p>
			<div class="suit-grid">
				{#each SUITS as suit (suit)}
					<button type="button" class="big-button suit-button" onclick={() => start(suit)}>
						<span class="suit-symbol" class:red={isRedSuit(suit)}>{SUIT_SYMBOLS[suit]}</span>
						{SUIT_NAMES[suit]}
					</button>
				{/each}
				<button type="button" class="big-button suit-button random" onclick={() => start('random')}>
					<span class="suit-symbol">?</span>
					Random each question
				</button>
			</div>
			<p class="scheme-note">
				Rules: {scheme.name}. Regional variants (PEI, Northern&nbsp;NB, Cape&nbsp;Breton) are coming
				once validated with local players.
			</p>
		</section>
	{:else}
		<section class="quiz" aria-labelledby="quiz-heading">
			<h2 id="quiz-heading" class="visually-hidden">Quiz</h2>

			<div class="status-bar">
				<span class="trump-badge" style="color: {trumpColor}">
					Trump: {SUIT_SYMBOLS[question.trumpSuit]} {SUIT_NAMES[question.trumpSuit]}
				</span>
				<span class="score" aria-label="Score">
					{#if accuracy === null}
						No answers yet
					{:else}
						{stats.correct}/{stats.asked} correct ({accuracy}%) · streak {stats.streak}
						{#if stats.bestStreak > 1}· best {stats.bestStreak}{/if}
					{/if}
				</span>
			</div>

			<p class="prompt">
				The <strong>{cardLabel(question.led)}</strong> was led, then the
				<strong>{cardLabel(question.second)}</strong> was played.
				<strong>Tap the card that wins the trick.</strong>
			</p>

			<div class="cards">
				<PlayingCard
					card={question.led}
					caption="Led first"
					onpick={() => answer('led')}
					disabled={picked !== null}
					highlight={highlightFor('led')}
				/>
				<PlayingCard
					card={question.second}
					caption="Played second"
					onpick={() => answer('second')}
					disabled={picked !== null}
					highlight={highlightFor('second')}
				/>
			</div>

			<div class="feedback-area" aria-live="polite">
				{#if picked !== null}
					<div class="feedback" class:correct={wasCorrect} class:incorrect={!wasCorrect}>
						<p class="verdict">
							{#if wasCorrect}
								✓ Correct!
							{:else}
								✗ Not quite — the
								{cardLabel(question.correct === 'led' ? question.led : question.second)} wins.
							{/if}
						</p>
						<p class="explanation">{question.explanation}</p>
					</div>
					<button type="button" class="big-button next-button" onclick={nextQuestion}>
						Next question
					</button>
				{/if}
			</div>

			<div class="quiz-footer">
				<button type="button" class="small-button" onclick={changeTrump}>Change trump suit</button>
				<button type="button" class="small-button" onclick={resetScore}>Reset score</button>
			</div>
		</section>
	{/if}
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1.25rem 1rem 3rem;
	}

	.top-nav {
		margin-bottom: 0.5rem;
	}

	.home-link {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 0.5rem;
		color: #cfe3d6;
		font-size: 1.05rem;
		text-decoration: none;
	}

	.home-link:hover,
	.home-link:focus-visible {
		color: #ffffff;
		text-decoration: underline;
	}

	.home-link:focus-visible {
		outline: 4px solid #ffd54a;
		outline-offset: 2px;
		border-radius: 8px;
	}

	header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 1.8rem;
		margin: 0;
	}

	.subtitle {
		margin: 0.25rem 0 0;
		color: #cfe3d6;
	}

	h2 {
		font-size: 1.3rem;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	/* Large tap targets throughout (SPEC §7: minimum 48px, prefer 56px+). */
	.big-button {
		min-height: 60px;
		padding: 0.75rem 1.25rem;
		font-size: 1.2rem;
		font-weight: 600;
		border: 2px solid #0d3520;
		border-radius: 12px;
		background: #f3efe4;
		color: #14311f;
		cursor: pointer;
	}

	.big-button:hover {
		background: #ffffff;
	}

	.big-button:focus-visible {
		outline: 4px solid #ffd54a;
		outline-offset: 2px;
	}

	.suit-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin: 1.25rem 0;
	}

	.suit-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
	}

	.suit-button.random {
		grid-column: 1 / -1;
	}

	.suit-symbol {
		font-size: 1.6rem;
	}

	.suit-symbol.red {
		color: #c0262d;
	}

	.scheme-note {
		font-size: 0.95rem;
		color: #cfe3d6;
	}

	.status-bar {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.trump-badge {
		font-size: 1.35rem;
		font-weight: 700;
	}

	.score {
		font-size: 1.05rem;
		color: #cfe3d6;
	}

	.prompt {
		font-size: 1.2rem;
		margin: 0 0 1.25rem;
	}

	.cards {
		display: flex;
		justify-content: center;
		gap: clamp(1rem, 6vw, 2.5rem);
		margin-bottom: 1.25rem;
	}

	.feedback-area {
		min-height: 9rem;
	}

	.feedback {
		border-radius: 12px;
		padding: 1rem 1.25rem;
		margin-bottom: 1rem;
		background: #f3efe4;
		color: #1d2b22;
		border-left: 10px solid;
	}

	.feedback.correct {
		border-color: #2e9e54;
	}

	.feedback.incorrect {
		border-color: #d2453a;
	}

	.verdict {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
	}

	.explanation {
		font-size: 1.1rem;
		margin: 0;
	}

	.next-button {
		width: 100%;
	}

	.quiz-footer {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 1.75rem;
	}

	.small-button {
		min-height: 48px;
		padding: 0.5rem 1rem;
		font-size: 1rem;
		border: 2px solid #cfe3d6;
		border-radius: 10px;
		background: transparent;
		color: #f3efe4;
		cursor: pointer;
	}

	.small-button:hover {
		background: rgba(243, 239, 228, 0.12);
	}

	.small-button:focus-visible {
		outline: 4px solid #ffd54a;
		outline-offset: 2px;
	}
</style>
