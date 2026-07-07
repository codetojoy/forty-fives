/**
 * Named trap cases for the optional "strongest to weakest" hand ordering
 * (TODO-052). The point of the feature is that "strength" is the *game's*
 * ranking, not face rank — so these pin the famous surprises: the 5/J/A♥ trump
 * ladder, the A♥ always sorting into the trump group, A♦ lowest off-trump, and
 * the reversed black number cards.
 */

import { describe, it, expect } from 'vitest';
import { card, cardId } from '$lib/domain/cards.js';
import type { Rank, Suit } from '$lib/domain/cards.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import { sortHandStrongestFirst } from '$lib/ui/hand-order.js';

const scheme = STANDARD_SCHEME;

/** Build a hand from canonical ids like "5C", "AH", "10S". */
function hand(...ids: string[]) {
	return ids.map((id) => {
		const rank = id.slice(0, -1) as Rank;
		const suitLetter = id.slice(-1);
		const suit = { C: 'clubs', D: 'diamonds', H: 'hearts', S: 'spades' }[suitLetter] as Suit;
		return card(rank, suit);
	});
}

function orderedIds(cards: ReturnType<typeof hand>, trumpSuit: Suit) {
	return sortHandStrongestFirst(cards, trumpSuit, scheme).map(cardId);
}

describe('sortHandStrongestFirst', () => {
	it('orders a mixed hand: trump ladder first, then alphabetical suits by in-suit strength', () => {
		// Clubs trump. Deliberately scrambled input covering every trap.
		const input = hand('10S', 'AH', 'KD', '2C', 'JC', 'AD', '5C', '2S', 'KH', 'AC', 'KC', '2H');
		expect(orderedIds(input, 'clubs')).toEqual([
			// Trump (clubs), by the game's trump ranking — 5 > J > A♥ > A > K, not face rank:
			'5C',
			'JC',
			'AH', // A♥ is *always* trump — it sorts into the trump group though it's a heart
			'AC',
			'KC',
			'2C',
			// Non-trump suits alphabetical (clubs excluded): diamonds, hearts, spades:
			'KD',
			'AD', // A♦ is the LOWEST diamond when diamonds aren't trump
			'KH',
			'2H',
			'2S', // black number cards reversed: 2♠ beats 10♠
			'10S'
		]);
	});

	it('does not mutate its input', () => {
		const input = hand('2C', '5C', 'AD');
		const copy = input.map(cardId);
		sortHandStrongestFirst(input, 'clubs', scheme);
		expect(input.map(cardId)).toEqual(copy);
	});

	it('places A♥ at the very top when its own suit is trump', () => {
		// Hearts trump: the 5♥ and J♥ still outrank A♥ (the ladder), A♥ third.
		const input = hand('KH', 'AH', 'JH', '5H');
		expect(orderedIds(input, 'hearts')).toEqual(['5H', 'JH', 'AH', 'KH']);
	});
});
