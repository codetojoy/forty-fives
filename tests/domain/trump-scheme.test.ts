/**
 * Scheme loading and validation. A typo in a trump-scheme JSON file must fail
 * loudly at load time, never silently mis-rank cards.
 */

import { describe, it, expect } from 'vitest';
import standardJson from '$lib/assets/trump-schemes/standard.json';
import { card } from '$lib/domain/cards.js';
import {
	loadTrumpScheme,
	isTrump,
	trumpStrength,
	plainStrength,
	trumpPosition,
	type TrumpSchemeData
} from '$lib/domain/trump-scheme.js';

const data = standardJson as TrumpSchemeData;

function clone(): TrumpSchemeData {
	return structuredClone(data);
}

describe('loadTrumpScheme accepts the bundled standard scheme', () => {
	const scheme = loadTrumpScheme(data);

	it('classifies trump membership, including the ever-trump A♥', () => {
		expect(isTrump(card('2', 'diamonds'), 'diamonds', scheme)).toBe(true);
		expect(isTrump(card('A', 'hearts'), 'diamonds', scheme)).toBe(true);
		expect(isTrump(card('K', 'hearts'), 'diamonds', scheme)).toBe(false);
		expect(isTrump(card('A', 'diamonds'), 'clubs', scheme)).toBe(false);
	});

	it('reports trump positions: 5 is 1st, J is 2nd, A♥ is 3rd', () => {
		expect(trumpPosition(card('5', 'spades'), 'spades', scheme)).toBe(1);
		expect(trumpPosition(card('J', 'spades'), 'spades', scheme)).toBe(2);
		expect(trumpPosition(card('A', 'hearts'), 'spades', scheme)).toBe(3);
		expect(trumpPosition(card('A', 'spades'), 'spades', scheme)).toBe(4);
		expect(trumpPosition(card('K', 'diamonds'), 'spades', scheme)).toBeNull();
	});

	it('gives the A♥ no plain strength (it is always trump)', () => {
		expect(plainStrength(card('A', 'hearts'), scheme)).toBeNull();
		expect(plainStrength(card('K', 'hearts'), scheme)).not.toBeNull();
	});

	it('gives non-trump cards no trump strength', () => {
		expect(trumpStrength(card('K', 'spades'), 'hearts', scheme)).toBeNull();
	});
});

describe('loadTrumpScheme rejects malformed schemes', () => {
	it('rejects a duplicated card in a trump ranking', () => {
		const bad = clone();
		bad.trumpRankings.hearts[1] = '5H';
		expect(() => loadTrumpScheme(bad)).toThrow(/twice/);
	});

	it('rejects a missing card in a trump ranking', () => {
		const bad = clone();
		bad.trumpRankings.clubs = bad.trumpRankings.clubs.slice(0, -1);
		expect(() => loadTrumpScheme(bad)).toThrow(/missing: 10C/);
	});

	it('rejects a card from the wrong suit in a trump ranking', () => {
		const bad = clone();
		bad.trumpRankings.spades[5] = 'QD';
		expect(() => loadTrumpScheme(bad)).toThrow(/unexpected card "QD"/);
	});

	it('rejects an invalid card id', () => {
		const bad = clone();
		bad.plainRankings.diamonds[0] = '11D';
		expect(() => loadTrumpScheme(bad)).toThrow(/invalid card id/);
	});

	it('rejects the A♥ in plain hearts when it is always trump', () => {
		const bad = clone();
		bad.plainRankings.hearts.push('AH');
		expect(() => loadTrumpScheme(bad)).toThrow(/unexpected card "AH"/);
	});

	it('rejects a missing ranking table', () => {
		const bad = clone();
		// @ts-expect-error deliberately breaking the shape
		delete bad.plainRankings.spades;
		expect(() => loadTrumpScheme(bad)).toThrow(/plainRankings.spades is missing/);
	});

	it('rejects joker schemes until joker support is implemented', () => {
		const bad = clone();
		bad.useJoker = true;
		expect(() => loadTrumpScheme(bad)).toThrow(/joker/);
	});
});
