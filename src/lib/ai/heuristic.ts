/**
 * Heuristic AI for Milestone 1 (SPEC §6, Phase 1):
 *  - Track played cards (especially trumps) to know when a trump is "boss".
 *  - Win the trick with the cheapest card that does it; otherwise dump the
 *    weakest legal card.
 *  - Save the renegable trumps (5, J, A♥) for late tricks when they are the
 *    only way to win something cheap.
 *  - Must-follow vs. may-renege comes from the rules engine, never from here.
 *
 * Pure and deterministic: a function of (state, scheme) only. Difficulty
 * levels can later inject noise (SPEC §6) without changing this core.
 * Like the domain layer, this module has zero UI dependencies (SPEC §10).
 */

import { FULL_DECK, cardId, type Card } from '../domain/cards.js';
import { ledCard, seenCards, type GameState } from '../domain/game-state.js';
import { analyzePlays, isRenegable } from '../domain/rules-engine.js';
import { trickWinner } from '../domain/trick.js';
import { plainStrength, trumpStrength, type TrumpScheme } from '../domain/trump-scheme.js';

/** A single comparable worth: any trump outranks any plain card. */
function cardValue(c: Card, state: GameState, scheme: TrumpScheme): number {
	const t = trumpStrength(c, state.trumpSuit, scheme);
	if (t !== null) return 100 + t;
	return plainStrength(c, scheme) ?? 0;
}

function weakest(cards: readonly Card[], state: GameState, scheme: TrumpScheme): Card {
	return cards.reduce((a, b) => (cardValue(b, state, scheme) < cardValue(a, state, scheme) ? b : a));
}

/**
 * Cards this seat has not yet seen: everything outside its own hand, the
 * exposed turn-up, and the tricks played so far. (A turn-up robbed by the
 * opponent stays "unseen" — treating it as still out there is conservative.)
 */
function unseenBy(seat: number, state: GameState): Card[] {
	const visible = new Set([...state.hands[seat], ...seenCards(state)].map(cardId));
	return FULL_DECK.filter((c) => !visible.has(cardId(c)));
}

/** Is this trump currently boss — stronger than every trump the seat hasn't seen? */
function isBossTrump(c: Card, seat: number, state: GameState, scheme: TrumpScheme): boolean {
	const s = trumpStrength(c, state.trumpSuit, scheme);
	if (s === null) return false;
	return unseenBy(seat, state).every(
		(u) => (trumpStrength(u, state.trumpSuit, scheme) ?? -1) < s
	);
}

export interface RobDecision {
	rob: boolean;
	/** The card to give up when robbing, null when declining. */
	discard: Card | null;
}

/** Rob whenever the turn-up (always a trump) is worth more than the weakest card held. */
export function chooseRob(state: GameState, scheme: TrumpScheme): RobDecision {
	if (state.phase.kind !== 'robbing') {
		throw new Error('There is no robbing decision to make');
	}
	const hand = state.hands[state.phase.seat];
	const give = weakest(hand, state, scheme);
	if (cardValue(state.turnUp, state, scheme) > cardValue(give, state, scheme)) {
		return { rob: true, discard: give };
	}
	return { rob: false, discard: null };
}

/** Pick the card to play for `seat`. Always one of the legal plays. */
export function chooseCard(state: GameState, scheme: TrumpScheme, seat: number): Card {
	const led = ledCard(state);
	const { legal } = analyzePlays(state.hands[seat], led, state.trumpSuit, scheme);

	if (led === null) {
		// Leading. Cash a boss trump (a guaranteed trick, and it locks the
		// highest-trump bonus when it is the 5); otherwise duck with the weakest.
		const boss = legal.filter((c) => isBossTrump(c, seat, state, scheme));
		if (boss.length > 0) {
			return boss.reduce((a, b) =>
				cardValue(b, state, scheme) > cardValue(a, state, scheme) ? b : a
			);
		}
		return weakest(legal, state, scheme);
	}

	// Following.
	const winners = legal.filter((c) => trickWinner(led, c, state.trumpSuit, scheme) === 'second');
	if (winners.length === 0) {
		return weakest(legal, state, scheme);
	}

	const cheapest = winners.reduce((a, b) =>
		cardValue(b, state, scheme) < cardValue(a, state, scheme) ? b : a
	);

	// Save a renegable trump in the early tricks: if the only way to win is to
	// spend one on a cheap non-trump lead, dump instead and keep it for later.
	const onlyRenegableWins = winners.every((c) => isRenegable(c, state.trumpSuit, scheme));
	const earlyTrick = state.completedTricks.length < 3;
	const cheapLead = trumpStrength(led, state.trumpSuit, scheme) === null;
	if (onlyRenegableWins && earlyTrick && cheapLead) {
		const safe = legal.filter((c) => !isRenegable(c, state.trumpSuit, scheme));
		if (safe.length > 0) {
			return weakest(safe, state, scheme);
		}
	}

	return cheapest;
}
