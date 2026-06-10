/**
 * Card model — pure value objects, no UI dependencies.
 */

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
	readonly suit: Suit;
	readonly rank: Rank;
}

export const RED_SUITS: readonly Suit[] = ['hearts', 'diamonds'];

export function isRedSuit(suit: Suit): boolean {
	return RED_SUITS.includes(suit);
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
	hearts: '♥',
	diamonds: '♦',
	clubs: '♣',
	spades: '♠'
};

export const SUIT_NAMES: Record<Suit, string> = {
	hearts: 'Hearts',
	diamonds: 'Diamonds',
	clubs: 'Clubs',
	spades: 'Spades'
};

const SUIT_LETTERS: Record<Suit, string> = {
	hearts: 'H',
	diamonds: 'D',
	clubs: 'C',
	spades: 'S'
};

export function card(rank: Rank, suit: Suit): Card {
	return Object.freeze({ rank, suit });
}

/** Canonical id, e.g. "AH", "10D", "5C". Used in trump-scheme JSON files. */
export function cardId(c: Card): string {
	return c.rank + SUIT_LETTERS[c.suit];
}

export function parseCardId(id: string): Card {
	const rank = id.slice(0, -1) as Rank;
	const letter = id.slice(-1);
	const suit = (Object.keys(SUIT_LETTERS) as Suit[]).find((s) => SUIT_LETTERS[s] === letter);
	if (!suit || !RANKS.includes(rank)) {
		throw new Error(`Invalid card id: "${id}"`);
	}
	return card(rank, suit);
}

/** Human-readable label, e.g. "5♥", "10♣". */
export function cardLabel(c: Card): string {
	return c.rank + SUIT_SYMBOLS[c.suit];
}

export function sameCard(a: Card, b: Card): boolean {
	return a.suit === b.suit && a.rank === b.rank;
}

/** The full 52-card deck (no joker — joker support is scheme-driven, see SPEC §6). */
export const FULL_DECK: readonly Card[] = Object.freeze(
	SUITS.flatMap((suit) => RANKS.map((rank) => card(rank, suit)))
);
