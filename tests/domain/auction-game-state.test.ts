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
	playCard,
	nextHand,
	currentSeat,
	analyzeCurrent,
	AUCTION_SEATS,
	type AuctionGameState
} from '$lib/domain/auction-game-state.js';

const scheme = STANDARD_SCHEME;

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
