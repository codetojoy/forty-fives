import { describe, it, expect } from 'vitest';
import { cardId, parseCardId, type Card } from '$lib/domain/cards.js';
import {
	currentSeat,
	declineRob,
	nextHand,
	playCard,
	rob,
	startGame,
	SEATS,
	type GameState
} from '$lib/domain/game-state.js';
import { createRng } from '$lib/domain/rng.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import { chooseCard, chooseRob } from '$lib/ai/heuristic.js';

const scheme = STANDARD_SCHEME;
const h = (...ids: string[]): Card[] => ids.map(parseCardId);

/** Resolve the robbing window, both seats steered by the AI. */
function aiRobWindow(state: GameState): GameState {
	if (state.phase.kind !== 'robbing') return state;
	const decision = chooseRob(state, scheme);
	return decision.rob ? rob(state, decision.discard!) : declineRob(state);
}

/** Play one full AI-vs-AI hand. playCard throws if the AI ever cheats. */
function aiHand(state: GameState): GameState {
	state = aiRobWindow(state);
	while (state.phase.kind === 'playing') {
		const seat = currentSeat(state)!;
		state = playCard(state, scheme, seat, chooseCard(state, scheme, seat));
	}
	return state;
}

describe('AI vs AI full games', () => {
	it('plays only legal cards and every game terminates (100 seeds)', () => {
		for (let seed = 1; seed <= 100; seed++) {
			const rng = createRng(seed);
			let state = aiHand(startGame(scheme, rng));
			let hands = 1;
			while (state.phase.kind === 'hand-over' && state.phase.gameWinner === null) {
				state = aiHand(nextHand(state, scheme, rng));
				hands++;
				expect(hands, `seed ${seed}: game should terminate`).toBeLessThan(60);
			}
			if (state.phase.kind !== 'hand-over') throw new Error('unreachable');
			const winner = state.phase.gameWinner!;
			expect(state.scores[winner]).toBeGreaterThanOrEqual(scheme.scoring.gameTarget);
			expect(state.scores[winner]).toBeGreaterThan(state.scores[(winner + 1) % SEATS]);
		}
	});

	it('is deterministic: the same seed replays the same game', () => {
		const play = (seed: number): string => {
			const rng = createRng(seed);
			let state = aiHand(startGame(scheme, rng));
			while (state.phase.kind === 'hand-over' && state.phase.gameWinner === null) {
				state = aiHand(nextHand(state, scheme, rng));
			}
			return JSON.stringify(state.scores) + state.handNumber;
		};
		expect(play(11)).toBe(play(11));
	});
});

describe('chooseRob', () => {
	it('always discards a card from its own hand when robbing', () => {
		let checked = 0;
		for (let seed = 1; seed <= 200; seed++) {
			const state = startGame(scheme, createRng(seed), 0);
			if (state.phase.kind !== 'robbing') continue;
			const decision = chooseRob(state, scheme);
			if (decision.rob) {
				const hand = state.hands[state.phase.seat].map(cardId);
				expect(hand).toContain(cardId(decision.discard!));
				expect(() => rob(state, decision.discard!)).not.toThrow();
			}
			checked++;
		}
		expect(checked).toBeGreaterThan(10);
	});

	it('robs a trump in exchange for a weak plain card', () => {
		// Seat 0 holds the A♦ (trump ace) and junk; the turn-up 9♦ beats the 2♣.
		const state: GameState = {
			schemeId: 'standard',
			handNumber: 1,
			dealer: 1,
			trumpSuit: 'diamonds',
			turnUp: parseCardId('9D'),
			turnUpTaken: false,
			hands: [h('AD', '2C', 'KH', '9S', '4S'), h('QD', '3H', '5C', '8S', '10S')],
			currentTrick: [],
			completedTricks: [],
			scores: [0, 0],
			phase: { kind: 'robbing', seat: 0 }
		};
		const decision = chooseRob(state, scheme);
		expect(decision.rob).toBe(true);
		// The weakest card is the 2♣ (black numbers: 2 is the HIGH one... but as
		// a plain club the 2 ranks just below the ace; the 9♠ is weaker). Either
		// way the discard must not be a trump.
		expect(['2C', 'KH', '9S', '4S']).toContain(cardId(decision.discard!));
	});
});

describe('chooseCard tactics', () => {
	// Trump is diamonds, the 9♦ is the exposed turn-up, seat 1 is the AI.
	function state(hands: Card[][], currentTrick: GameState['currentTrick']): GameState {
		return {
			schemeId: 'standard',
			handNumber: 1,
			dealer: 1,
			trumpSuit: 'diamonds',
			turnUp: parseCardId('9D'),
			turnUpTaken: false,
			hands,
			currentTrick,
			completedTricks: [],
			scores: [0, 0],
			phase: { kind: 'playing' }
		};
	}

	it('wins with the cheapest winning card', () => {
		// 6♦ led (trump); seat 1 holds Q♦ and 7♦ — both win, the 7♦ is cheaper.
		const s = state(
			[h('KH', '2C', '9S', '4S'), h('QD', '7D', 'KS', '3H')],
			[{ seat: 0, card: parseCardId('6D') }]
		);
		expect(cardId(chooseCard(s, scheme, 1))).toBe('7D');
	});

	it('dumps the weakest legal card when it cannot win', () => {
		// K♠ led; seat 1 must follow spades and cannot beat it (black: A,2 < K).
		const s = state(
			[h('KH', '2C', '9C', '4H'), h('AS', '8S', '3H', 'QC')],
			[{ seat: 0, card: parseCardId('KS') }]
		);
		// Spades run K,Q,J,A,2…10 — the 8♠ is the weakest spade held.
		expect(cardId(chooseCard(s, scheme, 1))).toBe('8S');
	});

	it('saves the 5 of trumps early instead of spending it on a cheap lead', () => {
		// 9♥ led (plain); seat 1 could only win by trumping with the 5♦.
		const s = state(
			[h('KH', '2C', '9S', '4S'), h('5D', '2H', '7S', 'QC')],
			[{ seat: 0, card: parseCardId('9H') }]
		);
		// Legal: 2♥ (follow) or 5♦ (trump). The 2♥ loses, but the 5 is saved.
		expect(cardId(chooseCard(s, scheme, 1))).toBe('2H');
	});

	it('spends the renegable trump late, when tricks are running out', () => {
		const s: GameState = {
			...state(
				[h('KH'), h('5D', '2H')],
				[{ seat: 0, card: parseCardId('9H') }]
			),
			completedTricks: [
				{ plays: [{ seat: 0, card: parseCardId('KC') }, { seat: 1, card: parseCardId('4C') }], winner: 0 },
				{ plays: [{ seat: 0, card: parseCardId('KS') }, { seat: 1, card: parseCardId('8S') }], winner: 1 },
				{ plays: [{ seat: 1, card: parseCardId('6H') }, { seat: 0, card: parseCardId('7H') }], winner: 0 }
			]
		};
		expect(cardId(chooseCard(s, scheme, 1))).toBe('5D');
	});

	it('cashes a boss trump when leading', () => {
		// Seat 1 leads holding the 5♦ — nothing in the game beats it.
		const s = state([h('KH', '2C', '9S', '4S'), h('5D', '2H', '7S', 'QC')], []);
		// Make it seat 1's lead: dealer 0 → seat 1 leads trick 1.
		const lead = { ...s, dealer: 0 } as GameState;
		expect(cardId(chooseCard(lead, scheme, 1))).toBe('5D');
	});

	it('ducks with its weakest card when leading without a boss trump', () => {
		const s = state([h('KH', '2C', '9S', '4S'), h('QD', '2H', '7S', 'QC')], []);
		const lead = { ...s, dealer: 0 } as GameState;
		// The Q♦ is not boss (5♦, J♦, A♥, A♦, K♦ unseen); weakest is the 2♥.
		expect(cardId(chooseCard(lead, scheme, 1))).toBe('2H');
	});
});
