import { describe, it, expect } from 'vitest';
import { parseCardId } from '$lib/domain/cards.js';
import type { CompletedTrick } from '$lib/domain/game-state.js';
import { gameWinner, scoreHand } from '$lib/domain/scoring.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';

const scheme = STANDARD_SCHEME;

/** Build a completed trick: [led, second] card ids, leader seat, winner seat. */
function trick(ledBy: number, ledId: string, secondId: string, winner: number): CompletedTrick {
	return {
		plays: [
			{ seat: ledBy, card: parseCardId(ledId) },
			{ seat: (ledBy + 1) % 2, card: parseCardId(secondId) }
		],
		winner
	};
}

describe('scoreHand', () => {
	it('pays 5 per trick and 5 for the highest trump in play (30 total)', () => {
		// Trump diamonds. Seat 0 wins three tricks including the 5♦; seat 1 wins two.
		const tricks = [
			trick(0, '5D', '8D', 0), // the highest trump in play
			trick(0, 'KH', '2H', 0),
			trick(0, '9S', 'QD', 1), // seat 1 trumps in
			trick(1, 'KC', '4C', 1),
			trick(1, '6H', '7H', 0)
		];
		const score = scoreHand(tricks, 'diamonds', scheme, 2);
		expect(score.trickCounts).toEqual([3, 2]);
		expect(score.bonusCard).toEqual(parseCardId('5D'));
		expect(score.bonusSeat).toBe(0);
		expect(score.points).toEqual([3 * 5 + 5, 2 * 5]);
		expect(score.points[0] + score.points[1]).toBe(30);
	});

	it('the A♥ can be the bonus card when hearts are not trump', () => {
		const tricks = [
			trick(0, 'AH', '8D', 0),
			trick(0, 'KH', '2H', 0),
			trick(0, '9S', '8S', 1),
			trick(1, 'KC', '4C', 1),
			trick(1, '6H', '7H', 0)
		];
		const score = scoreHand(tricks, 'diamonds', scheme, 2);
		expect(score.bonusCard).toEqual(parseCardId('AH'));
		expect(score.bonusSeat).toBe(0);
	});

	it('awards no bonus when no trump was played (hand totals 25)', () => {
		// Trump clubs; nobody plays a club or the A♥.
		const tricks = [
			trick(0, 'KH', '2H', 0),
			trick(0, '9S', '8S', 1),
			trick(1, 'KD', '4D', 1),
			trick(1, '6H', '7H', 0),
			trick(0, '2S', '3S', 1)
		];
		const score = scoreHand(tricks, 'clubs', scheme, 2);
		expect(score.bonusCard).toBeNull();
		expect(score.bonusSeat).toBeNull();
		expect(score.points[0] + score.points[1]).toBe(25);
	});

	it('uses scheme.scoring values rather than hardcoded fives', () => {
		const tweaked = {
			...scheme,
			scoring: { gameTarget: 45, trickValue: 7, highestTrumpBonus: 3 }
		};
		const tricks = [
			trick(0, '5D', '8D', 0),
			trick(0, 'KH', '2H', 0),
			trick(0, '9S', '8S', 1),
			trick(1, 'KC', '4C', 1),
			trick(1, '6H', '7H', 0)
		];
		const score = scoreHand(tricks, 'diamonds', tweaked, 2);
		expect(score.points).toEqual([3 * 7 + 3, 2 * 7]);
	});
});

describe('gameWinner', () => {
	it('nobody wins below the target', () => {
		expect(gameWinner([40, 30], 45)).toBeNull();
	});

	it('first across the target wins', () => {
		expect(gameWinner([45, 30], 45)).toBe(0);
		expect(gameWinner([30, 46], 45)).toBe(1);
	});

	it('when both cross, the higher total wins', () => {
		expect(gameWinner([50, 45], 45)).toBe(0);
		expect(gameWinner([45, 50], 45)).toBe(1);
	});

	it('a tie at the top plays another hand', () => {
		expect(gameWinner([45, 45], 45)).toBeNull();
	});
});
