/**
 * Game state for 1v1 Forty-Fives (Milestone 1). Immutable: every transition
 * returns a new state, never mutates (SPEC §13). The state is plain JSON-able
 * data — it carries the scheme *id* only, and every transition takes the
 * loaded scheme as a parameter, so a saved game can live in localStorage.
 *
 * Hand flow: deal 5 each → turn up the next card (its suit is trump) →
 * robbing window → 5 tricks → hand tally → next hand or game over.
 *
 * Robbing (standard rules): if the turn-up is an ace, the dealer may exchange
 * a card for it; otherwise the player dealt the ace of trumps may exchange a
 * card for the turn-up. Robbing is OPTIONAL here — surfaced as an explicit
 * choice so real-player testers can tell us if their table plays it
 * differently (SPEC §6: players' feedback is the spec).
 */

import { card, cardId, cardLabel, sameCard, type Card, type Suit } from './cards.js';
import { deal } from './deck.js';
import type { Rng } from './rng.js';
import { analyzePlays, isLegalPlay, type PlayAnalysis } from './rules-engine.js';
import { gameWinner, scoreHand, type HandScore } from './scoring.js';
import { trickWinner } from './trick.js';
import type { TrumpScheme } from './trump-scheme.js';

/** Milestone 1 is strictly two seats; arrays in the state are indexed by seat. */
export const SEATS = 2;

export interface TrickPlay {
	readonly seat: number;
	readonly card: Card;
}

export interface CompletedTrick {
	/** In play order: plays[0] is the led card. */
	readonly plays: readonly TrickPlay[];
	readonly winner: number;
}

export type Phase =
	| { readonly kind: 'robbing'; readonly seat: number }
	| { readonly kind: 'playing' }
	| {
			readonly kind: 'hand-over';
			readonly handScore: HandScore;
			/** Non-null when the game ended with this hand. */
			readonly gameWinner: number | null;
	  };

export interface GameState {
	readonly schemeId: string;
	readonly handNumber: number;
	readonly dealer: number;
	readonly trumpSuit: Suit;
	/** The card turned up after the deal; public knowledge all hand. */
	readonly turnUp: Card;
	/** True once the turn-up was robbed into a hand. */
	readonly turnUpTaken: boolean;
	readonly hands: readonly (readonly Card[])[];
	readonly currentTrick: readonly TrickPlay[];
	readonly completedTricks: readonly CompletedTrick[];
	/** Running game totals, including any hand shown in a hand-over phase. */
	readonly scores: readonly number[];
	readonly phase: Phase;
}

function dealHand(
	scheme: TrumpScheme,
	rng: Rng,
	dealer: number,
	scores: readonly number[],
	handNumber: number
): GameState {
	const { hands, turnUp } = deal(rng, SEATS);
	const trumpSuit = turnUp.suit;

	// Who may rob? A turned ace belongs to the dealer; otherwise the holder
	// of the ace of trumps may exchange a card for the turn-up.
	const trumpAce = card('A', trumpSuit);
	let robber: number | null = null;
	if (turnUp.rank === 'A') {
		robber = dealer;
	} else {
		const holder = hands.findIndex((h) => h.some((c) => sameCard(c, trumpAce)));
		if (holder !== -1) robber = holder;
	}

	return {
		schemeId: scheme.id,
		handNumber,
		dealer,
		trumpSuit,
		turnUp,
		turnUpTaken: false,
		hands,
		currentTrick: [],
		completedTricks: [],
		scores,
		phase: robber === null ? { kind: 'playing' } : { kind: 'robbing', seat: robber }
	};
}

export function startGame(scheme: TrumpScheme, rng: Rng, firstDealer?: number): GameState {
	const dealer = firstDealer ?? rng.int(SEATS);
	return dealHand(scheme, rng, dealer, Array.from({ length: SEATS }, () => 0), 1);
}

/** The first card of the trick in progress, or null when the next play leads. */
export function ledCard(state: GameState): Card | null {
	return state.currentTrick[0]?.card ?? null;
}

/** Who leads the trick in progress? Non-dealer leads trick 1; winners lead on. */
export function trickLeader(state: GameState): number {
	const last = state.completedTricks[state.completedTricks.length - 1];
	return last ? last.winner : (state.dealer + 1) % SEATS;
}

/** Whose decision is it right now? null when the hand is over. */
export function currentSeat(state: GameState): number | null {
	if (state.phase.kind === 'robbing') return state.phase.seat;
	if (state.phase.kind !== 'playing') return null;
	return (trickLeader(state) + state.currentTrick.length) % SEATS;
}

/** Legal plays (and the rule constraining them) for the seat whose turn it is. */
export function analyzeCurrent(state: GameState, scheme: TrumpScheme): PlayAnalysis {
	const seat = currentSeat(state);
	if (seat === null || state.phase.kind !== 'playing') {
		throw new Error('No play is expected right now');
	}
	return analyzePlays(state.hands[seat], ledCard(state), state.trumpSuit, scheme);
}

function requireRobbing(state: GameState): number {
	if (state.phase.kind !== 'robbing') {
		throw new Error('There is no robbing decision to make');
	}
	return state.phase.seat;
}

/** Rob the turn-up: exchange `discard` (face down, out of play) for it. */
export function rob(state: GameState, discard: Card): GameState {
	const seat = requireRobbing(state);
	const hand = state.hands[seat];
	if (!hand.some((c) => sameCard(c, discard))) {
		throw new Error(`Cannot discard the ${cardLabel(discard)}: it is not in the hand`);
	}
	const newHand = [...hand.filter((c) => !sameCard(c, discard)), state.turnUp];
	return {
		...state,
		hands: state.hands.map((h, s) => (s === seat ? newHand : h)),
		turnUpTaken: true,
		phase: { kind: 'playing' }
	};
}

/** Decline to rob; play begins with the dealt hands. */
export function declineRob(state: GameState): GameState {
	requireRobbing(state);
	return { ...state, phase: { kind: 'playing' } };
}

/**
 * Play a card for `seat`. Validates turn order and legality (renege rules
 * included); resolves the trick when complete and the hand after 5 tricks.
 */
export function playCard(
	state: GameState,
	scheme: TrumpScheme,
	seat: number,
	play: Card
): GameState {
	if (state.phase.kind !== 'playing') {
		throw new Error('No card can be played right now');
	}
	if (seat !== currentSeat(state)) {
		throw new Error(`It is not seat ${seat}'s turn`);
	}
	const hand = state.hands[seat];
	if (!hand.some((c) => sameCard(c, play))) {
		throw new Error(`The ${cardLabel(play)} is not in seat ${seat}'s hand`);
	}
	const led = ledCard(state);
	if (!isLegalPlay(play, hand, led, state.trumpSuit, scheme)) {
		const { constraint } = analyzePlays(hand, led, state.trumpSuit, scheme);
		throw new Error(`Illegal play ${cardLabel(play)}: ${constraint ?? 'not a legal card'}`);
	}

	const hands = state.hands.map((h, s) =>
		s === seat ? h.filter((c) => !sameCard(c, play)) : h
	);
	const trick = [...state.currentTrick, { seat, card: play }];

	if (trick.length < SEATS) {
		return { ...state, hands, currentTrick: trick };
	}

	// Trick complete: resolve it.
	const winnerOfPair = trickWinner(trick[0].card, trick[1].card, state.trumpSuit, scheme);
	const winner = winnerOfPair === 'led' ? trick[0].seat : trick[1].seat;
	const completedTricks = [...state.completedTricks, { plays: trick, winner }];

	if (completedTricks.length < 5) {
		return { ...state, hands, currentTrick: [], completedTricks };
	}

	// Hand complete: tally and check for a game winner.
	const handScore = scoreHand(completedTricks, state.trumpSuit, scheme, SEATS);
	const scores = state.scores.map((total, s) => total + handScore.points[s]);
	return {
		...state,
		hands,
		currentTrick: [],
		completedTricks,
		scores,
		phase: { kind: 'hand-over', handScore, gameWinner: gameWinner(scores, scheme.scoring.gameTarget) }
	};
}

/** Deal the next hand (dealer alternates). Only valid when the game continues. */
export function nextHand(state: GameState, scheme: TrumpScheme, rng: Rng): GameState {
	if (state.phase.kind !== 'hand-over') {
		throw new Error('The current hand is not finished');
	}
	if (state.phase.gameWinner !== null) {
		throw new Error('The game is over');
	}
	return dealHand(scheme, rng, (state.dealer + 1) % SEATS, state.scores, state.handNumber + 1);
}

/** Every card that has been publicly seen so far this hand (for AI tracking). */
export function seenCards(state: GameState): Card[] {
	const seen: Card[] = [];
	for (const t of state.completedTricks) for (const p of t.plays) seen.push(p.card);
	for (const p of state.currentTrick) seen.push(p.card);
	if (!state.turnUpTaken) seen.push(state.turnUp);
	return seen;
}

/** Sanity check used when restoring a saved game from storage. */
export function isPlausibleGameState(value: unknown): value is GameState {
	const s = value as GameState;
	return (
		!!s &&
		typeof s.schemeId === 'string' &&
		Array.isArray(s.hands) &&
		s.hands.length === SEATS &&
		Array.isArray(s.scores) &&
		s.scores.length === SEATS &&
		Array.isArray(s.completedTricks) &&
		Array.isArray(s.currentTrick) &&
		!!s.phase &&
		['robbing', 'playing', 'hand-over'].includes(s.phase.kind) &&
		!!s.turnUp &&
		typeof cardId(s.turnUp) === 'string'
	);
}
