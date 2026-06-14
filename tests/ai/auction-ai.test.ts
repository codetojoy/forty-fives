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
	chooseCardAuction
} from '$lib/ai/auction-ai.js';
import { BUILTIN_PROFILES, defaultSettingValues } from '$lib/domain/auction-config.js';

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
		case 'playing': {
			const seat = currentSeat(g)!;
			return playCard(g, scheme, seat, chooseCardAuction(g, scheme, seat));
		}
		case 'hand-over':
			return nextHand(g, scheme, rng);
	}
}

// Run the property under both rules profiles so the no-kitty path (TODO-011),
// where naming trump goes straight to play, is exercised end-to-end too.
const SELF_PLAY_CONFIGS = [
	{ label: 'with kitty', config: defaultSettingValues() },
	{ label: 'no kitty', config: BUILTIN_PROFILES['Rec Hall'] }
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
