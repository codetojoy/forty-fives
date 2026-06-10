/**
 * Trump scheme — loads regional rule variants from JSON and answers
 * "how strong is this card?" questions. Regional variants are data, not code
 * (SPEC §6): loading a different scheme file must be the only thing that
 * changes between variants.
 */

import {
	SUITS,
	RANKS,
	cardId,
	parseCardId,
	type Card,
	type Rank,
	type Suit
} from './cards.js';

/** Shape of a trump-scheme JSON file (src/lib/assets/trump-schemes/*.json). */
export interface TrumpSchemeData {
	id: string;
	name: string;
	description: string;
	useJoker: boolean;
	/** Where the joker ranks among trumps (0 = highest), or null when unused. */
	jokerTrumpPosition: number | null;
	aceOfHeartsAlwaysTrump: boolean;
	/** For each trump suit: every trump card id, highest first. */
	trumpRankings: Record<Suit, string[]>;
	/** For each suit when it is NOT trump: card ids, highest first. */
	plainRankings: Record<Suit, string[]>;
	/** Carried for Milestone 1+ (renege enforcement); informational in Milestone 0. */
	reneging: {
		renegableTrumpRanks: string[];
		description: string;
	};
	/** Carried for Milestone 1+ (scoring); informational in Milestone 0. */
	scoring: {
		gameTarget: number;
		trickValue: number;
		highestTrumpBonus: number;
	};
}

/** A validated scheme with fast strength lookups. */
export interface TrumpScheme extends TrumpSchemeData {
	/** trumpStrengths[trumpSuit][cardId] — larger is stronger; only trump cards present. */
	readonly trumpStrengths: Record<Suit, ReadonlyMap<string, number>>;
	/** plainStrengths[suit][cardId] — larger is stronger; only cards of that suit present. */
	readonly plainStrengths: Record<Suit, ReadonlyMap<string, number>>;
}

function fail(schemeId: string, message: string): never {
	throw new Error(`Invalid trump scheme "${schemeId}": ${message}`);
}

function parseRanking(schemeId: string, context: string, ids: string[]): Card[] {
	const seen = new Set<string>();
	return ids.map((id) => {
		if (seen.has(id)) fail(schemeId, `${context} lists "${id}" twice`);
		seen.add(id);
		try {
			return parseCardId(id);
		} catch {
			fail(schemeId, `${context} contains invalid card id "${id}"`);
		}
	});
}

/**
 * Validate raw JSON data and build lookup tables. Throws with a descriptive
 * message on any structural problem, so a typo in a scheme file fails loudly
 * at load time rather than silently mis-ranking cards.
 */
export function loadTrumpScheme(data: TrumpSchemeData): TrumpScheme {
	const id = data.id;
	if (!id || typeof id !== 'string') throw new Error('Trump scheme is missing an "id"');

	if (data.useJoker) {
		fail(id, 'joker support is declared but not yet implemented (jokerTrumpPosition is unused)');
	}

	const trumpStrengths = {} as Record<Suit, ReadonlyMap<string, number>>;
	const plainStrengths = {} as Record<Suit, ReadonlyMap<string, number>>;

	for (const trumpSuit of SUITS) {
		const ids = data.trumpRankings?.[trumpSuit];
		if (!Array.isArray(ids)) fail(id, `trumpRankings.${trumpSuit} is missing`);
		const cards = parseRanking(id, `trumpRankings.${trumpSuit}`, ids);

		// The trump ranking must contain exactly the 13 cards of the trump suit,
		// plus the A♥ when hearts are not trump and the A♥ is always trump.
		const expected = new Set<string>(RANKS.map((r: Rank) => cardId({ rank: r, suit: trumpSuit })));
		if (data.aceOfHeartsAlwaysTrump && trumpSuit !== 'hearts') expected.add('AH');
		for (const c of cards) {
			if (!expected.delete(cardId(c))) {
				fail(id, `trumpRankings.${trumpSuit} contains unexpected card "${cardId(c)}"`);
			}
		}
		if (expected.size > 0) {
			fail(id, `trumpRankings.${trumpSuit} is missing: ${[...expected].join(', ')}`);
		}

		// Strength = distance from the bottom, so larger is stronger.
		trumpStrengths[trumpSuit] = new Map(cards.map((c, i) => [cardId(c), cards.length - i]));
	}

	for (const suit of SUITS) {
		const ids = data.plainRankings?.[suit];
		if (!Array.isArray(ids)) fail(id, `plainRankings.${suit} is missing`);
		const cards = parseRanking(id, `plainRankings.${suit}`, ids);

		const expected = new Set<string>(RANKS.map((r: Rank) => cardId({ rank: r, suit })));
		if (data.aceOfHeartsAlwaysTrump && suit === 'hearts') expected.delete('AH');
		for (const c of cards) {
			if (!expected.delete(cardId(c))) {
				fail(id, `plainRankings.${suit} contains unexpected card "${cardId(c)}"`);
			}
		}
		if (expected.size > 0) {
			fail(id, `plainRankings.${suit} is missing: ${[...expected].join(', ')}`);
		}

		plainStrengths[suit] = new Map(cards.map((c, i) => [cardId(c), cards.length - i]));
	}

	return { ...data, trumpStrengths, plainStrengths };
}

/** Is this card a trump under the given trump suit? */
export function isTrump(c: Card, trumpSuit: Suit, scheme: TrumpScheme): boolean {
	return scheme.trumpStrengths[trumpSuit].has(cardId(c));
}

/** Strength among trumps (larger beats smaller), or null if the card is not trump. */
export function trumpStrength(c: Card, trumpSuit: Suit, scheme: TrumpScheme): number | null {
	return scheme.trumpStrengths[trumpSuit].get(cardId(c)) ?? null;
}

/**
 * Strength within the card's own suit when that suit is not trump
 * (larger beats smaller), or null if the card never ranks as a plain card
 * (the A♥ when it is always trump).
 */
export function plainStrength(c: Card, scheme: TrumpScheme): number | null {
	return scheme.plainStrengths[c.suit].get(cardId(c)) ?? null;
}

/** 1-based position of a trump card from the top (1 = highest trump), or null. */
export function trumpPosition(c: Card, trumpSuit: Suit, scheme: TrumpScheme): number | null {
	const s = trumpStrength(c, trumpSuit, scheme);
	return s === null ? null : scheme.trumpStrengths[trumpSuit].size - s + 1;
}
