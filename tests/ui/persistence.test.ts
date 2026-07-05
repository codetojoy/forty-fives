/**
 * The pure parts of the persistence layer (TODO-046): expiring a finished
 * auction game so a return visit more than an hour later starts fresh. The
 * storage plumbing itself is browser-only and stays untested; these tests
 * drive the decision function with real game states and a fake clock.
 */
import { describe, it, expect } from 'vitest';
import type { Card } from '$lib/domain/cards.js';
import { createRng } from '$lib/domain/rng.js';
import { STANDARD_SCHEME } from '$lib/domain/schemes.js';
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
	isAuctionGameOver,
	type AuctionGameState
} from '$lib/domain/auction-game-state.js';
import {
	expireFinishedAuctionGame,
	FINISHED_GAME_TTL_MS,
	type SavedAuctionGame
} from '$lib/ui/persistence.js';

const scheme = STANDARD_SCHEME;

function playOneHand(g: AuctionGameState, rng: ReturnType<typeof createRng>): AuctionGameState {
	// Simple auction: eldest bids 15, the rest pass (as in the domain tests).
	g = placeBid(g, currentSeat(g)!, 15);
	while (g.phase.kind === 'bidding') g = passBid(g, currentSeat(g)!);
	const bidder = g.biddingSeat!;
	g = nameTrump(g, bidder, g.hands[bidder][0].suit);
	g = discardKitty(g, bidder, [...g.hands[bidder]].slice(0, 3) as Card[]);
	while (g.phase.kind === 'playing') {
		const seat = currentSeat(g)!;
		const { legal } = analyzeCurrent(g, scheme);
		g = playCard(g, scheme, seat, rng.pick(legal));
	}
	return g;
}

/** A real completed game, driven through the domain transitions. */
function finishedGame(): AuctionGameState {
	const rng = createRng(1);
	let g = startAuction(scheme, rng, 0);
	let guard = 0;
	while (!isAuctionGameOver(g)) {
		if (g.phase.kind === 'hand-over') g = nextHand(g, scheme, rng);
		else g = playOneHand(g, rng);
		if (++guard > 2000) throw new Error('game did not terminate');
	}
	return g;
}

const done = finishedGame();
const inProgress = startAuction(scheme, createRng(2), 0);

function envelope(game: AuctionGameState | null, finishedAt: number | null): SavedAuctionGame {
	return {
		game,
		settings: { highlightLegal: true, confirmPlay: false, alwaysExchangeNonTrump: false },
		names: ['You', 'Stewart', 'Margaret', 'Bernadette'],
		finishedAt
	};
}

describe('expireFinishedAuctionGame (TODO-046)', () => {
	const t = 1_000_000_000;

	it('keeps a finished game that completed within the hour', () => {
		const saved = envelope(done, t);
		expect(expireFinishedAuctionGame(saved, t + FINISHED_GAME_TTL_MS)).toEqual(saved);
	});

	it('drops a finished game more than an hour old, keeping settings and names', () => {
		const saved = envelope(done, t);
		const pruned = expireFinishedAuctionGame(saved, t + FINISHED_GAME_TTL_MS + 1);
		expect(pruned.game).toBeNull();
		expect(pruned.finishedAt).toBeNull();
		expect(pruned.settings).toEqual(saved.settings);
		expect(pruned.names).toEqual(saved.names);
	});

	it('drops a finished game with no completion stamp (pre-TODO-046 save)', () => {
		const pruned = expireFinishedAuctionGame(envelope(done, null), t);
		expect(pruned.game).toBeNull();
	});

	it('never drops an in-progress game, whatever its age', () => {
		const saved = envelope(inProgress, null);
		expect(expireFinishedAuctionGame(saved, Number.MAX_SAFE_INTEGER)).toEqual(saved);
		// Even a (nonsensical) ancient stamp must not expire a resumable game.
		const stamped = envelope(inProgress, 0);
		expect(expireFinishedAuctionGame(stamped, Number.MAX_SAFE_INTEGER)).toEqual(stamped);
	});

	it('passes a save with no game through unchanged', () => {
		const saved = envelope(null, null);
		expect(expireFinishedAuctionGame(saved, t)).toEqual(saved);
	});
});
