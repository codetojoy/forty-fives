/**
 * The pure parts of the persistence layer (TODO-046/047): expiring a finished
 * game — auction or 1v1 — so a return visit more than an hour later starts
 * fresh. The storage plumbing itself is browser-only and stays untested; these
 * tests drive the decision functions with real game states and a fake clock.
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
	startGame,
	declineRob,
	isGameOver,
	playCard as playCard1v1,
	nextHand as nextHand1v1,
	currentSeat as currentSeat1v1,
	analyzeCurrent as analyzeCurrent1v1,
	type GameState
} from '$lib/domain/game-state.js';
import {
	expireFinishedAuctionGame,
	expireFinishedGame,
	FINISHED_GAME_TTL_MS,
	type SavedAuctionGame,
	type SavedGame
} from '$lib/ui/persistence.js';

const scheme = STANDARD_SCHEME;

// Kitty on, no extra discard: playOneHand below drives kitty → discard → play with
// no drawing phase, so it needs a profile without the discard (the default profile
// "Common PEI" now enables it).
const KITTY_NO_DRAW = {
	USE_KITTY: true,
	ALLOW_DISCARD: false,
	ALLOW_HOLD: true,
	FINISH_RULE: 'POINTS_120',
	FIRST_LEAD: 'ELDEST'
} as const;

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
	let g = startAuction(scheme, rng, 0, KITTY_NO_DRAW);
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
		settings: {
			highlightLegal: true,
			confirmPlay: false,
			alwaysExchangeNonTrump: false,
			hidePlayers: false,
			handOrder: 'none'
		},
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

// --- The 1v1 game (TODO-047) ---------------------------------------------------

function autoplayHand1v1(state: GameState): GameState {
	if (state.phase.kind === 'robbing') state = declineRob(state);
	while (state.phase.kind === 'playing') {
		const seat = currentSeat1v1(state)!;
		state = playCard1v1(state, scheme, seat, analyzeCurrent1v1(state, scheme).legal[0]);
	}
	return state;
}

/** A real completed 1v1 game, driven through the domain transitions. */
function finishedGame1v1(): GameState {
	const rng = createRng(3);
	let state = autoplayHand1v1(startGame(scheme, rng, 0));
	let guard = 0;
	while (!isGameOver(state)) {
		state = autoplayHand1v1(nextHand1v1(state, scheme, rng));
		if (++guard > 60) throw new Error('game did not terminate');
	}
	return state;
}

const done1v1 = finishedGame1v1();
const inProgress1v1 = startGame(scheme, createRng(4), 0);

function envelope1v1(game: GameState | null, finishedAt: number | null): SavedGame {
	return {
		game,
		settings: { highlightLegal: true, confirmPlay: false },
		opponentName: 'Margaret',
		finishedAt
	};
}

describe('expireFinishedGame (TODO-047)', () => {
	const t = 1_000_000_000;

	it('keeps a finished game that completed within the hour', () => {
		const saved = envelope1v1(done1v1, t);
		expect(expireFinishedGame(saved, t + FINISHED_GAME_TTL_MS)).toEqual(saved);
	});

	it('drops a finished game more than an hour old, keeping settings and the opponent', () => {
		const saved = envelope1v1(done1v1, t);
		const pruned = expireFinishedGame(saved, t + FINISHED_GAME_TTL_MS + 1);
		expect(pruned.game).toBeNull();
		expect(pruned.finishedAt).toBeNull();
		expect(pruned.settings).toEqual(saved.settings);
		expect(pruned.opponentName).toBe(saved.opponentName);
	});

	it('drops a finished game with no completion stamp (pre-TODO-047 save)', () => {
		const pruned = expireFinishedGame(envelope1v1(done1v1, null), t);
		expect(pruned.game).toBeNull();
	});

	it('never drops an in-progress game, whatever its age', () => {
		const saved = envelope1v1(inProgress1v1, null);
		expect(expireFinishedGame(saved, Number.MAX_SAFE_INTEGER)).toEqual(saved);
	});

	it('passes a save with no game through unchanged', () => {
		const saved = envelope1v1(null, null);
		expect(expireFinishedGame(saved, t)).toEqual(saved);
	});
});
