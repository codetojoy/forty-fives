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

export interface AuctionDeal {
	/** One 5-card hand per player. */
	hands: Card[][];
	/** Face-down cards the winning bidder takes after naming trump (empty if none). */
	kitty: Card[];
	/** The undealt remainder, face down and out of play. */
	stock: Card[];
}

/**
 * Auction Forty-Fives deal: five cards to each player and no turn-up — the
 * winning bidder names trump. `kittySize` (default 3, TODO-059) is how many
 * face-down cards are dealt for the bid winner; 0 means the kitty-less "Rec Hall
 * PEI" variant (TODO-011), where those cards stay in the stock. Cards are dealt
 * in the traditional order (three to each player, then the kitty if any, then
 * two to each), though a uniform shuffle makes the order cosmetic.
 */
export function dealAuction(rng: Rng, players = 4, kittySize = 3): AuctionDeal {
	const deck = shuffledDeck(rng);
	const hands: Card[][] = Array.from({ length: players }, () => []);

	let i = 0;
	for (let p = 0; p < players; p++) for (let n = 0; n < 3; n++) hands[p].push(deck[i++]);
	const kitty = deck.slice(i, i + kittySize);
	i += kitty.length;
	for (let p = 0; p < players; p++) for (let n = 0; n < 2; n++) hands[p].push(deck[i++]);

	return { hands, kitty, stock: deck.slice(i) };
}
