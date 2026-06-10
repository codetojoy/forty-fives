/**
 * Question generator: every question must be well-formed, its answer must
 * match the rules engine, and the category mix must cover all four lesson
 * types.
 */

import { describe, it, expect } from 'vitest';
import { sameCard, SUITS } from '$lib/domain/cards.js';
import { createRng } from '$lib/domain/rng.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import { generateQuestion, QUESTION_CATEGORIES } from '$lib/domain/trainer.js';
import { trickWinner } from '$lib/domain/trick.js';
import { isTrump } from '$lib/domain/trump-scheme.js';

const scheme = STANDARD_SCHEME;
const N = 2000;

describe('generateQuestion', () => {
	const rng = createRng(45);
	const questions = Array.from({ length: N }, () => generateQuestion(scheme, rng));

	it('never pairs a card with itself', () => {
		for (const q of questions) {
			expect(sameCard(q.led, q.second)).toBe(false);
		}
	});

	it('always marks the answer the rules engine gives', () => {
		for (const q of questions) {
			expect(q.correct).toBe(trickWinner(q.led, q.second, q.trumpSuit, scheme));
			expect(q.explanation.length).toBeGreaterThan(0);
		}
	});

	it('respects each category invariant', () => {
		for (const q of questions) {
			const ledTrump = isTrump(q.led, q.trumpSuit, scheme);
			const secondTrump = isTrump(q.second, q.trumpSuit, scheme);
			switch (q.category) {
				case 'trump-vs-trump':
					expect(ledTrump && secondTrump).toBe(true);
					break;
				case 'trump-vs-plain':
					expect(ledTrump !== secondTrump).toBe(true);
					break;
				case 'follow-suit':
					expect(!ledTrump && !secondTrump && q.led.suit === q.second.suit).toBe(true);
					break;
				case 'off-suit':
					expect(!ledTrump && !secondTrump && q.led.suit !== q.second.suit).toBe(true);
					expect(q.correct).toBe('led');
					break;
			}
		}
	});

	it('produces every category and every trump suit', () => {
		const categories = new Set(questions.map((q) => q.category));
		const trumpSuits = new Set(questions.map((q) => q.trumpSuit));
		expect([...categories].sort()).toEqual([...QUESTION_CATEGORIES].sort());
		expect(trumpSuits.size).toBe(SUITS.length);
	});

	it('honours a fixed trump suit', () => {
		const fixedRng = createRng(99);
		for (let i = 0; i < 200; i++) {
			expect(generateQuestion(scheme, fixedRng, 'clubs').trumpSuit).toBe('clubs');
		}
	});

	it('is deterministic for a given seed', () => {
		const a = generateQuestion(scheme, createRng(7));
		const b = generateQuestion(scheme, createRng(7));
		expect(a).toEqual(b);
	});
});
