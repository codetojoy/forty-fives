/**
 * Named, readable test cases for the famous Forty-Fives traps. The exhaustive
 * sweep proves the engine matches the rules; these document the rules for
 * humans (and pin the explanation text to the key teaching points).
 */

import { describe, it, expect } from 'vitest';
import { card } from '$lib/domain/cards.js';
import type { Suit } from '$lib/domain/cards.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import { trickWinner, explainTrick } from '$lib/domain/trick.js';

const scheme = STANDARD_SCHEME;

function winner(ledId: [string, Suit], secondId: [string, Suit], trump: Suit) {
	return trickWinner(
		card(ledId[0] as never, ledId[1]),
		card(secondId[0] as never, secondId[1]),
		trump,
		scheme
	);
}

describe('the trump ladder: 5, J, A♥, A, K, Q', () => {
	it('5 of trump beats J of trump', () => {
		expect(winner(['J', 'diamonds'], ['5', 'diamonds'], 'diamonds')).toBe('second');
	});

	it('5 of trump beats the A♥', () => {
		expect(winner(['A', 'hearts'], ['5', 'clubs'], 'clubs')).toBe('second');
	});

	it('J of trump beats the A♥', () => {
		expect(winner(['A', 'hearts'], ['J', 'spades'], 'spades')).toBe('second');
	});

	it('A♥ beats the ace of the trump suit', () => {
		expect(winner(['A', 'diamonds'], ['A', 'hearts'], 'diamonds')).toBe('second');
	});

	it('A♥ beats the K of trump even when hearts are not trump', () => {
		expect(winner(['K', 'spades'], ['A', 'hearts'], 'spades')).toBe('second');
	});
});

describe('the A♥ is always trump', () => {
	it('A♥ beats a plain-suit king when neither suit is hearts', () => {
		// A♥ played onto a club lead with diamonds trump: A♥ is trump, K♣ is not.
		expect(winner(['K', 'clubs'], ['A', 'hearts'], 'diamonds')).toBe('second');
	});

	it('the lowest pure trump still beats the A♥... is FALSE — A♥ ranks 3rd', () => {
		expect(winner(['A', 'hearts'], ['2', 'diamonds'], 'diamonds')).toBe('led');
	});
});

describe('number cards: highest in red, lowest in black', () => {
	it('in trump diamonds, 10♦ beats 2♦', () => {
		expect(winner(['2', 'diamonds'], ['10', 'diamonds'], 'diamonds')).toBe('second');
	});

	it('in trump clubs, 2♣ beats 10♣', () => {
		expect(winner(['10', 'clubs'], ['2', 'clubs'], 'clubs')).toBe('second');
	});

	it('in plain spades, 2♠ beats 10♠', () => {
		expect(winner(['10', 'spades'], ['2', 'spades'], 'hearts')).toBe('second');
	});

	it('in plain diamonds, 10♦ beats 2♦', () => {
		expect(winner(['2', 'diamonds'], ['10', 'diamonds'], 'clubs')).toBe('second');
	});
});

describe('aces outside trump', () => {
	it('A♦ is the LOWEST diamond when diamonds are not trump', () => {
		expect(winner(['A', 'diamonds'], ['2', 'diamonds'], 'clubs')).toBe('second');
	});

	it('A♦ is the 4th-highest trump when diamonds are trump', () => {
		expect(winner(['K', 'diamonds'], ['A', 'diamonds'], 'diamonds')).toBe('second');
	});

	it('black aces rank between J and 2 in plain suits: A♣ beats 2♣', () => {
		expect(winner(['2', 'clubs'], ['A', 'clubs'], 'hearts')).toBe('second');
	});

	it('black aces rank between J and 2 in plain suits: J♣ beats A♣', () => {
		expect(winner(['A', 'clubs'], ['J', 'clubs'], 'hearts')).toBe('second');
	});
});

describe('trump and led-suit fundamentals', () => {
	it('any trump beats any non-trump: 2♥ (trump) beats K♠', () => {
		expect(winner(['K', 'spades'], ['2', 'hearts'], 'hearts')).toBe('second');
	});

	it('an off-suit non-trump card can never win: led 2♠ beats K♦ (trump clubs)', () => {
		expect(winner(['2', 'spades'], ['K', 'diamonds'], 'clubs')).toBe('led');
	});
});

describe('explanations hit the key teaching points', () => {
	const explain = (led: [string, Suit], second: [string, Suit], trump: Suit) =>
		explainTrick(
			card(led[0] as never, led[1]),
			card(second[0] as never, second[1]),
			trump,
			scheme
		);

	it('explains the 5 of trumps', () => {
		expect(explain(['J', 'diamonds'], ['5', 'diamonds'], 'diamonds')).toContain('highest trump');
	});

	it('explains that the A♥ is always trump', () => {
		expect(explain(['K', 'clubs'], ['A', 'hearts'], 'diamonds')).toContain('always trump');
	});

	it('explains the low A♦ trap', () => {
		expect(explain(['A', 'diamonds'], ['2', 'diamonds'], 'clubs')).toContain('lowest diamond');
	});

	it('explains the black number-card reversal', () => {
		expect(explain(['10', 'clubs'], ['2', 'clubs'], 'clubs')).toContain('lowest in black');
	});

	it('explains that off-suit cards cannot win', () => {
		expect(explain(['2', 'spades'], ['K', 'diamonds'], 'clubs')).toContain('can never win');
	});

	it('refuses to compare a card with itself', () => {
		expect(() => explain(['5', 'clubs'], ['5', 'clubs'], 'clubs')).toThrow();
	});
});
