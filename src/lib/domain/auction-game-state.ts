/**
 * Game state for Auction Forty-Fives (Milestone 3) — a distinct game from the
 * 1v1 Forty-Fives in game-state.ts. Four seats, two partnerships ({0,2} vs
 * {1,3}), bidding, a three-card kitty, and scoring to 120.
 *
 * Immutable: every transition returns a new state (SPEC §13). The state is
 * plain JSON-able data carrying the scheme *id* only; transitions take the
 * loaded scheme as a parameter, so a saved game survives in localStorage.
 *
 * Hand flow:
 *   deal 5 each + 3-card kitty
 *     → bidding (15/20/25/30, ascending; dealer stuck at 15 if all pass;
 *       dealer may hold the standing bid — ALLOW_HOLD, TODO-042)
 *     → the winner names trump and takes the kitty
 *     → the winner discards back down to 5
 *     → 5 tricks
 *     → hand tally (make/set the bid) → next hand or game over.
 *
 * Rule calls awaiting real-player validation (SPEC §6, see doc/TODO-008.md):
 * only the bid winner uses the kitty (others keep their dealt five); the "30
 * for 60" bid is not implemented yet.
 */

import { sameCard, type Card, type Suit } from './cards.js';
import { dealAuction } from './deck.js';
import type { Rng } from './rng.js';
import { analyzePlays, isLegalPlay, type PlayAnalysis } from './rules-engine.js';
import {
	decideGameWinner,
	scoreAuctionHand,
	teamOf,
	NUM_TEAMS,
	type AuctionHandScore
} from './auction-scoring.js';
import { trickWinnerMulti } from './trick.js';
import type { TrumpScheme } from './trump-scheme.js';
import { cardLabel } from './cards.js';
import { legalBids, MIN_BID, type BidValue } from './bidding.js';
import { defaultSettingValues, type AuctionSettingValues } from './auction-config.js';
import type { CompletedTrick, TrickPlay } from './game-state.js';

/** Auction Forty-Fives is a four-seat game. */
export const AUCTION_SEATS = 4;
/** The human always sits in seat 0; partner is seat 2; opponents 1 and 3. */
export const HUMAN_SEAT = 0;
/** Tricks per hand. */
const TRICKS_PER_HAND = 5;
/** Cards the kitty adds, which the winner must then discard. */
const KITTY_SIZE = 3;

export type AuctionPhase =
	| {
			readonly kind: 'bidding';
			/** Seat to act. */
			readonly turn: number;
			readonly highBid: BidValue | null;
			readonly highBidder: number | null;
			/** Seats that have passed and are out of the auction. */
			readonly passed: readonly boolean[];
			/**
			 * The dealer, when the standing bid is currently *held* rather than
			 * bid (ALLOW_HOLD, TODO-042); null otherwise. Cleared by any raise.
			 */
			readonly heldBy: number | null;
	  }
	| { readonly kind: 'naming-trump' }
	| { readonly kind: 'discarding' }
	| {
			/**
			 * The optional draw (ALLOW_DISCARD, TODO-012): seats exchange 0–5 cards
			 * with the stock, in eldest-hand order.
			 */
			readonly kind: 'drawing';
			/** Seat to act. */
			readonly turn: number;
			/** Seats that have already drawn (or are skipped, e.g. the kitty bidder). */
			readonly drawn: readonly boolean[];
	  }
	| { readonly kind: 'playing' }
	| {
			readonly kind: 'hand-over';
			readonly handScore: AuctionHandScore;
			/** Non-null team index when the game ended with this hand. */
			readonly gameWinner: number | null;
	  };

export interface AuctionGameState {
	readonly schemeId: string;
	/**
	 * The resolved rules config for this game (TODO-011/012), snapshotted at
	 * startAuction. A game keeps the rules it started with; changing the config
	 * page mid-game only affects the next New game.
	 */
	readonly config: AuctionSettingValues;
	readonly handNumber: number;
	readonly dealer: number;
	readonly hands: readonly (readonly Card[])[];
	/** The kitty, before the winning bidder takes it (empty once taken). */
	readonly kitty: readonly Card[];
	/** Undealt cards, drawn from during the optional draw (ALLOW_DISCARD, TODO-012). */
	readonly stock: readonly Card[];
	/** The winning bid, or null until the auction resolves. */
	readonly bid: BidValue | null;
	/** The seat that won the bid (and names trump / takes the kitty), or null. */
	readonly biddingSeat: number | null;
	/** Trump suit, chosen by the winning bidder; null until named. */
	readonly trumpSuit: Suit | null;
	readonly currentTrick: readonly TrickPlay[];
	readonly completedTricks: readonly CompletedTrick[];
	/** Running game totals per team (index = team). */
	readonly scores: readonly number[];
	readonly phase: AuctionPhase;
}

function dealHand(
	scheme: TrumpScheme,
	rng: Rng,
	dealer: number,
	scores: readonly number[],
	handNumber: number,
	config: AuctionSettingValues
): AuctionGameState {
	const { hands, kitty, stock } = dealAuction(rng, AUCTION_SEATS, config.USE_KITTY);
	return {
		schemeId: scheme.id,
		config,
		handNumber,
		dealer,
		hands,
		kitty,
		stock,
		bid: null,
		biddingSeat: null,
		trumpSuit: null,
		currentTrick: [],
		completedTricks: [],
		scores,
		phase: {
			kind: 'bidding',
			turn: (dealer + 1) % AUCTION_SEATS, // eldest hand (dealer's left) bids first
			highBid: null,
			highBidder: null,
			passed: Array.from({ length: AUCTION_SEATS }, () => false),
			heldBy: null
		}
	};
}

export function startAuction(
	scheme: TrumpScheme,
	rng: Rng,
	firstDealer?: number,
	config: AuctionSettingValues = defaultSettingValues()
): AuctionGameState {
	const dealer = firstDealer ?? rng.int(AUCTION_SEATS);
	return dealHand(scheme, rng, dealer, Array.from({ length: NUM_TEAMS }, () => 0), 1, config);
}

// --- Bidding -----------------------------------------------------------------

function requireBidding(state: AuctionGameState): Extract<AuctionPhase, { kind: 'bidding' }> {
	if (state.phase.kind !== 'bidding') throw new Error('There is no bid to make right now');
	return state.phase;
}

/**
 * After a bid or pass, either advance to the next eligible seat or resolve the
 * auction. The next eligible seat is the next one that has not passed and is
 * not the standing high bidder (who never bids against themselves). When none
 * remains, the high bidder wins; if there is no high bidder at all, every seat
 * passed and the dealer is stuck with the minimum bid.
 */
function advanceBidding(
	state: AuctionGameState,
	phase: Extract<AuctionPhase, { kind: 'bidding' }>,
	actingSeat: number
): AuctionGameState {
	for (let step = 1; step <= AUCTION_SEATS; step++) {
		const seat = (actingSeat + step) % AUCTION_SEATS;
		if (!phase.passed[seat] && seat !== phase.highBidder) {
			return { ...state, phase: { ...phase, turn: seat } };
		}
	}
	// Auction resolved.
	const winner = phase.highBidder ?? state.dealer; // dealer stuck if no one bid
	const bid = phase.highBid ?? MIN_BID;
	return {
		...state,
		bid,
		biddingSeat: winner,
		phase: { kind: 'naming-trump' }
	};
}

/** Place a bid. Must be the seat's turn and strictly beat the standing bid. */
export function placeBid(state: AuctionGameState, seat: number, bid: BidValue): AuctionGameState {
	const phase = requireBidding(state);
	if (seat !== phase.turn) throw new Error(`It is not seat ${seat}'s turn to bid`);
	if (!legalBids(phase.highBid).includes(bid)) {
		throw new Error(`Bid ${bid} does not beat the standing bid of ${phase.highBid}`);
	}
	const raised: Extract<AuctionPhase, { kind: 'bidding' }> = {
		...phase,
		highBid: bid,
		highBidder: seat,
		heldBy: null // a raise ends any held state (TODO-042)
	};
	return advanceBidding(state, raised, seat);
}

/**
 * The dealer's hold (ALLOW_HOLD, TODO-042): match the standing bid without
 * raising. Modeled as taking over the high bid at the same value, with every
 * other seat out — the auction becomes a duel where the displaced bidder must
 * raise (placeBid) or concede (passBid, which resolves the auction to the
 * holder at the held value). The dealer may hold again after a raise.
 */
export function holdBid(state: AuctionGameState, seat: number): AuctionGameState {
	const phase = requireBidding(state);
	if (!state.config.ALLOW_HOLD) {
		throw new Error("Holding the bid is not allowed under this game's rules");
	}
	if (seat !== state.dealer) throw new Error('Only the dealer may hold the bid');
	if (seat !== phase.turn) throw new Error(`It is not seat ${seat}'s turn to bid`);
	if (phase.highBid === null || phase.highBidder === null) {
		throw new Error('There is no standing bid to hold');
	}
	if (phase.highBidder === seat) throw new Error('You cannot hold your own bid');
	const bidder = phase.highBidder;
	return {
		...state,
		phase: {
			...phase,
			highBidder: seat,
			heldBy: seat,
			passed: phase.passed.map((p, s) => (s === seat || s === bidder ? p : true)),
			turn: bidder
		}
	};
}

/** Pass. The seat is out of the auction for the rest of this hand. */
export function passBid(state: AuctionGameState, seat: number): AuctionGameState {
	const phase = requireBidding(state);
	if (seat !== phase.turn) throw new Error(`It is not seat ${seat}'s turn to bid`);
	const passed = phase.passed.map((p, s) => (s === seat ? true : p));
	const next: Extract<AuctionPhase, { kind: 'bidding' }> = { ...phase, passed };
	return advanceBidding(state, next, seat);
}

// --- Naming trump + kitty ----------------------------------------------------

/**
 * Name the trump suit. When the kitty is in play (USE_KITTY) the winning bidder
 * then takes the three-card kitty into hand (now eight cards) and must discard
 * back to five (see `discardKitty`). With no kitty (TODO-011) play begins
 * immediately after trump is named.
 */
export function nameTrump(
	state: AuctionGameState,
	seat: number,
	trumpSuit: Suit
): AuctionGameState {
	if (state.phase.kind !== 'naming-trump') throw new Error('Trump is not being named right now');
	if (seat !== state.biddingSeat) throw new Error(`Only the winning bidder names trump`);
	if (!state.config.USE_KITTY) {
		// No kitty: trump is named, then the optional draw (or straight to play).
		return beginDrawOrPlay({ ...state, trumpSuit });
	}
	const taken = [...state.hands[seat], ...state.kitty];
	return {
		...state,
		trumpSuit,
		kitty: [],
		hands: state.hands.map((h, s) => (s === seat ? taken : h)),
		phase: { kind: 'discarding' }
	};
}

/** Discard exactly the kitty's worth of cards, returning the bidder's hand to five. */
export function discardKitty(
	state: AuctionGameState,
	seat: number,
	discards: readonly Card[]
): AuctionGameState {
	if (state.phase.kind !== 'discarding') throw new Error('There is nothing to discard right now');
	if (seat !== state.biddingSeat) throw new Error('Only the winning bidder discards the kitty');
	if (discards.length !== KITTY_SIZE) {
		throw new Error(`Must discard exactly ${KITTY_SIZE} cards`);
	}
	const hand = state.hands[seat];
	for (const d of discards) {
		if (!hand.some((c) => sameCard(c, d))) {
			throw new Error(`Cannot discard the ${cardLabel(d)}: it is not in the hand`);
		}
	}
	const kept = hand.filter((c) => !discards.some((d) => sameCard(d, c)));
	if (kept.length !== TRICKS_PER_HAND) {
		throw new Error('Discards must be distinct cards from the hand');
	}
	// The kitty discards leave play (they are not returned to the draw stock).
	return beginDrawOrPlay({
		...state,
		hands: state.hands.map((h, s) => (s === seat ? kept : h))
	});
}

// --- The optional draw (ALLOW_DISCARD, TODO-012) ------------------------------

/** The next seat in eldest order (from `start`, inclusive) that has not drawn. */
function nextDrawer(start: number, drawn: readonly boolean[]): number | null {
	for (let step = 0; step < AUCTION_SEATS; step++) {
		const seat = (start + step) % AUCTION_SEATS;
		if (!drawn[seat]) return seat;
	}
	return null;
}

/**
 * Enter the optional draw (ALLOW_DISCARD), or go straight to play. Everyone may
 * exchange cards in eldest-hand order; with a kitty the bid winner already
 * exchanged via the kitty, so they are skipped here.
 */
function beginDrawOrPlay(state: AuctionGameState): AuctionGameState {
	if (!state.config.ALLOW_DISCARD) {
		return { ...state, phase: { kind: 'playing' } };
	}
	const drawn = Array.from(
		{ length: AUCTION_SEATS },
		(_, s) => state.config.USE_KITTY && s === state.biddingSeat
	);
	const turn = nextDrawer((state.dealer + 1) % AUCTION_SEATS, drawn);
	if (turn === null) return { ...state, phase: { kind: 'playing' } };
	return { ...state, phase: { kind: 'drawing', turn, drawn } };
}

/**
 * Exchange 0–5 cards with the stock. The seat keeps the rest of its hand and
 * draws the same number of replacements from the top of the stock, returning to
 * five. An empty `discards` is a legal "stand pat".
 */
export function drawCards(
	state: AuctionGameState,
	seat: number,
	discards: readonly Card[]
): AuctionGameState {
	if (state.phase.kind !== 'drawing') throw new Error('There is no draw happening right now');
	const phase = state.phase;
	if (seat !== phase.turn) throw new Error(`It is not seat ${seat}'s turn to draw`);
	if (discards.length > TRICKS_PER_HAND) {
		throw new Error(`Cannot exchange more than ${TRICKS_PER_HAND} cards`);
	}
	const hand = state.hands[seat];
	for (const d of discards) {
		if (!hand.some((c) => sameCard(c, d))) {
			throw new Error(`Cannot discard the ${cardLabel(d)}: it is not in the hand`);
		}
	}
	const kept = hand.filter((c) => !discards.some((d) => sameCard(d, c)));
	if (kept.length !== hand.length - discards.length) {
		throw new Error('Draw discards must be distinct cards from the hand');
	}
	if (discards.length > state.stock.length) {
		// Invariant: with at most five cards per seat the stock always suffices.
		throw new Error('Not enough stock to draw');
	}

	const drawnCards = state.stock.slice(0, discards.length);
	const stock = state.stock.slice(discards.length);
	const hands = state.hands.map((h, s) => (s === seat ? [...kept, ...drawnCards] : h));

	const drawn = phase.drawn.map((d, s) => (s === seat ? true : d));
	const turn = nextDrawer((seat + 1) % AUCTION_SEATS, drawn);
	if (turn === null) {
		return { ...state, hands, stock, phase: { kind: 'playing' } };
	}
	return { ...state, hands, stock, phase: { kind: 'drawing', turn, drawn } };
}

// --- Play --------------------------------------------------------------------

/** The first card of the trick in progress, or null when the next play leads. */
export function ledCard(state: AuctionGameState): Card | null {
	return state.currentTrick[0]?.card ?? null;
}

/**
 * Who leads the trick in progress? Subsequent tricks are led by the previous
 * winner. For the first trick the leader depends on the FIRST_LEAD rule
 * (TODO-017): `ELDEST` is the eldest hand (dealer's left); `LEFT_OF_BIDDER` (Rec
 * Hall) is the bid winner's left-hand player, paired with the reversed play
 * rotation in `currentSeat` so the bid winner plays last.
 */
export function trickLeader(state: AuctionGameState): number {
	const last = state.completedTricks[state.completedTricks.length - 1];
	if (last) return last.winner;
	if (state.config.FIRST_LEAD === 'LEFT_OF_BIDDER' && state.biddingSeat !== null) {
		return (state.biddingSeat + AUCTION_SEATS - 1) % AUCTION_SEATS;
	}
	return (state.dealer + 1) % AUCTION_SEATS;
}

/**
 * The play rotation. Normally seats act in increasing order from the leader;
 * under the Rec Hall LEFT_OF_BIDDER rule (TODO-017) play runs the other way so
 * the bid winner — seated to the leader's right — plays last in every trick.
 */
function seatToAct(state: AuctionGameState, leader: number, offset: number): number {
	if (state.config.FIRST_LEAD === 'LEFT_OF_BIDDER') {
		return (leader + AUCTION_SEATS - offset) % AUCTION_SEATS;
	}
	return (leader + offset) % AUCTION_SEATS;
}

/** Whose decision is it right now? null when the hand is over. */
export function currentSeat(state: AuctionGameState): number | null {
	switch (state.phase.kind) {
		case 'bidding':
			return state.phase.turn;
		case 'naming-trump':
		case 'discarding':
			return state.biddingSeat;
		case 'drawing':
			return state.phase.turn;
		case 'playing':
			return seatToAct(state, trickLeader(state), state.currentTrick.length);
		case 'hand-over':
			return null;
	}
}

/** Legal plays (and the rule constraining them) for the seat whose turn it is. */
export function analyzeCurrent(state: AuctionGameState, scheme: TrumpScheme): PlayAnalysis {
	const seat = currentSeat(state);
	if (seat === null || state.phase.kind !== 'playing' || state.trumpSuit === null) {
		throw new Error('No play is expected right now');
	}
	return analyzePlays(state.hands[seat], ledCard(state), state.trumpSuit, scheme);
}

/**
 * Play a card for `seat`. Validates turn order and legality (renege rules
 * included); resolves the trick when four cards are down and the hand after
 * five tricks.
 */
export function playCard(
	state: AuctionGameState,
	scheme: TrumpScheme,
	seat: number,
	play: Card
): AuctionGameState {
	if (state.phase.kind !== 'playing' || state.trumpSuit === null) {
		throw new Error('No card can be played right now');
	}
	if (seat !== currentSeat(state)) throw new Error(`It is not seat ${seat}'s turn`);

	const trumpSuit = state.trumpSuit;
	const hand = state.hands[seat];
	if (!hand.some((c) => sameCard(c, play))) {
		throw new Error(`The ${cardLabel(play)} is not in seat ${seat}'s hand`);
	}
	const led = ledCard(state);
	if (!isLegalPlay(play, hand, led, trumpSuit, scheme)) {
		const { constraint } = analyzePlays(hand, led, trumpSuit, scheme);
		throw new Error(`Illegal play ${cardLabel(play)}: ${constraint ?? 'not a legal card'}`);
	}

	const hands = state.hands.map((h, s) => (s === seat ? h.filter((c) => !sameCard(c, play)) : h));
	const trick = [...state.currentTrick, { seat, card: play }];

	if (trick.length < AUCTION_SEATS) {
		return { ...state, hands, currentTrick: trick };
	}

	// Trick complete: resolve it.
	const winnerIndex = trickWinnerMulti(trick.map((p) => p.card), trumpSuit, scheme);
	const winner = trick[winnerIndex].seat;
	const completedTricks = [...state.completedTricks, { plays: trick, winner }];

	if (completedTricks.length < TRICKS_PER_HAND) {
		return { ...state, hands, currentTrick: [], completedTricks };
	}

	// Hand complete: tally with the bid (make/set) and check for a game winner.
	const biddingTeam = teamOf(state.biddingSeat!);
	const handScore = scoreAuctionHand(completedTricks, trumpSuit, scheme, state.bid!, biddingTeam);
	const scores = state.scores.map((total, team) => total + handScore.teamDelta[team]);
	return {
		...state,
		hands,
		currentTrick: [],
		completedTricks,
		scores,
		phase: {
			kind: 'hand-over',
			handScore,
			gameWinner: decideGameWinner(
				state.config.FINISH_RULE,
				scores,
				biddingTeam,
				state.handNumber
			)
		}
	};
}

/** Deal the next hand (dealer rotates). Only valid when the game continues. */
export function nextHand(
	state: AuctionGameState,
	scheme: TrumpScheme,
	rng: Rng
): AuctionGameState {
	if (state.phase.kind !== 'hand-over') throw new Error('The current hand is not finished');
	if (state.phase.gameWinner !== null) throw new Error('The game is over');
	return dealHand(
		scheme,
		rng,
		(state.dealer + 1) % AUCTION_SEATS,
		state.scores,
		state.handNumber + 1,
		state.config
	);
}

/**
 * Cards publicly seen so far this hand (for AI tracking): the played tricks and
 * the trick in progress. The kitty and the bidder's discards stay hidden.
 */
export function seenCards(state: AuctionGameState): Card[] {
	const seen: Card[] = [];
	for (const t of state.completedTricks) for (const p of t.plays) seen.push(p.card);
	for (const p of state.currentTrick) seen.push(p.card);
	return seen;
}

/** Sanity check used when restoring a saved game from storage. */
export function isPlausibleAuctionState(value: unknown): value is AuctionGameState {
	const s = value as AuctionGameState;
	return (
		!!s &&
		typeof s.schemeId === 'string' &&
		Array.isArray(s.hands) &&
		s.hands.length === AUCTION_SEATS &&
		Array.isArray(s.scores) &&
		s.scores.length === NUM_TEAMS &&
		Array.isArray(s.completedTricks) &&
		Array.isArray(s.currentTrick) &&
		!!s.phase &&
		['bidding', 'naming-trump', 'discarding', 'drawing', 'playing', 'hand-over'].includes(
			s.phase.kind
		)
	);
}
