import { describe, it, expect } from 'vitest';
import { card, cardId, parseCardId, sameCard, type Card } from '$lib/domain/cards.js';
import {
	analyzeCurrent,
	currentSeat,
	declineRob,
	isGameOver,
	isPlausibleGameState,
	ledCard,
	nextHand,
	playCard,
	rob,
	startGame,
	SEATS,
	type GameState
} from '$lib/domain/game-state.js';
import { createRng } from '$lib/domain/rng.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';

const scheme = STANDARD_SCHEME;
const h = (...ids: string[]): Card[] => ids.map(parseCardId);

/** A hand-built state for deterministic transition tests. Trump diamonds, seat 0 leads. */
function fixedState(): GameState {
	return {
		schemeId: 'standard',
		handNumber: 1,
		dealer: 1,
		trumpSuit: 'diamonds',
		turnUp: parseCardId('9D'),
		turnUpTaken: false,
		hands: [h('7D', 'KH', '2C', '9S', '4S'), h('QD', '3H', '5C', '8S', '10S')],
		currentTrick: [],
		completedTricks: [],
		scores: [0, 0],
		phase: { kind: 'playing' }
	};
}

/** Play out the rest of the current hand with a trivial first-legal-card strategy. */
function autoplayHand(state: GameState): GameState {
	if (state.phase.kind === 'robbing') state = declineRob(state);
	while (state.phase.kind === 'playing') {
		const seat = currentSeat(state)!;
		state = playCard(state, scheme, seat, analyzeCurrent(state, scheme).legal[0]);
	}
	return state;
}

describe('startGame / dealing', () => {
	it('deals 5 cards each with trump set by the turn-up, and assigns robbing rights', () => {
		for (let seed = 1; seed <= 200; seed++) {
			const state = startGame(scheme, createRng(seed), 0);
			expect(state.hands[0]).toHaveLength(5);
			expect(state.hands[1]).toHaveLength(5);
			expect(state.trumpSuit).toBe(state.turnUp.suit);
			expect(state.scores).toEqual([0, 0]);
			expect(state.handNumber).toBe(1);

			const trumpAce = card('A', state.trumpSuit);
			const holder = state.hands.findIndex((hand) => hand.some((c) => sameCard(c, trumpAce)));
			if (state.phase.kind === 'robbing') {
				if (state.turnUp.rank === 'A') {
					expect(state.phase.seat, `seed ${seed}: turned ace is robbed by the dealer`).toBe(
						state.dealer
					);
				} else {
					expect(state.phase.seat, `seed ${seed}: ace-of-trumps holder robs`).toBe(holder);
				}
			} else {
				expect(state.turnUp.rank, `seed ${seed}`).not.toBe('A');
				expect(holder, `seed ${seed}: nobody held the ace of trumps`).toBe(-1);
			}
		}
	});

	it('the non-dealer leads the first trick', () => {
		for (let seed = 1; seed <= 50; seed++) {
			let state = startGame(scheme, createRng(seed), 0);
			if (state.phase.kind === 'robbing') state = declineRob(state);
			expect(currentSeat(state)).toBe((state.dealer + 1) % SEATS);
		}
	});
});

describe('robbing', () => {
	function robbingState(): GameState {
		for (let seed = 1; ; seed++) {
			const state = startGame(scheme, createRng(seed), 0);
			if (state.phase.kind === 'robbing') return state;
		}
	}

	it('exchanges the discard for the turn-up', () => {
		const state = robbingState();
		const seat = state.phase.kind === 'robbing' ? state.phase.seat : -1;
		const discard = state.hands[seat][0];
		const after = rob(state, discard);
		expect(after.phase.kind).toBe('playing');
		expect(after.turnUpTaken).toBe(true);
		expect(after.hands[seat]).toHaveLength(5);
		expect(after.hands[seat].some((c) => sameCard(c, state.turnUp))).toBe(true);
		expect(after.hands[seat].some((c) => sameCard(c, discard))).toBe(false);
		// The other hand is untouched, and the original state was not mutated.
		expect(after.hands[(seat + 1) % SEATS]).toEqual(state.hands[(seat + 1) % SEATS]);
		expect(state.turnUpTaken).toBe(false);
	});

	it('declining keeps the dealt hand and starts play', () => {
		const state = robbingState();
		const after = declineRob(state);
		expect(after.phase.kind).toBe('playing');
		expect(after.turnUpTaken).toBe(false);
		expect(after.hands).toEqual(state.hands);
	});

	it('rejects a discard that is not in the hand', () => {
		const state = robbingState();
		const seat = state.phase.kind === 'robbing' ? state.phase.seat : -1;
		const elsewhere = state.hands[(seat + 1) % SEATS][0];
		expect(() => rob(state, elsewhere)).toThrow(/not in the hand/);
	});

	it('cannot rob once play has begun', () => {
		expect(() => rob(fixedState(), parseCardId('7D'))).toThrow(/no robbing/i);
	});
});

describe('playCard', () => {
	it('enforces turn order', () => {
		const state = fixedState(); // dealer 1 → seat 0 leads
		expect(() => playCard(state, scheme, 1, parseCardId('QD'))).toThrow(/turn/);
	});

	it('rejects a card not in the hand', () => {
		expect(() => playCard(fixedState(), scheme, 0, parseCardId('QD'))).toThrow(/not in seat/);
	});

	it('rejects an illegal play with the rule in the message', () => {
		// Seat 0 leads 9♠; seat 1 holds spades, so discarding the 3♥ is illegal.
		const mid = playCard(fixedState(), scheme, 0, parseCardId('9S'));
		expect(() => playCard(mid, scheme, 1, parseCardId('3H'))).toThrow(/Spades.*led/);
	});

	it('resolves the trick and the winner leads next', () => {
		// 9♠ led, 8♠ answers; black numbers run 2-high…10-low, so the 8♠ wins.
		let state = playCard(fixedState(), scheme, 0, parseCardId('9S'));
		expect(ledCard(state)).toEqual(parseCardId('9S'));
		state = playCard(state, scheme, 1, parseCardId('8S'));
		expect(state.completedTricks).toHaveLength(1);
		expect(state.completedTricks[0].winner).toBe(1);
		expect(state.currentTrick).toHaveLength(0);
		expect(currentSeat(state)).toBe(1);
		expect(state.hands[0]).toHaveLength(4);
		expect(state.hands[1]).toHaveLength(4);
	});

	it('after 5 tricks the hand is tallied into the running scores', () => {
		const state = autoplayHand(fixedState());
		expect(state.phase.kind).toBe('hand-over');
		if (state.phase.kind !== 'hand-over') return;
		expect(state.completedTricks).toHaveLength(5);
		expect(state.hands[0]).toHaveLength(0);
		expect(state.hands[1]).toHaveLength(0);
		const total = state.phase.handScore.points[0] + state.phase.handScore.points[1];
		expect([25, 30]).toContain(total); // 25 only if no trump was ever played
		expect(state.scores).toEqual(state.phase.handScore.points); // first hand
		expect(state.phase.gameWinner).toBeNull();
	});
});

describe('hands and the game', () => {
	it('nextHand alternates the dealer and carries the scores', () => {
		const done = autoplayHand(startGame(scheme, createRng(3), 0));
		const next = nextHand(done, scheme, createRng(4));
		expect(next.handNumber).toBe(2);
		expect(next.dealer).toBe(1);
		expect(next.scores).toEqual(done.scores);
		expect(next.completedTricks).toHaveLength(0);
	});

	it('a full game reaches 45 and ends with the right winner', () => {
		for (let seed = 1; seed <= 25; seed++) {
			const rng = createRng(seed);
			let state = autoplayHand(startGame(scheme, rng, 0));
			let hands = 1;
			while (state.phase.kind === 'hand-over' && state.phase.gameWinner === null) {
				state = autoplayHand(nextHand(state, scheme, rng));
				hands++;
				expect(hands, `seed ${seed}: game should terminate`).toBeLessThan(60);
			}
			if (state.phase.kind !== 'hand-over') throw new Error('unreachable');
			const winner = state.phase.gameWinner!;
			expect(state.scores[winner]).toBeGreaterThanOrEqual(scheme.scoring.gameTarget);
			expect(state.scores[winner]).toBeGreaterThan(state.scores[(winner + 1) % SEATS]);
			expect(() => nextHand(state, scheme, rng)).toThrow(/over/);
		}
	});
});

describe('isGameOver (TODO-047)', () => {
	it('is false for a game that has just started', () => {
		expect(isGameOver(startGame(scheme, createRng(31), 0))).toBe(false);
	});

	it('is false at hand-over while nobody has reached 45', () => {
		const state = autoplayHand(startGame(scheme, createRng(32), 0));
		// One hand scores at most 30, so the first hand can never decide the game.
		expect(state.phase.kind).toBe('hand-over');
		expect(isGameOver(state)).toBe(false);
	});

	it('is true once a game winner is decided', () => {
		const rng = createRng(33);
		let state = autoplayHand(startGame(scheme, rng, 0));
		let guard = 0;
		while (!isGameOver(state)) {
			state = autoplayHand(nextHand(state, scheme, rng));
			if (++guard > 60) throw new Error('game did not terminate');
		}
		expect(state.phase.kind === 'hand-over' && state.phase.gameWinner !== null).toBe(true);
	});
});

describe('saved-state plausibility', () => {
	it('accepts a real state and rejects junk', () => {
		expect(isPlausibleGameState(startGame(scheme, createRng(1), 0))).toBe(true);
		expect(isPlausibleGameState(JSON.parse(JSON.stringify(fixedState())))).toBe(true);
		expect(isPlausibleGameState(null)).toBe(false);
		expect(isPlausibleGameState({})).toBe(false);
		expect(isPlausibleGameState({ schemeId: 'standard', hands: [[]] })).toBe(false);
	});
});

describe('immutability', () => {
	it('transitions never mutate the input state', () => {
		const state = fixedState();
		const snapshot = JSON.stringify(state);
		playCard(state, scheme, 0, parseCardId('9S'));
		expect(JSON.stringify(state)).toBe(snapshot);
		expect(cardId(state.hands[0][0])).toBe('7D');
	});
});
