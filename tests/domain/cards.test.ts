import { describe, it, expect } from 'vitest';
import { FULL_DECK, card, cardId, cardLabel, parseCardId } from '$lib/domain/cards.js';

describe('card model', () => {
	it('has 52 distinct cards in the full deck', () => {
		expect(FULL_DECK.length).toBe(52);
		expect(new Set(FULL_DECK.map(cardId)).size).toBe(52);
	});

	it('round-trips every card through its id', () => {
		for (const c of FULL_DECK) {
			expect(parseCardId(cardId(c))).toEqual(c);
		}
	});

	it('formats ids and labels', () => {
		expect(cardId(card('10', 'diamonds'))).toBe('10D');
		expect(cardId(card('A', 'hearts'))).toBe('AH');
		expect(cardLabel(card('5', 'clubs'))).toBe('5♣');
	});

	it('rejects invalid ids', () => {
		expect(() => parseCardId('11D')).toThrow();
		expect(() => parseCardId('AX')).toThrow();
		expect(() => parseCardId('')).toThrow();
	});
});
