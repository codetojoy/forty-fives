import { describe, it, expect } from 'vitest';
import { cardId } from '$lib/domain/cards.js';
import { deal, shuffledDeck } from '$lib/domain/deck.js';
import { createRng } from '$lib/domain/rng.js';

describe('shuffledDeck', () => {
	it('contains all 52 distinct cards', () => {
		const deck = shuffledDeck(createRng(1));
		expect(new Set(deck.map(cardId)).size).toBe(52);
	});

	it('is deterministic for a seed and varies across seeds', () => {
		const a = shuffledDeck(createRng(7)).map(cardId).join();
		const b = shuffledDeck(createRng(7)).map(cardId).join();
		const c = shuffledDeck(createRng(8)).map(cardId).join();
		expect(a).toBe(b);
		expect(a).not.toBe(c);
	});
});

describe('deal', () => {
	it('deals 5 cards each, one turn-up, and a 41-card stock with no overlap', () => {
		const { hands, turnUp, stock } = deal(createRng(42), 2);
		expect(hands).toHaveLength(2);
		expect(hands[0]).toHaveLength(5);
		expect(hands[1]).toHaveLength(5);
		expect(stock).toHaveLength(41);
		const all = [...hands[0], ...hands[1], turnUp, ...stock].map(cardId);
		expect(new Set(all).size).toBe(52);
	});
});
