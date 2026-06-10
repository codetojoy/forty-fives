/**
 * Two-card trick resolution and human-readable explanations.
 *
 * The trainer (Milestone 0) frames every question as a led card followed by a
 * second card, because two arbitrary cards have no context-free winner: when
 * neither is trump and the suits differ, the led card wins by definition.
 */

import { cardLabel, isRedSuit, sameCard, type Card, type Suit } from './cards.js';
import {
	isTrump,
	trumpPosition,
	trumpStrength,
	plainStrength,
	type TrumpScheme
} from './trump-scheme.js';
import { SUIT_NAMES, SUIT_SYMBOLS } from './cards.js';

export type TrickWinner = 'led' | 'second';

/** Which of the two cards takes the trick? */
export function trickWinner(
	led: Card,
	second: Card,
	trumpSuit: Suit,
	scheme: TrumpScheme
): TrickWinner {
	if (sameCard(led, second)) {
		throw new Error(`Cannot compare a card with itself: ${cardLabel(led)}`);
	}
	const ledTrump = trumpStrength(led, trumpSuit, scheme);
	const secondTrump = trumpStrength(second, trumpSuit, scheme);

	if (ledTrump !== null && secondTrump !== null) {
		return secondTrump > ledTrump ? 'second' : 'led';
	}
	if (secondTrump !== null) return 'second';
	if (ledTrump !== null) return 'led';

	// Neither card is trump: only a card of the led suit can beat the led card.
	if (second.suit !== led.suit) return 'led';
	return plainStrength(second, scheme)! > plainStrength(led, scheme)! ? 'second' : 'led';
}

function ordinal(n: number): string {
	if (n === 1) return 'highest';
	if (n === 2) return '2nd-highest';
	if (n === 3) return '3rd-highest';
	return `${n}th-highest`;
}

/** "the 5♦ is the highest trump", with extra colour for the famous special cards. */
function describeTrump(c: Card, trumpSuit: Suit, scheme: TrumpScheme): string {
	const label = cardLabel(c);
	const pos = trumpPosition(c, trumpSuit, scheme)!;
	if (c.rank === '5' && c.suit === trumpSuit) {
		return `the ${label} is the highest trump — the 5 of trumps always wins`;
	}
	if (c.rank === 'J' && c.suit === trumpSuit) {
		return `the ${label} is the 2nd-highest trump (only the 5 of trumps beats it)`;
	}
	if (c.rank === 'A' && c.suit === 'hearts' && scheme.aceOfHeartsAlwaysTrump) {
		return trumpSuit === 'hearts'
			? `the A♥ is the ${ordinal(pos)} trump`
			: `the A♥ is always trump, no matter which suit is trump, and ranks ${ordinal(pos)}`;
	}
	if (c.rank === 'A' && c.suit === trumpSuit) {
		return `the ${label} is the ${ordinal(pos)} trump, just below the A♥`;
	}
	return `the ${label} is the ${ordinal(pos)} trump`;
}

/** A reminder of the number-card direction, when it's relevant to the comparison. */
function numberOrderNote(suit: Suit, inTrump: boolean): string {
	const where = inTrump ? `trump ${SUIT_NAMES[suit]}` : `plain ${SUIT_NAMES[suit]}`;
	return isRedSuit(suit)
		? `In ${where}, number cards rank "highest in red": 10 high down to 2 low.`
		: `In ${where}, number cards rank "lowest in black": 2 high up to 10 low.`;
}

function isNumberRank(c: Card): boolean {
	return !['A', 'K', 'Q', 'J'].includes(c.rank);
}

/**
 * Why does the winner win? Returns plain prose suitable for showing a learner
 * immediately after they answer.
 */
export function explainTrick(
	led: Card,
	second: Card,
	trumpSuit: Suit,
	scheme: TrumpScheme
): string {
	const winner = trickWinner(led, second, trumpSuit, scheme);
	const [w, l] = winner === 'led' ? [led, second] : [second, led];
	const wLabel = cardLabel(w);
	const lLabel = cardLabel(l);
	const trumpName = `${SUIT_NAMES[trumpSuit]} ${SUIT_SYMBOLS[trumpSuit]}`;

	const wTrump = isTrump(w, trumpSuit, scheme);
	const lTrump = isTrump(l, trumpSuit, scheme);

	if (wTrump && lTrump) {
		const parts = [
			`Both cards are trump (${trumpName}). ` +
				`${capitalize(describeTrump(w, trumpSuit, scheme))}, while ${describeTrump(l, trumpSuit, scheme)}, so the ${wLabel} wins.`
		];
		if (isNumberRank(w) && isNumberRank(l) && w.suit === l.suit) {
			parts.push(numberOrderNote(w.suit, true));
		}
		return parts.join(' ');
	}

	if (wTrump && !lTrump) {
		const why =
			w.rank === 'A' && w.suit === 'hearts' && trumpSuit !== 'hearts'
				? `The A♥ is always trump, even when trump is ${trumpName}`
				: `The ${wLabel} is trump (${trumpName})`;
		return (
			`${why}, and any trump beats any non-trump card. ` +
			`The ${lLabel} is not trump, so the ${wLabel} wins even though ` +
			(winner === 'second' ? `the ${lLabel} was led.` : `the ${lLabel} was played to it.`)
		);
	}

	// Neither card is trump.
	if (w.suit === l.suit) {
		const parts = [
			`Neither card is trump, and both are ${SUIT_NAMES[w.suit]}. ` +
				`The higher card of the led suit wins: the ${wLabel} outranks the ${lLabel}.`
		];
		if (l.rank === 'A' && l.suit === 'diamonds') {
			parts.push(`Watch out: when Diamonds are not trump, the A♦ is the lowest diamond.`);
		}
		if (isNumberRank(w) && isNumberRank(l)) {
			parts.push(numberOrderNote(w.suit, false));
		}
		return parts.join(' ');
	}

	return (
		`Neither card is trump, and the ${lLabel} did not follow the led suit ` +
		`(${SUIT_NAMES[w.suit]}). A card that is neither trump nor of the led suit ` +
		`can never win the trick, so the led ${wLabel} wins — even a low led card beats it.`
	);
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
