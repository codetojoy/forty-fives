/**
 * What plays are legal? (SPEC §10 rules-engine, §13: called every trick — must
 * be correct and fast.) All rules are derived from the loaded trump scheme;
 * there are no variant branches here.
 *
 * The follow rules of Forty-Fives:
 *  - Leading a trick: any card.
 *  - Plain suit led: follow suit or play any trump. Discarding another plain
 *    suit while able to follow is illegal. If void in the led suit, anything.
 *  - Trump led: must play a trump if holding one — except that a renegable
 *    trump (per scheme.reneging) may be withheld when the led trump is lower
 *    than it. A renegable card cannot renege against an equal-or-higher lead.
 *
 * The A♥ falls out of the scheme data: it is trump (never a plain heart), so
 * it cannot be forced out by a plain hearts lead and never counts as
 * "able to follow hearts".
 */

import { cardId, sameCard, SUIT_NAMES, SUIT_SYMBOLS, type Card, type Suit } from './cards.js';
import { isTrump, trumpStrength, type TrumpScheme } from './trump-scheme.js';

export interface PlayAnalysis {
	/** The cards that may legally be played, in hand order. */
	legal: Card[];
	/** Human-readable rule binding the player, or null when any card may be played. */
	constraint: string | null;
	/** Renegable trumps the player may legally withhold against this lead. */
	renegingNow: Card[];
}

/** Is this card one the scheme allows to renege (when a lower trump is led)? */
export function isRenegable(c: Card, trumpSuit: Suit, scheme: TrumpScheme): boolean {
	if (!isTrump(c, trumpSuit, scheme)) return false;
	return scheme.reneging.renegableTrumpRanks.some(
		(entry) => entry === cardId(c) || (c.rank === entry && c.suit === trumpSuit)
	);
}

/**
 * Analyze a hand against the current lead (null = this player leads).
 * `led` is the first card of the trick, which fixes what "following" means.
 */
export function analyzePlays(
	hand: readonly Card[],
	led: Card | null,
	trumpSuit: Suit,
	scheme: TrumpScheme
): PlayAnalysis {
	if (hand.length === 0) {
		throw new Error('Cannot analyze plays for an empty hand');
	}
	const anything: Omit<PlayAnalysis, 'renegingNow'> = { legal: [...hand], constraint: null };

	if (led === null) {
		return { ...anything, renegingNow: [] };
	}

	const trumpName = `${SUIT_NAMES[trumpSuit]} ${SUIT_SYMBOLS[trumpSuit]}`;
	const ledStrength = trumpStrength(led, trumpSuit, scheme);

	if (ledStrength !== null) {
		// Trump led.
		const trumps = hand.filter((c) => isTrump(c, trumpSuit, scheme));
		if (trumps.length === 0) {
			return { ...anything, renegingNow: [] };
		}
		const renegingNow = trumps.filter(
			(c) => isRenegable(c, trumpSuit, scheme) && trumpStrength(c, trumpSuit, scheme)! > ledStrength
		);
		if (renegingNow.length === trumps.length) {
			// Every trump held may renege: the player is not forced to follow.
			return { ...anything, renegingNow };
		}
		return {
			legal: trumps,
			constraint: `Trump (${trumpName}) was led — you must play a trump.`,
			renegingNow
		};
	}

	// Plain suit led: cards of the led suit, excluding any that rank as trump.
	const follows = hand.filter((c) => c.suit === led.suit && !isTrump(c, trumpSuit, scheme));
	if (follows.length === 0) {
		return { ...anything, renegingNow: [] };
	}
	return {
		legal: hand.filter((c) => c.suit === led.suit || isTrump(c, trumpSuit, scheme)),
		constraint:
			`${SUIT_NAMES[led.suit]} ${SUIT_SYMBOLS[led.suit]} was led — ` +
			`follow suit or play a trump (${trumpName}).`,
		renegingNow: []
	};
}

/** The cards that may legally be played, in hand order. */
export function legalPlays(
	hand: readonly Card[],
	led: Card | null,
	trumpSuit: Suit,
	scheme: TrumpScheme
): Card[] {
	return analyzePlays(hand, led, trumpSuit, scheme).legal;
}

export function isLegalPlay(
	play: Card,
	hand: readonly Card[],
	led: Card | null,
	trumpSuit: Suit,
	scheme: TrumpScheme
): boolean {
	return legalPlays(hand, led, trumpSuit, scheme).some((c) => sameCard(c, play));
}
