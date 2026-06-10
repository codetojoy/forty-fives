/**
 * Exhaustive cross-check of the trick comparator against an independent
 * oracle (SPEC §13: "generate exhaustive test cases — every combination").
 *
 * The oracle below derives card strength from the *verbal* rules of
 * Forty-Fives, written as formulas. The production code derives strength from
 * the standard.json ranking lists. A typo in either one makes them disagree,
 * and the disagreeing pair is named in the failure message.
 */

import { describe, it, expect } from 'vitest';
import { FULL_DECK, cardLabel, isRedSuit, sameCard, SUITS } from '$lib/domain/cards.js';
import type { Card, Suit } from '$lib/domain/cards.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import { trickWinner } from '$lib/domain/trick.js';

// --- Independent oracle -----------------------------------------------------

/** Verbal rule: 5, J, A♥, [A of trump], K, Q, then number cards — red 10-high…2-low, black 2-high…10-low. */
function oracleTrumpOrder(trumpSuit: Suit): string[] {
	const numbers = isRedSuit(trumpSuit)
		? ['10', '9', '8', '7', '6', '4', '3', '2']
		: ['2', '3', '4', '6', '7', '8', '9', '10'];
	const order: string[] = [`5 ${trumpSuit}`, `J ${trumpSuit}`, `A hearts`];
	if (trumpSuit !== 'hearts') order.push(`A ${trumpSuit}`);
	order.push(`K ${trumpSuit}`, `Q ${trumpSuit}`);
	order.push(...numbers.map((n) => `${n} ${trumpSuit}`));
	return order;
}

/** Verbal rule: plain red K,Q,J,10…2 (A♦ lowest; A♥ never plain); plain black K,Q,J,A,2…10. */
function oraclePlainOrder(suit: Suit): string[] {
	if (isRedSuit(suit)) {
		const order = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
		if (suit === 'diamonds') order.push('A');
		return order.map((r) => `${r} ${suit}`);
	}
	return ['K', 'Q', 'J', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(
		(r) => `${r} ${suit}`
	);
}

function key(c: Card): string {
	return `${c.rank} ${c.suit}`;
}

function oracleWinner(led: Card, second: Card, trumpSuit: Suit): 'led' | 'second' {
	const trumpOrder = oracleTrumpOrder(trumpSuit);
	const ledTrump = trumpOrder.indexOf(key(led));
	const secondTrump = trumpOrder.indexOf(key(second));

	if (ledTrump !== -1 && secondTrump !== -1) {
		return secondTrump < ledTrump ? 'second' : 'led'; // lower index = stronger
	}
	if (secondTrump !== -1) return 'second';
	if (ledTrump !== -1) return 'led';
	if (second.suit !== led.suit) return 'led';

	const plainOrder = oraclePlainOrder(led.suit);
	return plainOrder.indexOf(key(second)) < plainOrder.indexOf(key(led)) ? 'second' : 'led';
}

// --- Exhaustive sweep: 4 trump suits x 52 led x 51 second = 10,608 cases ----

describe('trickWinner agrees with the verbal-rules oracle on every pair', () => {
	for (const trumpSuit of SUITS) {
		it(`trump = ${trumpSuit}`, () => {
			let checked = 0;
			for (const led of FULL_DECK) {
				for (const second of FULL_DECK) {
					if (sameCard(led, second)) continue;
					const actual = trickWinner(led, second, trumpSuit, STANDARD_SCHEME);
					const expected = oracleWinner(led, second, trumpSuit);
					if (actual !== expected) {
						expect.fail(
							`trump ${trumpSuit}: led ${cardLabel(led)}, second ${cardLabel(second)} — ` +
								`engine says ${actual}, oracle says ${expected}`
						);
					}
					checked++;
				}
			}
			expect(checked).toBe(52 * 51);
		});
	}
});
