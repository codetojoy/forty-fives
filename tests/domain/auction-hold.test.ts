import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/domain/rng.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import {
	startAuction,
	placeBid,
	passBid,
	holdBid,
	type AuctionGameState,
	type AuctionPhase
} from '$lib/domain/auction-game-state.js';
import type { AuctionSettingValues } from '$lib/domain/auction-config.js';
import type { BidValue } from '$lib/domain/bidding.js';

/*
 * The dealer's hold (ALLOW_HOLD, TODO-042): the dealer may match the standing
 * bid without raising. The displaced bidder must then raise or concede; every
 * other seat is out of the auction. Written before the rules code, per the
 * SPEC §13 tests-first discipline for new rules.
 */

const scheme = STANDARD_SCHEME;

const HOLD_OFF: AuctionSettingValues = {
	USE_KITTY: true,
	NUM_KITTY: 3,
	ALLOW_DISCARD: false,
	ALLOW_HOLD: false,
	FINISH_RULE: 'POINTS_120',
	FIRST_LEAD: 'ELDEST'
};

// These tests exercise the hold feature, so they run with ALLOW_HOLD on explicitly
// rather than relying on the default profile (the default "Common PEI" has it off).
const HOLD_ON: AuctionSettingValues = {
	USE_KITTY: true,
	NUM_KITTY: 3,
	ALLOW_DISCARD: false,
	ALLOW_HOLD: true,
	FINISH_RULE: 'POINTS_120',
	FIRST_LEAD: 'ELDEST'
};

function biddingPhase(g: AuctionGameState): Extract<AuctionPhase, { kind: 'bidding' }> {
	if (g.phase.kind !== 'bidding') throw new Error(`expected bidding, got ${g.phase.kind}`);
	return g.phase;
}

/** Dealer 0; seat 1 bids `bid`, seats 2 and 3 pass — leaving the dealer to speak. */
function reachDealerTurn(seed: number, bid: BidValue = 20): AuctionGameState {
	let g = startAuction(scheme, createRng(seed), 0, HOLD_ON);
	g = placeBid(g, 1, bid);
	g = passBid(g, 2);
	g = passBid(g, 3);
	return g;
}

describe('the dealer hold — legality (ALLOW_HOLD, TODO-042)', () => {
	it('the dealer may hold the standing bid on their turn', () => {
		const g = holdBid(reachDealerTurn(1), 0);
		const p = biddingPhase(g);
		expect(p.highBid).toBe(20); // matched, not raised
		expect(p.highBidder).toBe(0);
		expect(p.heldBy).toBe(0);
	});

	it('rejects a hold when there is no standing bid', () => {
		let g = startAuction(scheme, createRng(2), 0, HOLD_ON);
		g = passBid(g, 1);
		g = passBid(g, 2);
		g = passBid(g, 3);
		expect(biddingPhase(g).turn).toBe(0);
		expect(() => holdBid(g, 0)).toThrow();
	});

	it('rejects a hold by a seat that is not the dealer', () => {
		let g = startAuction(scheme, createRng(3), 0, HOLD_ON);
		g = placeBid(g, 1, 15);
		expect(biddingPhase(g).turn).toBe(2);
		expect(() => holdBid(g, 2)).toThrow();
	});

	it('rejects a hold out of turn', () => {
		let g = startAuction(scheme, createRng(4), 0, HOLD_ON);
		g = placeBid(g, 1, 15);
		expect(() => holdBid(g, 0)).toThrow(); // seat 2 to speak, not the dealer
	});

	it('rejects a hold when ALLOW_HOLD is off', () => {
		let g = startAuction(scheme, createRng(5), 0, HOLD_OFF);
		g = placeBid(g, 1, 20);
		g = passBid(g, 2);
		g = passBid(g, 3);
		expect(() => holdBid(g, 0)).toThrow();
	});

	it('rejects a hold outside the bidding phase', () => {
		let g = reachDealerTurn(6);
		g = passBid(g, 0);
		expect(g.phase.kind).toBe('naming-trump');
		expect(() => holdBid(g, 0)).toThrow();
	});
});

describe('the dealer hold — the duel (ALLOW_HOLD, TODO-042)', () => {
	it('sends the decision back to the displaced bidder, with everyone else out', () => {
		// Seat 2 outbids seat 1, seat 3 passes, the dealer holds seat 2's 20.
		let g = startAuction(scheme, createRng(10), 0, HOLD_ON);
		g = placeBid(g, 1, 15);
		g = placeBid(g, 2, 20);
		g = passBid(g, 3);
		g = holdBid(g, 0);
		const p = biddingPhase(g);
		expect(p.turn).toBe(2); // the displaced bidder speaks next
		expect(p.passed[1]).toBe(true); // seat 1 lost its turn to the duel
		expect(p.passed[3]).toBe(true);
	});

	it('a concession gives the holder the bid at the held value', () => {
		let g = holdBid(reachDealerTurn(11), 0);
		g = passBid(g, 1);
		expect(g.phase.kind).toBe('naming-trump');
		expect(g.biddingSeat).toBe(0);
		expect(g.bid).toBe(20);
	});

	it('the displaced bidder may raise, and the dealer may hold again', () => {
		let g = holdBid(reachDealerTurn(12), 0);
		g = placeBid(g, 1, 25);
		expect(biddingPhase(g).turn).toBe(0);
		g = holdBid(g, 0);
		const p = biddingPhase(g);
		expect(p.highBid).toBe(25);
		expect(p.highBidder).toBe(0);
		expect(p.heldBy).toBe(0);
		g = passBid(g, 1);
		expect(g.biddingSeat).toBe(0);
		expect(g.bid).toBe(25);
	});

	it('holding a 30 forces the concession — no raise exists', () => {
		let g = holdBid(reachDealerTurn(13, 30), 0);
		expect(biddingPhase(g).turn).toBe(1);
		expect(() => placeBid(g, 1, 30)).toThrow(); // nothing beats 30
		g = passBid(g, 1);
		expect(g.biddingSeat).toBe(0);
		expect(g.bid).toBe(30);
	});

	it('the holder may raise instead of holding again, clearing the held state', () => {
		let g = holdBid(reachDealerTurn(14), 0);
		g = placeBid(g, 1, 25);
		g = placeBid(g, 0, 30); // a raise, not a hold
		const p = biddingPhase(g);
		expect(p.heldBy).toBeNull();
		expect(p.turn).toBe(1);
		g = passBid(g, 1);
		expect(g.biddingSeat).toBe(0);
		expect(g.bid).toBe(30);
	});

	it('the holder may pass instead of holding again, conceding the raise', () => {
		let g = holdBid(reachDealerTurn(15), 0);
		g = placeBid(g, 1, 25);
		g = passBid(g, 0);
		expect(g.phase.kind).toBe('naming-trump');
		expect(g.biddingSeat).toBe(1);
		expect(g.bid).toBe(25);
	});

	it('holding works against the partner seat too', () => {
		// Dealer 3: eldest is 0 … partner of dealer 3 is seat 1.
		let g = startAuction(scheme, createRng(16), 3, HOLD_ON);
		g = passBid(g, 0);
		g = placeBid(g, 1, 20); // dealer's partner takes the lead
		g = passBid(g, 2);
		g = holdBid(g, 3);
		const p = biddingPhase(g);
		expect(p.highBidder).toBe(3);
		expect(p.turn).toBe(1);
	});
});
