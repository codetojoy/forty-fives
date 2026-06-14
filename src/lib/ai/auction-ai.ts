/**
 * Heuristic, partnership-aware AI for Auction Forty-Fives (Milestone 3,
 * SPEC §6 "Phase 1"). Pure and deterministic — a function of (state, scheme,
 * seat) only — and, like the domain layer, free of any UI dependency (SPEC §10).
 * The stronger Monte-Carlo AI (SPEC §6 "Phase 2") is deferred to a later TODO.
 *
 * The four decisions:
 *  - estimateBid / chooseBid: value the five-card hand per candidate trump suit
 *    and bid only what the hand can likely make (the make/set penalty is harsh).
 *  - chooseTrump: name the suit the hand is strongest in.
 *  - chooseKittyDiscards: keep trumps and high cards, dump the weakest.
 *  - chooseCardAuction: win tricks cheaply, but never overtrump a partner who
 *    is already winning the trick ("don't shoot your own partner").
 */

import { FULL_DECK, cardId, type Card, type Suit } from '../domain/cards.js';
import { SUITS } from '../domain/cards.js';
import {
	ledCard,
	seenCards,
	currentSeat,
	type AuctionGameState
} from '../domain/auction-game-state.js';
import { analyzePlays, isRenegable } from '../domain/rules-engine.js';
import { trickWinnerMulti } from '../domain/trick.js';
import { isTrump, plainStrength, trumpStrength, type TrumpScheme } from '../domain/trump-scheme.js';
import { BID_VALUES, legalBids, type BidValue } from '../domain/bidding.js';

/** A single comparable worth under a trump suit: any trump outranks any plain card. */
function cardValue(c: Card, trumpSuit: Suit, scheme: TrumpScheme): number {
	const t = trumpStrength(c, trumpSuit, scheme);
	if (t !== null) return 100 + t;
	return plainStrength(c, scheme) ?? 0;
}

function weakest(cards: readonly Card[], trumpSuit: Suit, scheme: TrumpScheme): Card {
	return cards.reduce((a, b) =>
		cardValue(b, trumpSuit, scheme) < cardValue(a, trumpSuit, scheme) ? b : a
	);
}

function strongest(cards: readonly Card[], trumpSuit: Suit, scheme: TrumpScheme): Card {
	return cards.reduce((a, b) =>
		cardValue(b, trumpSuit, scheme) > cardValue(a, trumpSuit, scheme) ? b : a
	);
}

// --- Bidding -----------------------------------------------------------------

export interface BidEstimate {
	/** The suit the hand is strongest in. */
	suit: Suit;
	/** A rough expected point haul for this hand on that suit (0–30+). */
	power: number;
}

/**
 * Estimate expected points if `trumpSuit` were trump. Top trumps are near-sure
 * tricks, lower trumps and length give partial control, the bidder expects a
 * small lift from the kitty, and — crucially for a *partnership* game — credits
 * the partner with about a trick. Without the partner term the AI valued only
 * its own five cards and so almost never cleared even a 15 bid (TODO-011 follow-up).
 */
function powerForSuit(
	hand: readonly Card[],
	trumpSuit: Suit,
	scheme: TrumpScheme,
	useKitty: boolean
): number {
	const trumps = hand.filter((c) => isTrump(c, trumpSuit, scheme));
	const total = scheme.trumpStrengths[trumpSuit].size; // ~14 trumps

	let expectedTricks = 0;
	for (const c of trumps) {
		const strength = trumpStrength(c, trumpSuit, scheme)!;
		// Position from the top: 1 = highest trump (the 5).
		const positionFromTop = total - strength + 1;
		if (positionFromTop <= 3) expectedTricks += 0.95; // 5, J, A♥ — near-certain
		else if (positionFromTop <= 5) expectedTricks += 0.65; // A / K of trump
		else expectedTricks += 0.4; // low trumps still pull a trick
	}
	// A long trump holding gives extra control beyond the individual cards.
	if (trumps.length >= 4) expectedTricks += 0.6 * (trumps.length - 3);

	// Off-suit aces sometimes steal a trick.
	const offAces = hand.filter(
		(c) => c.rank === 'A' && !isTrump(c, trumpSuit, scheme) && plainStrength(c, scheme) !== null
	);
	expectedTricks += 0.35 * offAces.length;

	// Partnership allowance: the bidder's partner is expected to contribute about
	// a trick, so a hand is valued on the pair's strength, not the bidder's alone.
	expectedTricks += 1.2;

	const expectedPoints = expectedTricks * 5;
	// Small lift for the three-card kitty the winning bidder will take — only when
	// the kitty is in play (TODO-011); otherwise the bidder gains no cards.
	return expectedPoints + (useKitty ? 3 : 0);
}

/**
 * Pick the strongest trump suit for this hand and its estimated power. `useKitty`
 * (default true) reflects whether the winning bidder will gain the kitty; it only
 * shifts the magnitude, not which suit is strongest.
 */
export function estimateBid(
	hand: readonly Card[],
	scheme: TrumpScheme,
	useKitty = true
): BidEstimate {
	let best: BidEstimate = { suit: SUITS[0], power: -Infinity };
	for (const suit of SUITS) {
		const power = powerForSuit(hand, suit, scheme, useKitty);
		if (power > best.power) best = { suit, power };
	}
	return best;
}

/** The highest bid value this hand can afford, or null to pass. */
function affordableBid(power: number): BidValue | null {
	let result: BidValue | null = null;
	for (const v of BID_VALUES) if (power >= v) result = v;
	return result;
}

export interface AuctionBidDecision {
	/** The bid to make, or null to pass. */
	bid: BidValue | null;
	/** The suit the AI intends to call (used later by chooseTrump). */
	suit: Suit;
}

/**
 * Decide whether to bid. Bids only the minimum needed to take the lead, and
 * only up to what the hand can afford, so the AI competes without overbidding.
 */
export function chooseBid(state: AuctionGameState, scheme: TrumpScheme, seat: number): AuctionBidDecision {
	if (state.phase.kind !== 'bidding') throw new Error('There is no bid to make right now');
	const est = estimateBid(state.hands[seat], scheme, state.config.USE_KITTY);
	const ceiling = affordableBid(est.power);
	if (ceiling === null) return { bid: null, suit: est.suit };

	const options = legalBids(state.phase.highBid).filter((b) => b <= ceiling);
	if (options.length === 0) return { bid: null, suit: est.suit };
	return { bid: options[0], suit: est.suit }; // bid just enough to lead
}

/** The suit the winning bidder should name: whichever the hand is strongest in. */
export function chooseTrump(state: AuctionGameState, scheme: TrumpScheme, seat: number): Suit {
	return estimateBid(state.hands[seat], scheme, state.config.USE_KITTY).suit;
}

/**
 * After taking the kitty (eight cards), discard the three weakest for the named
 * trump — keeping trumps and high cards.
 */
export function chooseKittyDiscards(
	state: AuctionGameState,
	scheme: TrumpScheme,
	seat: number
): Card[] {
	if (state.trumpSuit === null) throw new Error('Trump has not been named');
	const trumpSuit = state.trumpSuit;
	const sorted = [...state.hands[seat]].sort(
		(a, b) => cardValue(a, trumpSuit, scheme) - cardValue(b, trumpSuit, scheme)
	);
	return sorted.slice(0, 3);
}

/** Honour ranks worth keeping off-suit (they can still take or protect a trick). */
const OFF_HONOURS = new Set(['A', 'K', 'Q', 'J']);

/**
 * The optional draw (ALLOW_DISCARD, TODO-012): the cards to exchange. Conservative
 * — keep every trump and every off-suit honour, exchange only clearly weak
 * non-trump number cards. Drawing from a large stock rarely improves a hand, so
 * the AI frequently stands pat (returns an empty list).
 */
export function chooseDraw(state: AuctionGameState, scheme: TrumpScheme, seat: number): Card[] {
	if (state.phase.kind !== 'drawing') throw new Error('No draw is expected right now');
	if (seat !== currentSeat(state)) throw new Error(`It is not seat ${seat}'s turn`);
	if (state.trumpSuit === null) throw new Error('Trump has not been named');
	const trumpSuit = state.trumpSuit;
	return state.hands[seat].filter(
		(c) => !isTrump(c, trumpSuit, scheme) && !OFF_HONOURS.has(c.rank)
	);
}

// --- Play --------------------------------------------------------------------

/** Cards this seat has not seen: outside its hand and the cards played so far. */
function unseenBy(seat: number, state: AuctionGameState): Card[] {
	const visible = new Set([...state.hands[seat], ...seenCards(state)].map(cardId));
	return FULL_DECK.filter((c) => !visible.has(cardId(c)));
}

/** Is this trump boss — stronger than every trump the seat has not yet seen? */
function isBossTrump(c: Card, seat: number, state: AuctionGameState, scheme: TrumpScheme): boolean {
	const trumpSuit = state.trumpSuit!;
	const s = trumpStrength(c, trumpSuit, scheme);
	if (s === null) return false;
	return unseenBy(seat, state).every((u) => (trumpStrength(u, trumpSuit, scheme) ?? -1) < s);
}

/** The partner seat sits directly opposite. */
function partnerOf(seat: number): number {
	return (seat + 2) % 4;
}

/** Pick the card to play for `seat`. Always one of the legal plays. */
export function chooseCardAuction(state: AuctionGameState, scheme: TrumpScheme, seat: number): Card {
	if (state.phase.kind !== 'playing' || state.trumpSuit === null) {
		throw new Error('No card can be played right now');
	}
	if (seat !== currentSeat(state)) throw new Error(`It is not seat ${seat}'s turn`);

	const trumpSuit = state.trumpSuit;
	const led = ledCard(state);
	const { legal } = analyzePlays(state.hands[seat], led, trumpSuit, scheme);

	if (led === null) {
		// Leading: cash a boss trump (a sure trick); otherwise duck with the weakest.
		const boss = legal.filter((c) => isBossTrump(c, seat, state, scheme));
		if (boss.length > 0) return strongest(boss, trumpSuit, scheme);
		return weakest(legal, trumpSuit, scheme);
	}

	// Following. Who is winning the partial trick so far?
	const playedCards = state.currentTrick.map((p) => p.card);
	const winningSeat = state.currentTrick[trickWinnerMulti(playedCards, trumpSuit, scheme)].seat;

	// Don't shoot your own partner: if partner is already winning, dump the
	// weakest legal card rather than wasting a winner on a trick we likely hold.
	if (winningSeat === partnerOf(seat)) {
		return weakest(legal, trumpSuit, scheme);
	}

	// An opponent is winning: take it with the cheapest card that wins, if any.
	const winners = legal.filter(
		(c) => trickWinnerMulti([...playedCards, c], trumpSuit, scheme) === playedCards.length
	);
	if (winners.length === 0) return weakest(legal, trumpSuit, scheme);

	const cheapest = winners.reduce((a, b) =>
		cardValue(b, trumpSuit, scheme) < cardValue(a, trumpSuit, scheme) ? b : a
	);

	// Save a renegable trump (5, J, A♥) early if winning would require spending
	// one on a cheap non-trump lead — keep it for a more valuable late trick.
	const onlyRenegableWins = winners.every((c) => isRenegable(c, trumpSuit, scheme));
	const earlyTrick = state.completedTricks.length < 3;
	const cheapLead = trumpStrength(led, trumpSuit, scheme) === null;
	if (onlyRenegableWins && earlyTrick && cheapLead) {
		const safe = legal.filter((c) => !isRenegable(c, trumpSuit, scheme));
		if (safe.length > 0) return weakest(safe, trumpSuit, scheme);
	}

	return cheapest;
}
