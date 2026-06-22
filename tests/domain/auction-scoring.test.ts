import { describe, it, expect } from 'vitest';
import { card, type Card } from '$lib/domain/cards.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import type { CompletedTrick } from '$lib/domain/game-state.js';
import {
	scoreAuctionHand,
	auctionGameWinner,
	decideGameWinner,
	handsPerGame,
	teamOf,
	seatsOfTeam
} from '$lib/domain/auction-scoring.js';

/** Build a 4-seat completed trick (plays seated 0..3) with an explicit winner. */
function trick(winner: number, cards: Card[]): CompletedTrick {
	return { plays: cards.map((card, seat) => ({ seat, card })), winner };
}

// Trump = hearts throughout. Non-trump filler clubs (and never the A♥).
const filler = [card('2', 'clubs'), card('3', 'clubs'), card('4', 'clubs'), card('6', 'clubs')];
const fillerWith5H = [card('5', 'hearts'), card('3', 'clubs'), card('4', 'clubs'), card('6', 'clubs')];

describe('team mapping', () => {
	it('partners sit opposite: 0&2 vs 1&3', () => {
		expect([0, 1, 2, 3].map(teamOf)).toEqual([0, 1, 0, 1]);
		expect(seatsOfTeam(0)).toEqual([0, 2]);
		expect(seatsOfTeam(1)).toEqual([1, 3]);
	});
});

describe('scoreAuctionHand', () => {
	it('banks the gross for both teams when the bidding team makes its bid', () => {
		// Team 0 wins 4 tricks incl. the 5♥ trick (20 + 5 bonus = 25); team 1 wins 1 (5).
		const tricks = [
			trick(0, fillerWith5H),
			trick(2, filler),
			trick(0, filler),
			trick(2, filler),
			trick(1, filler)
		];
		const s = scoreAuctionHand(tricks, 'hearts', STANDARD_SCHEME, 15, 0);
		expect(s.teamGross).toEqual([25, 5]);
		expect(s.bidMade).toBe(true);
		expect(s.teamDelta).toEqual([25, 5]);
		expect(s.bonusSeat).toBe(0);
	});

	it('sets the bidding team (subtracts the bid) when it falls short', () => {
		// Team 0 wins only 2 tricks (10); team 1 wins 3 incl. the bonus (20).
		const tricks = [
			trick(0, filler),
			trick(2, filler),
			trick(1, fillerWith5H),
			trick(3, filler),
			trick(1, filler)
		];
		const s = scoreAuctionHand(tricks, 'hearts', STANDARD_SCHEME, 25, 0);
		expect(s.teamGross).toEqual([10, 20]);
		expect(s.bidMade).toBe(false);
		expect(s.teamDelta).toEqual([-25, 20]); // bidding team set, defenders bank theirs
	});

	it('awards no bonus when no trump is played (hand totals 25, not 30)', () => {
		const tricks = [
			trick(0, filler),
			trick(2, filler),
			trick(0, filler),
			trick(1, filler),
			trick(3, filler)
		];
		const s = scoreAuctionHand(tricks, 'hearts', STANDARD_SCHEME, 15, 0);
		expect(s.bonusCard).toBeNull();
		expect(s.teamGross[0] + s.teamGross[1]).toBe(25);
	});
});

describe('auctionGameWinner', () => {
	it('returns null while both teams are below the target', () => {
		expect(auctionGameWinner([100, 90], 0)).toBeNull();
	});

	it('lets the defending team win if they reach the target and the bidder did not', () => {
		expect(auctionGameWinner([120, 118], 1)).toBe(0);
	});

	it('counts the bidding team out first when both cross in the same hand', () => {
		// Team 1 has the higher total, but team 0 bid and reached 120, so team 0 wins.
		expect(auctionGameWinner([120, 121], 0)).toBe(0);
	});
});

describe('decideGameWinner — finish rules (TODO-018)', () => {
	const LIMIT = handsPerGame(); // 4 hands — a fast rec-hall game (TODO-019)

	it('handsPerGame is 4 turns of the table = 4 hands', () => {
		expect(handsPerGame()).toBe(4);
	});

	describe('POINTS_120', () => {
		it('defers to the points rule (counts the bidder out first)', () => {
			expect(decideGameWinner('POINTS_120', [120, 121], 0, 3)).toBe(0);
		});

		it('continues while both teams are below 120, regardless of hand number', () => {
			expect(decideGameWinner('POINTS_120', [100, 90], 0, 99)).toBeNull();
		});
	});

	describe('FOUR_TURNS', () => {
		it('continues before the hand limit even when a team is well past 120', () => {
			expect(decideGameWinner('FOUR_TURNS', [200, 30], 0, LIMIT - 1)).toBeNull();
		});

		it('ends at the limit with the higher total winning', () => {
			expect(decideGameWinner('FOUR_TURNS', [85, 70], 1, LIMIT)).toBe(0);
			expect(decideGameWinner('FOUR_TURNS', [70, 85], 0, LIMIT)).toBe(1);
		});

		it('does not let the bidding team count out first — only the score decides', () => {
			// Team 1 leads on points; even though team 0 bid, team 1 wins at the limit.
			expect(decideGameWinner('FOUR_TURNS', [90, 95], 0, LIMIT)).toBe(1);
		});

		it('plays on (sudden death) when tied at the limit', () => {
			expect(decideGameWinner('FOUR_TURNS', [100, 100], 0, LIMIT)).toBeNull();
		});

		it('breaks a sudden-death tie once the totals separate past the limit', () => {
			expect(decideGameWinner('FOUR_TURNS', [110, 100], 1, LIMIT + 1)).toBe(0);
		});
	});
});
