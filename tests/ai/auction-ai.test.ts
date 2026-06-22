/**
 * The auction AI is tested by property: it drives all four seats through the
 * real transitions (which throw on any illegal play, bid, or discard), and
 * every seeded game must terminate with a team reaching 120. Plus a few
 * sanity checks on bid estimation and partnership-aware play.
 */

import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/domain/rng.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
import { card, type Card } from '$lib/domain/cards.js';
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
	type AuctionGameState
} from '$lib/domain/auction-game-state.js';
import {
	estimateBid,
	chooseBid,
	chooseTrump,
	chooseKittyDiscards,
	chooseDraw,
	chooseCardAuction
} from '$lib/ai/auction-ai.js';
import { defaultSettingValues, type AuctionSettingValues } from '$lib/domain/auction-config.js';
import { handsPerGame } from '$lib/domain/auction-scoring.js';

const scheme = STANDARD_SCHEME;

function step(g: AuctionGameState, rng: ReturnType<typeof createRng>): AuctionGameState {
	switch (g.phase.kind) {
		case 'bidding': {
			const seat = currentSeat(g)!;
			const d = chooseBid(g, scheme, seat);
			return d.bid === null ? passBid(g, seat) : placeBid(g, seat, d.bid);
		}
		case 'naming-trump': {
			const seat = g.biddingSeat!;
			return nameTrump(g, seat, chooseTrump(g, scheme, seat));
		}
		case 'discarding': {
			const seat = g.biddingSeat!;
			return discardKitty(g, seat, chooseKittyDiscards(g, scheme, seat));
		}
		case 'drawing': {
			const seat = currentSeat(g)!;
			return drawCards(g, seat, chooseDraw(g, scheme, seat));
		}
		case 'playing': {
			const seat = currentSeat(g)!;
			return playCard(g, scheme, seat, chooseCardAuction(g, scheme, seat));
		}
		case 'hand-over':
			return nextHand(g, scheme, rng);
	}
}

// Run the property under all four rules combos so every routing path is
// exercised end-to-end: the kitty take/discard (TODO-011), the no-kitty
// straight-to-play, and the optional draw (TODO-012) for both kitty settings.
const SELF_PLAY_CONFIGS: { label: string; config: AuctionSettingValues }[] = [
	{
		label: 'kitty, no draw',
		config: {
			USE_KITTY: true,
			ALLOW_DISCARD: false,
			FINISH_RULE: 'POINTS_120',
			FIRST_LEAD: 'ELDEST'
		}
	},
	{
		label: 'no kitty, no draw',
		config: {
			USE_KITTY: false,
			ALLOW_DISCARD: false,
			FINISH_RULE: 'POINTS_120',
			FIRST_LEAD: 'ELDEST'
		}
	},
	{
		label: 'kitty + draw, left-of-bidder lead',
		config: {
			USE_KITTY: true,
			ALLOW_DISCARD: true,
			FINISH_RULE: 'POINTS_120',
			FIRST_LEAD: 'LEFT_OF_BIDDER'
		}
	},
	{
		label: 'no kitty + draw, left-of-bidder lead',
		config: {
			USE_KITTY: false,
			ALLOW_DISCARD: true,
			FINISH_RULE: 'POINTS_120',
			FIRST_LEAD: 'LEFT_OF_BIDDER'
		}
	}
];

for (const { label, config } of SELF_PLAY_CONFIGS) {
	describe(`all-AI self-play terminates with a winner (${label})`, () => {
		for (let seed = 1; seed <= 40; seed++) {
			it(`seed ${seed}`, () => {
				const rng = createRng(seed);
				let g = startAuction(scheme, rng, undefined, config);
				let guard = 0;
				while (!(g.phase.kind === 'hand-over' && g.phase.gameWinner !== null)) {
					g = step(g, rng);
					if (++guard > 5000) throw new Error('game did not terminate');
				}
				expect(g.phase.kind).toBe('hand-over');
				const winner = g.phase.kind === 'hand-over' ? g.phase.gameWinner : null;
				expect(winner).not.toBeNull();
				expect(g.scores[winner!]).toBeGreaterThanOrEqual(120);
			});
		}
	});
}

// The FOUR_TURNS finish rule (TODO-018) ends a game by hand count, not by points,
// so it gets its own block with a count-based termination assertion.
describe('all-AI self-play terminates under FOUR_TURNS', () => {
	const config: AuctionSettingValues = {
		USE_KITTY: true,
		ALLOW_DISCARD: false,
		FINISH_RULE: 'FOUR_TURNS',
		FIRST_LEAD: 'ELDEST'
	};
	for (let seed = 1; seed <= 40; seed++) {
		it(`seed ${seed}`, () => {
			const rng = createRng(seed);
			let g = startAuction(scheme, rng, undefined, config);
			let guard = 0;
			while (!(g.phase.kind === 'hand-over' && g.phase.gameWinner !== null)) {
				g = step(g, rng);
				if (++guard > 5000) throw new Error('game did not terminate');
			}
			expect(g.handNumber).toBeGreaterThanOrEqual(handsPerGame());
			const winner = g.phase.kind === 'hand-over' ? g.phase.gameWinner! : -1;
			// No points target: the leading team wins outright.
			expect(g.scores[winner]).toBeGreaterThan(g.scores[1 - winner]);
		});
	}
});

describe('estimateBid', () => {
	it('rates a hand full of top trumps highly and names that suit', () => {
		const monster: Card[] = [
			card('5', 'hearts'),
			card('J', 'hearts'),
			card('A', 'hearts'),
			card('K', 'hearts'),
			card('Q', 'hearts')
		];
		const est = estimateBid(monster, scheme);
		expect(est.suit).toBe('hearts');
		expect(est.power).toBeGreaterThanOrEqual(20);
	});

	it('drops the kitty lift when useKitty is false (TODO-011)', () => {
		const hand: Card[] = [
			card('5', 'hearts'),
			card('J', 'hearts'),
			card('A', 'hearts'),
			card('K', 'hearts'),
			card('Q', 'hearts')
		];
		expect(estimateBid(hand, scheme, false).power).toBe(estimateBid(hand, scheme, true).power - 3);
	});

	it('rates a junk hand low', () => {
		const junk: Card[] = [
			card('2', 'clubs'),
			card('3', 'clubs'),
			card('4', 'spades'),
			card('6', 'spades'),
			card('7', 'diamonds')
		];
		expect(estimateBid(junk, scheme).power).toBeLessThan(15);
	});
});

describe('chooseBid', () => {
	function biddingState(hand: Card[]): AuctionGameState {
		return {
			schemeId: scheme.id,
			config: defaultSettingValues(),
			handNumber: 1,
			dealer: 0,
			hands: [hand, hand, hand, hand],
			kitty: [],
			stock: [],
			bid: null,
			biddingSeat: null,
			trumpSuit: null,
			currentTrick: [],
			completedTricks: [],
			scores: [0, 0],
			phase: { kind: 'bidding', turn: 1, highBid: null, highBidder: null, passed: [false, false, false, false] }
		};
	}

	it('passes on a junk hand', () => {
		const junk = [
			card('2', 'clubs'),
			card('3', 'clubs'),
			card('4', 'spades'),
			card('6', 'spades'),
			card('7', 'diamonds')
		];
		expect(chooseBid(biddingState(junk), scheme, 1).bid).toBeNull();
	});

	it('bids on a strong hand', () => {
		const strong = [
			card('5', 'hearts'),
			card('J', 'hearts'),
			card('A', 'hearts'),
			card('K', 'hearts'),
			card('Q', 'hearts')
		];
		expect(chooseBid(biddingState(strong), scheme, 1).bid).not.toBeNull();
	});
});

describe('chooseDraw', () => {
	function drawingState(hand: Card[]): AuctionGameState {
		return {
			schemeId: scheme.id,
			config: {
				USE_KITTY: false,
				ALLOW_DISCARD: true,
				FINISH_RULE: 'POINTS_120',
				FIRST_LEAD: 'ELDEST'
			},
			handNumber: 1,
			dealer: 0,
			hands: [hand, hand, hand, hand],
			kitty: [],
			stock: [],
			bid: 15,
			biddingSeat: 1,
			trumpSuit: 'hearts',
			currentTrick: [],
			completedTricks: [],
			scores: [0, 0],
			phase: { kind: 'drawing', turn: 0, drawn: [false, false, false, false] }
		};
	}

	it('keeps trumps and off-suit honours, exchanges only weak non-trump numbers', () => {
		const hand = [
			card('5', 'hearts'), // trump — keep
			card('K', 'hearts'), // trump — keep
			card('A', 'spades'), // off-suit honour — keep
			card('7', 'clubs'), // weak non-trump — exchange
			card('3', 'diamonds') // weak non-trump — exchange
		];
		const out = chooseDraw(drawingState(hand), scheme, 0);
		const ids = out.map((c) => `${c.rank}${c.suit}`).sort();
		expect(ids).toEqual(['3diamonds', '7clubs']);
	});

	it('stands pat on an all-trump hand', () => {
		const hand = [
			card('5', 'hearts'),
			card('J', 'hearts'),
			card('A', 'hearts'),
			card('K', 'hearts'),
			card('Q', 'hearts')
		];
		expect(chooseDraw(drawingState(hand), scheme, 0)).toHaveLength(0);
	});
});

describe('AI opens often enough (regression: it once almost never bid)', () => {
	it('a healthy share of deals have at least one seat willing to open', () => {
		// Guards against the valuation drifting back to where it was so pessimistic
		// the dealer was almost always stuck at 15 because nobody actively bid.
		const N = 300;
		let dealsWithABidder = 0;
		for (let seed = 0; seed < N; seed++) {
			const g = startAuction(scheme, createRng(seed));
			// highBid is null at the open, so chooseBid here is each seat's opening call.
			if ([0, 1, 2, 3].some((seat) => chooseBid(g, scheme, seat).bid !== null)) {
				dealsWithABidder++;
			}
		}
		expect(dealsWithABidder / N).toBeGreaterThan(0.4);
	});
});
