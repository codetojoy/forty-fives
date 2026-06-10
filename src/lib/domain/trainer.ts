/**
 * Ranking Trainer question generation (Milestone 0).
 *
 * Questions are weighted toward the cases real players get wrong: trump
 * rankings (the 5/J/A♥ ladder, reversed black numbers) rather than uniform
 * random pairs, per the SPEC's teaching goal.
 */

import { parseCardId, sameCard, SUITS, type Card, type Suit } from './cards.js';
import { createRng, type Rng } from './rng.js';
import { trickWinner, explainTrick, type TrickWinner } from './trick.js';
import { plainStrength, type TrumpScheme } from './trump-scheme.js';

export const QUESTION_CATEGORIES = [
	'trump-vs-trump',
	'trump-vs-plain',
	'follow-suit',
	'off-suit'
] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export interface Question {
	readonly trumpSuit: Suit;
	/** The card that was led. */
	readonly led: Card;
	/** The card played to it. */
	readonly second: Card;
	readonly category: QuestionCategory;
	readonly correct: TrickWinner;
	readonly explanation: string;
}

/** Relative likelihood of each category; trump ranking is the hard part. */
const CATEGORY_WEIGHTS: Record<QuestionCategory, number> = {
	'trump-vs-trump': 40,
	'trump-vs-plain': 25,
	'follow-suit': 20,
	'off-suit': 15
};

function pickCategory(rng: Rng): QuestionCategory {
	const total = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
	let roll = rng.next() * total;
	for (const category of QUESTION_CATEGORIES) {
		roll -= CATEGORY_WEIGHTS[category];
		if (roll < 0) return category;
	}
	return QUESTION_CATEGORIES[0];
}

function trumpCards(trumpSuit: Suit, scheme: TrumpScheme): Card[] {
	// Map preserves insertion order, so this is highest-first.
	return [...scheme.trumpStrengths[trumpSuit].keys()].map(parseCardId);
}

function plainCards(suit: Suit, scheme: TrumpScheme): Card[] {
	return [...scheme.plainStrengths[suit].keys()].map(parseCardId);
}

/** All non-trump cards, given the trump suit. */
function allPlainCards(trumpSuit: Suit, scheme: TrumpScheme): Card[] {
	return SUITS.filter((s) => s !== trumpSuit).flatMap((s) =>
		plainCards(s, scheme).filter((c) => plainStrength(c, scheme) !== null)
	);
}

function pickPair(rng: Rng, pool: readonly Card[], biasTop: boolean): [Card, Card] {
	// Bias half the questions toward the top of the trump ladder, where the
	// 5 / J / A♥ / A surprises live.
	const first =
		biasTop && rng.chance(0.5) ? rng.pick(pool.slice(0, Math.min(4, pool.length))) : rng.pick(pool);
	let other = rng.pick(pool);
	while (sameCard(other, first)) other = rng.pick(pool);
	return rng.chance(0.5) ? [first, other] : [other, first];
}

export function generateQuestion(
	scheme: TrumpScheme,
	rng: Rng = createRng(),
	fixedTrumpSuit?: Suit
): Question {
	const trumpSuit = fixedTrumpSuit ?? rng.pick(SUITS);
	const category = pickCategory(rng);

	let led: Card;
	let second: Card;

	switch (category) {
		case 'trump-vs-trump': {
			[led, second] = pickPair(rng, trumpCards(trumpSuit, scheme), true);
			break;
		}
		case 'trump-vs-plain': {
			const trump = rng.pick(trumpCards(trumpSuit, scheme));
			const plain = rng.pick(allPlainCards(trumpSuit, scheme));
			[led, second] = rng.chance(0.5) ? [trump, plain] : [plain, trump];
			break;
		}
		case 'follow-suit': {
			const suit = rng.pick(SUITS.filter((s) => s !== trumpSuit));
			[led, second] = pickPair(rng, plainCards(suit, scheme), false);
			break;
		}
		case 'off-suit': {
			const plainSuits = SUITS.filter((s) => s !== trumpSuit);
			const ledSuit = rng.pick(plainSuits);
			const secondSuit = rng.pick(plainSuits.filter((s) => s !== ledSuit));
			led = rng.pick(plainCards(ledSuit, scheme));
			second = rng.pick(plainCards(secondSuit, scheme));
			break;
		}
	}

	return {
		trumpSuit,
		led,
		second,
		category,
		correct: trickWinner(led, second, trumpSuit, scheme),
		explanation: explainTrick(led, second, trumpSuit, scheme)
	};
}
