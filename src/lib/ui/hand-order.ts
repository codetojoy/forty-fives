/**
 * Optional "strongest to weakest" ordering for the human's displayed hand
 * (TODO-052). Pure presentation: it never mutates the input and never reaches
 * the domain or AI, so play/selection (which is card-based) is unaffected.
 *
 * Only meaningful once a trump suit exists — strength depends on trump — so this
 * takes a non-null `Suit`, and callers gate on `trumpSuit !== null`. Because
 * A♥ is *always* trump, it lands in the trump group via `isTrump` and never
 * reaches the non-trump branch, so every non-trump card has a defined
 * `plainStrength` (no null to guard).
 */
import type { Card, Suit } from '$lib/domain/cards.js';
import type { TrumpScheme } from '$lib/domain/trump-scheme.js';
import { isTrump, trumpStrength, plainStrength } from '$lib/domain/trump-scheme.js';

/** Non-trump suit display order: alphabetical (TODO-052). */
const SUIT_ORDER: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];

/**
 * A sorted copy of `cards`, strongest first: all trump (by the game's trump
 * ranking — the 5/J/A♥ ladder, not face rank) ahead of all non-trump; non-trump
 * grouped by suit alphabetically, and within a suit by the game's in-suit
 * strength (which respects reversed black number cards, A♦ lowest, etc.).
 */
export function sortHandStrongestFirst(
	cards: readonly Card[],
	trumpSuit: Suit,
	scheme: TrumpScheme
): Card[] {
	return [...cards].sort((a, b) => {
		const aTrump = isTrump(a, trumpSuit, scheme);
		const bTrump = isTrump(b, trumpSuit, scheme);
		if (aTrump !== bTrump) return aTrump ? -1 : 1;
		if (aTrump && bTrump) {
			// Both trump: stronger trump first.
			return trumpStrength(b, trumpSuit, scheme)! - trumpStrength(a, trumpSuit, scheme)!;
		}
		// Both non-trump: suit alphabetical, then stronger-in-suit first.
		if (a.suit !== b.suit) return SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
		return plainStrength(b, scheme)! - plainStrength(a, scheme)!;
	});
}
