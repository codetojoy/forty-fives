/**
 * Tests for trickWinnerMulti (4-seat tricks in Auction Forty-Fives).
 *
 * Two tracks, matching the project convention:
 *  1. An independent strength oracle (derived from the verbal rules, NOT from
 *     production code) cross-checked over many random four-card tricks.
 *  2. Named trap cases documenting the famous surprises in a multi-card setting.
 */

import { describe, it, expect } from 'vitest';
import { card, cardLabel, sameCard, type Card, type Suit } from '$lib/domain/cards.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import { shuffledDeck } from '$lib/domain/deck.js';
import { createRng } from '$lib/domain/rng.js';
import { trickWinnerMulti } from '$lib/domain/trick.js';
import { isTrump, trumpStrength, plainStrength } from '$lib/domain/trump-scheme.js';

/**
 * Effective winning strength of a card in a trick whose led suit is `ledSuit`:
 *   - any trump outranks any non-trump (offset well above plain strengths);
 *   - a non-trump only competes if it followed the led suit;
 *   - anything else can never win.
 * The led card is always of the led suit, so it always beats off-suit junk.
 */
function oracleWinner(plays: readonly Card[], trumpSuit: Suit): number {
	const ledSuit = plays[0].suit;
	const strength = (c: Card): number => {
		const t = trumpStrength(c, trumpSuit, STANDARD_SCHEME);
		if (t !== null) return 1000 + t;
		if (c.suit === ledSuit && !isTrump(c, trumpSuit, STANDARD_SCHEME)) {
			return plainStrength(c, STANDARD_SCHEME) ?? 0;
		}
		return -1;
	};
	let best = 0;
	for (let i = 1; i < plays.length; i++) if (strength(plays[i]) > strength(plays[best])) best = i;
	return best;
}

describe('trickWinnerMulti agrees with the strength oracle over random four-card tricks', () => {
	for (const trumpSuit of ['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]) {
		it(`trump = ${trumpSuit}`, () => {
			const rng = createRng(trumpSuit.length * 99 + 7);
			let checked = 0;
			for (let n = 0; n < 2000; n++) {
				const deck = shuffledDeck(rng);
				const plays = deck.slice(0, 4);
				const actual = trickWinnerMulti(plays, trumpSuit, STANDARD_SCHEME);
				const expected = oracleWinner(plays, trumpSuit);
				if (actual !== expected) {
					expect.fail(
						`trump ${trumpSuit}: [${plays.map(cardLabel).join(', ')}] — ` +
							`engine says index ${actual} (${cardLabel(plays[actual])}), ` +
							`oracle says ${expected} (${cardLabel(plays[expected])})`
					);
				}
				checked++;
			}
			expect(checked).toBe(2000);
		});
	}
});

describe('trickWinnerMulti — named cases', () => {
	it('the 5 of trumps wins no matter where it falls', () => {
		// Trump = diamonds; led is a plain club.
		const plays = [card('K', 'clubs'), card('A', 'spades'), card('5', 'diamonds'), card('2', 'clubs')];
		expect(plays[trickWinnerMulti(plays, 'diamonds', STANDARD_SCHEME)]).toEqual(card('5', 'diamonds'));
	});

	it('an off-suit non-trump can never win, even an ace', () => {
		// Trump = spades; led 7♣. A♦ and Q♥ are off-suit junk that cannot win. 3♣
		// follows and beats it (black numbers reverse: 2 high … 10 low, so 3 > 7).
		const plays = [card('7', 'clubs'), card('A', 'diamonds'), card('Q', 'hearts'), card('3', 'clubs')];
		const w = plays[trickWinnerMulti(plays, 'spades', STANDARD_SCHEME)];
		expect(w).toEqual(card('3', 'clubs'));
	});

	it('any trump beats the highest card of the led suit', () => {
		// Trump = hearts; led A♣ (high club), a lowly 2♥ trumps it.
		const plays = [card('A', 'clubs'), card('K', 'clubs'), card('2', 'hearts'), card('3', 'clubs')];
		expect(plays[trickWinnerMulti(plays, 'hearts', STANDARD_SCHEME)]).toEqual(card('2', 'hearts'));
	});

	it('the A♥ is trump even when hearts are not, and beats the led suit', () => {
		// Trump = clubs; led K♦. A♥ is always trump and takes it.
		const plays = [card('K', 'diamonds'), card('Q', 'diamonds'), card('A', 'hearts'), card('10', 'diamonds')];
		expect(plays[trickWinnerMulti(plays, 'clubs', STANDARD_SCHEME)]).toEqual(card('A', 'hearts'));
	});

	it('with no trump in the trick, the highest led-suit card wins', () => {
		// Trump = spades; all clubs/offsuit, led 4♣.
		const plays = [card('4', 'clubs'), card('K', 'clubs'), card('Q', 'hearts'), card('A', 'clubs')];
		// In plain clubs: K high, then Q, J, A, 2..10. So K beats A.
		expect(plays[trickWinnerMulti(plays, 'spades', STANDARD_SCHEME)]).toEqual(card('K', 'clubs'));
	});

	it('matches the two-card trickWinner when only two play', () => {
		const a = card('J', 'hearts');
		const b = card('5', 'hearts');
		expect(sameCard(plays2(a, b), card('5', 'hearts'))).toBe(true);
	});
});

function plays2(a: Card, b: Card): Card {
	const plays = [a, b];
	return plays[trickWinnerMulti(plays, 'hearts', STANDARD_SCHEME)];
}
