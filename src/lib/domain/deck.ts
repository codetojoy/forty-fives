/**
 * Deck shuffling and dealing. Pure: all randomness comes from the injected Rng,
 * so deals are deterministic under test.
 */

import { FULL_DECK, type Card } from './cards.js';
import type { Rng } from './rng.js';

/** A fresh 52-card deck, uniformly shuffled (Fisher–Yates). */
export function shuffledDeck(rng: Rng): Card[] {
	const deck = [...FULL_DECK];
	for (let i = deck.length - 1; i > 0; i--) {
		const j = rng.int(i + 1);
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
	return deck;
}

export interface Deal {
	/** One hand per player. */
	hands: Card[][];
	/** The card turned up after dealing; its suit is trump for the hand. */
	turnUp: Card;
	/** The undealt remainder, face down and out of play. */
	stock: Card[];
}

export function deal(rng: Rng, players: number, handSize = 5): Deal {
	const deck = shuffledDeck(rng);
	const hands = Array.from({ length: players }, (_, p) =>
		deck.slice(p * handSize, (p + 1) * handSize)
	);
	const turnUp = deck[players * handSize];
	const stock = deck.slice(players * handSize + 1);
	return { hands, turnUp, stock };
}
