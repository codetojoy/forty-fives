/**
 * Legal-play and renege tests — written BEFORE rules-engine.ts, per SPEC §13:
 * "Reneging is the rule most likely to be implemented incorrectly. Write the
 * renege test cases first, before the implementation."
 *
 * The verbal rules under test (standard scheme):
 *  - Leading a trick: any card.
 *  - Plain suit led: follow suit or play any trump; discarding another plain
 *    suit is illegal while able to follow. If void in the led suit, anything.
 *  - Trump led: must play a trump if holding one — EXCEPT that the renegable
 *    trumps (5 of trumps, J of trumps, A♥) may be withheld when a LOWER trump
 *    is led. They cannot renege against an equal-or-higher renegable lead.
 *  - The A♥ is trump, never a heart: it cannot be forced out by a plain
 *    hearts lead, and holding it does not count as "able to follow hearts".
 */

import { describe, it, expect } from 'vitest';
import {
	FULL_DECK,
	cardId,
	cardLabel,
	isRedSuit,
	parseCardId,
	SUITS
} from '$lib/domain/cards.js';
import type { Card, Suit } from '$lib/domain/cards.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import { analyzePlays, legalPlays } from '$lib/domain/rules-engine.js';
import { createRng } from '$lib/domain/rng.js';

const scheme = STANDARD_SCHEME;

const h = (...cardIds: string[]): Card[] => cardIds.map(parseCardId);
const ids = (cards: readonly Card[]): string[] => cards.map(cardId).sort();

/** Sorted ids of the legal plays for `hand` against `led` (null = leading). */
function legal(hand: Card[], led: string | null, trumpSuit: Suit): string[] {
	return ids(legalPlays(hand, led ? parseCardId(led) : null, trumpSuit, scheme));
}

// --- Named cases: the basic follow rules -------------------------------------

describe('leading a trick', () => {
	it('any card may be led', () => {
		const hand = h('5D', 'AH', 'KH', '2C', '9S');
		expect(legal(hand, null, 'diamonds')).toEqual(ids(hand));
	});

	it('leading has no constraint message', () => {
		const a = analyzePlays(h('5D', 'KH'), null, 'diamonds', scheme);
		expect(a.constraint).toBeNull();
	});
});

describe('following a plain-suit lead', () => {
	it('may follow suit or trump — but never discard while able to follow', () => {
		// Hearts led, diamonds trump: KH follows, 7D trumps, 2C is an illegal discard.
		expect(legal(h('KH', '7D', '2C'), '9H', 'diamonds')).toEqual(['7D', 'KH']);
	});

	it('trumping is legal even when able to follow suit', () => {
		expect(legal(h('KH', '7D'), '9H', 'diamonds')).toContain('7D');
	});

	it('void in the led suit with no trump: anything goes', () => {
		const hand = h('2C', '9S', 'KS');
		expect(legal(hand, '9H', 'diamonds')).toEqual(ids(hand));
	});

	it('void in the led suit: not forced to trump — anything goes', () => {
		// Holds trump (9D) but no hearts; may still discard the 3C.
		const hand = h('9D', '3C');
		expect(legal(hand, '9H', 'diamonds')).toEqual(ids(hand));
	});
});

// --- Named cases: the A♥ is trump, never a heart ------------------------------

describe('the A♥ under a plain hearts lead (trump elsewhere)', () => {
	it('holding the A♥ does not count as able to follow hearts', () => {
		// No plain hearts in hand, so the player is void: anything goes,
		// even though the A♥ is nominally a heart.
		const hand = h('AH', '3C');
		expect(legal(hand, '9H', 'diamonds')).toEqual(ids(hand));
	});

	it('the A♥ may be played as a trump on a hearts lead', () => {
		// KH follows, AH trumps; 3C is an illegal discard.
		expect(legal(h('KH', 'AH', '3C'), '9H', 'diamonds')).toEqual(['AH', 'KH']);
	});
});

// --- Named cases: following a trump lead --------------------------------------

describe('following a trump lead', () => {
	it('must play a trump when holding an ordinary one', () => {
		expect(legal(h('7D', 'KH', '2C'), 'QD', 'diamonds')).toEqual(['7D']);
	});

	it('holding no trump: anything goes', () => {
		const hand = h('KH', '2C', '9S');
		expect(legal(hand, 'QD', 'diamonds')).toEqual(ids(hand));
	});

	it('an A♥ lead is a trump lead', () => {
		// Trump diamonds, A♥ led: the 9D must be played; KH/2C are illegal.
		expect(legal(h('9D', 'KH', '2C'), 'AH', 'diamonds')).toEqual(['9D']);
	});
});

// --- Named cases: reneging ----------------------------------------------------

describe('reneging — the 5 of trumps', () => {
	it('may renege against any other trump lead (nothing outranks it)', () => {
		const otherTrumps = scheme.trumpRankings.diamonds.filter((id) => id !== '5D');
		for (const led of otherTrumps) {
			const hand = h('5D', 'KH', '2C');
			expect(legal(hand, led, 'diamonds'), `led ${led}`).toEqual(ids(hand));
		}
	});
});

describe('reneging — the J of trumps', () => {
	it('may renege against any trump lead below it', () => {
		for (const led of ['AH', 'AD', 'KD', 'QD', '10D', '2D']) {
			const hand = h('JD', '9S');
			expect(legal(hand, led, 'diamonds'), `led ${led}`).toEqual(ids(hand));
		}
	});

	it('cannot renege when the 5 of trumps is led', () => {
		expect(legal(h('JD', '9S'), '5D', 'diamonds')).toEqual(['JD']);
	});
});

describe('reneging — the A♥', () => {
	it('may renege against the A of trumps and below', () => {
		for (const led of ['AD', 'KD', 'QD', '10D', '2D']) {
			const hand = h('AH', '9S');
			expect(legal(hand, led, 'diamonds'), `led ${led}`).toEqual(ids(hand));
		}
	});

	it('cannot renege when the 5 or J of trumps is led', () => {
		expect(legal(h('AH', '9S'), '5D', 'diamonds')).toEqual(['AH']);
		expect(legal(h('AH', '9S'), 'JD', 'diamonds')).toEqual(['AH']);
	});

	it('when hearts are trump, the same renege rights apply', () => {
		expect(legal(h('AH', '3C'), 'KH', 'hearts')).toEqual(['3C', 'AH']); // KH is lower: renege OK
		expect(legal(h('AH', '3C'), 'JH', 'hearts')).toEqual(['AH']); // JH is higher: forced
	});
});

describe('renege protection does not excuse other trumps', () => {
	it('holding another trump still forces a trump play', () => {
		// JD led; the 5D could renege, but the 7D cannot — so a trump must be
		// played. Both trumps are legal (the 5 may be volunteered), KH is not.
		expect(legal(h('5D', '7D', 'KH'), 'JD', 'diamonds')).toEqual(['5D', '7D']);
	});

	it('the protected card itself stays legal while a lower trump is forced', () => {
		// KD led; A♥ may renege but the 9D must answer — legal plays are the trumps.
		expect(legal(h('AH', '9D', '3C'), 'KD', 'diamonds')).toEqual(['9D', 'AH']);
	});

	it('when every trump held is renegable and protected, anything goes', () => {
		// AD led; both the 5D and JD outrank it and may renege.
		const hand = h('5D', 'JD', '9C');
		expect(legal(hand, 'AD', 'diamonds')).toEqual(ids(hand));
	});
});

// --- Constraint messages and renege reporting ---------------------------------

describe('analyzePlays reporting', () => {
	it('explains a forced trump follow', () => {
		const a = analyzePlays(h('7D', 'KH'), parseCardId('QD'), 'diamonds', scheme);
		expect(a.constraint).toMatch(/trump/i);
		expect(ids(a.legal)).toEqual(['7D']);
	});

	it('explains the follow-or-trump rule for a plain lead', () => {
		const a = analyzePlays(h('KH', '7D', '2C'), parseCardId('9H'), 'diamonds', scheme);
		expect(a.constraint).toMatch(/Hearts/);
		expect(a.constraint).toMatch(/trump/i);
	});

	it('reports which cards are reneging right now', () => {
		const a = analyzePlays(h('5D', 'KH', '2C'), parseCardId('JD'), 'diamonds', scheme);
		expect(ids(a.renegingNow)).toEqual(['5D']);
		expect(a.constraint).toBeNull();
	});

	it('reports a protected renegable even when other trumps are forced', () => {
		const a = analyzePlays(h('AH', '9D', '3C'), parseCardId('KD'), 'diamonds', scheme);
		expect(ids(a.renegingNow)).toEqual(['AH']);
	});

	it('reports no reneging when the renegable is forced', () => {
		const a = analyzePlays(h('JD', '9S'), parseCardId('5D'), 'diamonds', scheme);
		expect(a.renegingNow).toEqual([]);
	});

	it('rejects an empty hand', () => {
		expect(() => analyzePlays([], null, 'diamonds', scheme)).toThrow(/empty hand/i);
	});
});

// --- Independent oracle -------------------------------------------------------
// As in trick-exhaustive.test.ts, the oracle derives everything from the verbal
// rules as formulas; it never calls the production rules engine.

/** Verbal rule: 5, J, A♥, [A of trump], K, Q, then numbers — red 10…2, black 2…10. */
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

function key(c: Card): string {
	return `${c.rank} ${c.suit}`;
}

/** Verbal rule: the renegable trumps are the 5 of trumps, J of trumps, and A♥. */
function oracleIsRenegable(c: Card, trumpSuit: Suit): boolean {
	return key(c) === `5 ${trumpSuit}` || key(c) === `J ${trumpSuit}` || key(c) === 'A hearts';
}

function oracleLegalIds(hand: readonly Card[], led: Card | null, trumpSuit: Suit): string[] {
	const order = oracleTrumpOrder(trumpSuit);
	const strengthIdx = new Map(order.map((k, i) => [k, i])); // lower index = stronger
	const idx = (c: Card): number => strengthIdx.get(key(c)) ?? -1;

	if (!led) return ids(hand);

	const ledIdx = idx(led);
	if (ledIdx !== -1) {
		// Trump led.
		const trumps = hand.filter((c) => idx(c) !== -1);
		if (trumps.length === 0) return ids(hand);
		const forced = trumps.filter((c) => !(oracleIsRenegable(c, trumpSuit) && idx(c) < ledIdx));
		return forced.length === 0 ? ids(hand) : ids(trumps);
	}

	// Plain suit led.
	const follows = hand.filter((c) => c.suit === led.suit && idx(c) === -1);
	if (follows.length === 0) return ids(hand);
	const trumps = hand.filter((c) => idx(c) !== -1);
	return ids([...follows, ...trumps]);
}

// --- Exhaustive sweep: every (trump, led, 2-card hand) — 265,200 cases --------

describe('legalPlays agrees with the verbal-rules oracle on every 2-card hand', () => {
	for (const trumpSuit of SUITS) {
		it(`trump = ${trumpSuit}`, () => {
			let checked = 0;
			for (const led of FULL_DECK) {
				const rest = FULL_DECK.filter((c) => c !== led);
				for (let i = 0; i < rest.length; i++) {
					for (let j = i + 1; j < rest.length; j++) {
						const hand = [rest[i], rest[j]];
						const actual = ids(legalPlays(hand, led, trumpSuit, scheme));
						const expected = oracleLegalIds(hand, led, trumpSuit);
						if (actual.join() !== expected.join()) {
							expect.fail(
								`trump ${trumpSuit}: led ${cardLabel(led)}, hand ` +
									`${hand.map(cardLabel).join(' ')} — engine [${actual}], oracle [${expected}]`
							);
						}
						checked++;
					}
				}
			}
			expect(checked).toBe(52 * (51 * 50) / 2);
		});
	}
});

// --- Seeded random 5-card hands against the oracle -----------------------------

describe('legalPlays agrees with the oracle on random 5-card hands', () => {
	for (const trumpSuit of SUITS) {
		it(`trump = ${trumpSuit}`, () => {
			const rng = createRng(45_000 + SUITS.indexOf(trumpSuit));
			for (let n = 0; n < 500; n++) {
				const deck = [...FULL_DECK];
				for (let i = deck.length - 1; i > 0; i--) {
					const j = rng.int(i + 1);
					[deck[i], deck[j]] = [deck[j], deck[i]];
				}
				const led = deck[0];
				const hand = deck.slice(1, 6);
				const actual = ids(legalPlays(hand, led, trumpSuit, scheme));
				const expected = oracleLegalIds(hand, led, trumpSuit);
				expect(actual, `led ${cardLabel(led)}, hand ${hand.map(cardLabel).join(' ')}`).toEqual(
					expected
				);
			}
		});
	}
});
