import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/domain/rng.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import type { Card } from '$lib/domain/cards.js';
import {
	startAuction,
	placeBid,
	passBid,
	nameTrump,
	discardKitty,
	drawCards,
	playCard,
	nextHand,
	currentSeat,
	trickLeader,
	analyzeCurrent,
	AUCTION_SEATS,
	type AuctionGameState
} from '$lib/domain/auction-game-state.js';
import type { AuctionSettingValues } from '$lib/domain/auction-config.js';

const scheme = STANDARD_SCHEME;
const NO_KITTY: AuctionSettingValues = {
	USE_KITTY: false,
	ALLOW_DISCARD: false,
	FINISH_RULE: 'POINTS_120',
	FIRST_LEAD: 'ELDEST'
};
const KITTY_DRAW: AuctionSettingValues = {
	USE_KITTY: true,
	ALLOW_DISCARD: true,
	FINISH_RULE: 'POINTS_120',
	FIRST_LEAD: 'ELDEST'
};
const NOKITTY_DRAW: AuctionSettingValues = {
	USE_KITTY: false,
	ALLOW_DISCARD: true,
	FINISH_RULE: 'POINTS_120',
	FIRST_LEAD: 'ELDEST'
};

/** All card ids across hands + stock, to assert nothing is duplicated or lost. */
function liveCardIds(g: AuctionGameState): string[] {
	return [...g.hands.flat(), ...g.stock].map((c) => `${c.rank}${c.suit}`);
}

describe('bidding', () => {
	it('eldest hand (dealer + 1) bids first', () => {
		const g = startAuction(scheme, createRng(1), 0);
		expect(g.phase.kind).toBe('bidding');
		expect(currentSeat(g)).toBe(1);
	});

	it('a dealer stuck with no bids takes the minimum bid', () => {
		let g = startAuction(scheme, createRng(2), 0);
		g = passBid(g, 1);
		g = passBid(g, 2);
		g = passBid(g, 3);
		g = passBid(g, 0);
		expect(g.phase.kind).toBe('naming-trump');
		expect(g.biddingSeat).toBe(0); // the dealer
		expect(g.bid).toBe(15);
	});

	it('resolves to the highest bidder once all others pass', () => {
		let g = startAuction(scheme, createRng(3), 0);
		g = placeBid(g, 1, 15);
		g = passBid(g, 2);
		g = placeBid(g, 3, 25);
		g = passBid(g, 0);
		// Back to seat 1, who may still raise or pass.
		expect(currentSeat(g)).toBe(1);
		g = passBid(g, 1);
		expect(g.phase.kind).toBe('naming-trump');
		expect(g.biddingSeat).toBe(3);
		expect(g.bid).toBe(25);
	});

	it('rejects a bid that does not beat the standing bid', () => {
		let g = startAuction(scheme, createRng(4), 0);
		g = placeBid(g, 1, 20);
		g = passBid(g, 2);
		expect(() => placeBid(g, 3, 20)).toThrow();
		expect(() => placeBid(g, 3, 15)).toThrow();
	});

	it('rejects acting out of turn', () => {
		const g = startAuction(scheme, createRng(5), 0);
		expect(() => placeBid(g, 2, 15)).toThrow();
		expect(() => passBid(g, 0)).toThrow();
	});
});

describe('naming trump + kitty', () => {
	function reachNaming(seed: number): AuctionGameState {
		let g = startAuction(scheme, createRng(seed), 0);
		g = placeBid(g, 1, 15);
		g = passBid(g, 2);
		g = passBid(g, 3);
		g = passBid(g, 0);
		return g;
	}

	it('the winner takes the three-card kitty (hand of eight) then discards to five', () => {
		let g = reachNaming(6);
		const bidder = g.biddingSeat!;
		g = nameTrump(g, bidder, 'hearts');
		expect(g.trumpSuit).toBe('hearts');
		expect(g.kitty).toHaveLength(0);
		expect(g.hands[bidder]).toHaveLength(8);
		expect(g.phase.kind).toBe('discarding');

		const discards = g.hands[bidder].slice(0, 3);
		g = discardKitty(g, bidder, discards);
		expect(g.hands[bidder]).toHaveLength(5);
		expect(g.phase.kind).toBe('playing');
	});

	it('rejects discarding the wrong number of cards', () => {
		let g = reachNaming(7);
		const bidder = g.biddingSeat!;
		g = nameTrump(g, bidder, 'spades');
		expect(() => discardKitty(g, bidder, g.hands[bidder].slice(0, 2))).toThrow();
	});

	it('only the winning bidder may name trump', () => {
		const g = reachNaming(8);
		const notBidder = (g.biddingSeat! + 1) % AUCTION_SEATS;
		expect(() => nameTrump(g, notBidder, 'clubs')).toThrow();
	});
});

// --- A deterministic legal-play driver, used to play hands to completion -----

function playRandomLegal(g: AuctionGameState, rng: ReturnType<typeof createRng>): AuctionGameState {
	const seat = currentSeat(g)!;
	const { legal } = analyzeCurrent(g, scheme);
	return playCard(g, scheme, seat, rng.pick(legal));
}

function lowestThree(hand: readonly Card[]): Card[] {
	return [...hand].slice(0, 3);
}

function playOneHand(g: AuctionGameState, rng: ReturnType<typeof createRng>): AuctionGameState {
	// Simple auction: eldest bids 15, the rest pass.
	g = placeBid(g, currentSeat(g)!, 15);
	while (g.phase.kind === 'bidding') g = passBid(g, currentSeat(g)!);
	const bidder = g.biddingSeat!;
	g = nameTrump(g, bidder, g.hands[bidder][0].suit);
	g = discardKitty(g, bidder, lowestThree(g.hands[bidder]));
	while (g.phase.kind === 'playing') g = playRandomLegal(g, rng);
	return g;
}

describe('no-kitty config (TODO-011)', () => {
	function reachNamingNoKitty(seed: number): AuctionGameState {
		let g = startAuction(scheme, createRng(seed), 0, NO_KITTY);
		g = placeBid(g, 1, 15);
		g = passBid(g, 2);
		g = passBid(g, 3);
		g = passBid(g, 0);
		return g;
	}

	it('deals no kitty and five cards to each seat', () => {
		const g = startAuction(scheme, createRng(11), 0, NO_KITTY);
		expect(g.config.USE_KITTY).toBe(false);
		expect(g.kitty).toHaveLength(0);
		expect(g.hands.every((h) => h.length === 5)).toBe(true);
	});

	it('naming trump goes straight to play — no take-kitty or discard', () => {
		let g = reachNamingNoKitty(12);
		const bidder = g.biddingSeat!;
		g = nameTrump(g, bidder, 'hearts');
		expect(g.trumpSuit).toBe('hearts');
		expect(g.phase.kind).toBe('playing');
		expect(g.hands[bidder]).toHaveLength(5); // kept the dealt five
		expect(() => discardKitty(g, bidder, g.hands[bidder].slice(0, 3))).toThrow();
	});

	it('plays a full no-kitty hand to a tally', () => {
		const rng = createRng(13);
		let g = startAuction(scheme, rng, 0, NO_KITTY);
		g = placeBid(g, currentSeat(g)!, 15);
		while (g.phase.kind === 'bidding') g = passBid(g, currentSeat(g)!);
		const bidder = g.biddingSeat!;
		g = nameTrump(g, bidder, g.hands[bidder][0].suit);
		expect(g.phase.kind).toBe('playing');
		while (g.phase.kind === 'playing') g = playRandomLegal(g, rng);
		expect(g.phase.kind).toBe('hand-over');
		expect(g.completedTricks).toHaveLength(5);
	});

	it('carries the config forward to the next hand', () => {
		const rng = createRng(14);
		let g = startAuction(scheme, rng, 0, NO_KITTY);
		g = placeBid(g, currentSeat(g)!, 15);
		while (g.phase.kind === 'bidding') g = passBid(g, currentSeat(g)!);
		const bidder = g.biddingSeat!;
		g = nameTrump(g, bidder, g.hands[bidder][0].suit);
		while (g.phase.kind === 'playing') g = playRandomLegal(g, rng);
		if (g.phase.kind === 'hand-over' && g.phase.gameWinner === null) {
			const next = nextHand(g, scheme, rng);
			expect(next.config.USE_KITTY).toBe(false);
			expect(next.kitty).toHaveLength(0);
		}
	});
});

describe('optional draw (TODO-012)', () => {
	function reachAuctionWinner(g: AuctionGameState): AuctionGameState {
		g = placeBid(g, 1, 15);
		g = passBid(g, 2);
		g = passBid(g, 3);
		g = passBid(g, 0);
		return g; // bidder is seat 1 (eldest), dealer 0
	}
	function reachDrawNoKitty(seed: number): AuctionGameState {
		let g = reachAuctionWinner(startAuction(scheme, createRng(seed), 0, NOKITTY_DRAW));
		return nameTrump(g, g.biddingSeat!, g.hands[g.biddingSeat!][0].suit);
	}
	function reachDrawKitty(seed: number): AuctionGameState {
		let g = reachAuctionWinner(startAuction(scheme, createRng(seed), 0, KITTY_DRAW));
		g = nameTrump(g, g.biddingSeat!, g.hands[g.biddingSeat!][0].suit);
		return discardKitty(g, g.biddingSeat!, g.hands[g.biddingSeat!].slice(0, 3));
	}

	it('no-kitty + draw: all four seats draw, eldest first', () => {
		const g = reachDrawNoKitty(21);
		expect(g.phase.kind).toBe('drawing');
		if (g.phase.kind !== 'drawing') return;
		expect(g.phase.drawn).toEqual([false, false, false, false]);
		expect(g.phase.turn).toBe(1); // eldest (dealer 0)
		expect(new Set(liveCardIds(g)).size).toBe(52); // nothing lost: 20 in hands + 32 stock
	});

	it('kitty + draw: the bid winner is skipped (used the kitty)', () => {
		const g = reachDrawKitty(22);
		expect(g.phase.kind).toBe('drawing');
		if (g.phase.kind !== 'drawing') return;
		expect(g.phase.drawn[1]).toBe(true); // bidder (seat 1) already used the kitty
		expect(g.phase.turn).toBe(2); // first non-bidder in eldest order
		const ids = liveCardIds(g);
		expect(new Set(ids).size).toBe(ids.length); // no duplicates
		expect(ids.length).toBe(49); // 20 in hands + 29 stock (3 kitty discards are gone)
	});

	it('exchanges cards: keeps the rest, refills to five, shrinks the stock', () => {
		const g = reachDrawNoKitty(23);
		if (g.phase.kind !== 'drawing') throw new Error('expected drawing');
		const seat = g.phase.turn;
		const discards = g.hands[seat].slice(0, 2);
		const stockBefore = g.stock.length;
		const next = drawCards(g, seat, discards);
		expect(next.hands[seat]).toHaveLength(5);
		expect(next.stock).toHaveLength(stockBefore - 2);
		// The discarded cards are gone from the hand and not in the stock.
		for (const d of discards) {
			expect(next.hands[seat].some((c) => c.rank === d.rank && c.suit === d.suit)).toBe(false);
		}
		const ids = liveCardIds(next);
		expect(new Set(ids).size).toBe(ids.length); // still no duplicates
	});

	it('stand pat (0 discards) keeps the hand and stock, and advances the turn', () => {
		const g = reachDrawNoKitty(24);
		if (g.phase.kind !== 'drawing') throw new Error('expected drawing');
		const seat = g.phase.turn;
		const next = drawCards(g, seat, []);
		expect(next.hands[seat]).toEqual(g.hands[seat]);
		expect(next.stock).toEqual(g.stock);
		if (next.phase.kind === 'drawing') expect(next.phase.turn).not.toBe(seat);
	});

	it('rejects drawing out of turn or a card not in hand', () => {
		const g = reachDrawNoKitty(25);
		if (g.phase.kind !== 'drawing') throw new Error('expected drawing');
		const seat = g.phase.turn;
		const notSeat = (seat + 1) % AUCTION_SEATS;
		expect(() => drawCards(g, notSeat, [])).toThrow();
		const notInHand = g.stock[0]; // a stock card the seat doesn't hold
		expect(() => drawCards(g, seat, [notInHand])).toThrow();
	});

	it('completes the draw round and begins play with five cards each', () => {
		let g = reachDrawNoKitty(26);
		let guard = 0;
		while (g.phase.kind === 'drawing') {
			g = drawCards(g, g.phase.turn, []); // everyone stands pat
			if (++guard > 4) throw new Error('draw did not complete');
		}
		expect(g.phase.kind).toBe('playing');
		expect(g.hands.every((h) => h.length === 5)).toBe(true);
	});
});

describe('playing a hand', () => {
	it('plays five four-card tricks, tallies, and advances dealer on the next hand', () => {
		const rng = createRng(99);
		let g = startAuction(scheme, rng, 0);
		g = playOneHand(g, rng);

		expect(g.phase.kind).toBe('hand-over');
		expect(g.completedTricks).toHaveLength(5);
		for (const t of g.completedTricks) expect(t.plays).toHaveLength(4);
		expect(g.scores).toHaveLength(2);
		expect(g.hands.every((h) => h.length === 0)).toBe(true);

		if (g.phase.kind === 'hand-over' && g.phase.gameWinner === null) {
			const next = nextHand(g, scheme, rng);
			expect(next.dealer).toBe(1);
			expect(next.handNumber).toBe(2);
			expect(next.phase.kind).toBe('bidding');
		}
	});
});

describe('first-trick leader (FIRST_LEAD, TODO-017)', () => {
	const ELDEST_CFG: AuctionSettingValues = {
		USE_KITTY: false,
		ALLOW_DISCARD: false,
		FINISH_RULE: 'POINTS_120',
		FIRST_LEAD: 'ELDEST'
	};
	const LEFT_CFG: AuctionSettingValues = {
		USE_KITTY: false,
		ALLOW_DISCARD: false,
		FINISH_RULE: 'POINTS_120',
		FIRST_LEAD: 'LEFT_OF_BIDDER'
	};

	// Eldest (seat 1, since dealer is 0) opens 15 and everyone else passes, so the
	// bid winner is the known seat 1; trump is named and play begins immediately
	// (no kitty, no draw).
	function reachPlaying(config: AuctionSettingValues, seed: number): AuctionGameState {
		let g = startAuction(scheme, createRng(seed), 0, config);
		g = placeBid(g, 1, 15);
		g = passBid(g, 2);
		g = passBid(g, 3);
		g = passBid(g, 0);
		const bidder = g.biddingSeat!;
		g = nameTrump(g, bidder, g.hands[bidder][0].suit);
		if (g.phase.kind !== 'playing') throw new Error('expected playing');
		return g;
	}

	/** The seats acting in the first trick, in play order. */
	function firstTrickOrder(g: AuctionGameState): number[] {
		const rng = createRng(7);
		const order: number[] = [];
		while (g.completedTricks.length === 0 && g.phase.kind === 'playing') {
			const seat = currentSeat(g)!;
			order.push(seat);
			const { legal } = analyzeCurrent(g, scheme);
			g = playCard(g, scheme, seat, rng.pick(legal));
		}
		return order;
	}

	it('ELDEST: eldest hand (dealer + 1) leads and play runs up the seats', () => {
		const g = reachPlaying(ELDEST_CFG, 31);
		expect(g.biddingSeat).toBe(1);
		expect(trickLeader(g)).toBe(1); // dealer 0 → eldest seat 1
		expect(firstTrickOrder(g)).toEqual([1, 2, 3, 0]);
	});

	it('LEFT_OF_BIDDER: the bid winner’s left leads and the bid winner plays last', () => {
		const g = reachPlaying(LEFT_CFG, 31);
		const bidder = g.biddingSeat!;
		expect(bidder).toBe(1);
		// Leader is the seat to the bid winner's left: (bidder - 1) mod 4.
		expect(trickLeader(g)).toBe((bidder + AUCTION_SEATS - 1) % AUCTION_SEATS);
		// Rotation reverses, so the bid winner is last to play in the trick.
		const order = firstTrickOrder(g);
		expect(order).toEqual([0, 3, 2, 1]);
		expect(order[order.length - 1]).toBe(bidder);
	});
});

describe('full games terminate with a team reaching 120', () => {
	for (const seed of [1, 2, 3, 4, 5]) {
		it(`seed ${seed}`, () => {
			const rng = createRng(seed);
			let g = startAuction(scheme, rng, 0);
			let guard = 0;
			while (!(g.phase.kind === 'hand-over' && g.phase.gameWinner !== null)) {
				if (g.phase.kind === 'hand-over') g = nextHand(g, scheme, rng);
				else g = playOneHand(g, rng);
				if (++guard > 2000) throw new Error('game did not terminate');
			}
			const winner = g.phase.kind === 'hand-over' ? g.phase.gameWinner : null;
			expect(winner).not.toBeNull();
			expect(Math.max(...g.scores)).toBeGreaterThanOrEqual(120);
		});
	}
});
