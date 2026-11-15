/**
 * Where every card sits on the experimental 3D table (doc/BRAINSTORM-3D.md).
 *
 * Pure numbers — no three.js, no Svelte — so it is unit-tested like the other
 * UI helpers (tests/ui/table3d-layout.test.ts). `scene.ts` takes the placements
 * this produces and animates each card mesh from where it is to where it now
 * belongs; because cards are keyed by their id, a card that moves between zones
 * (hand → trick → pile, turn-up → hand on a rob) simply flies there.
 *
 * World axes: the table top is the y = 0 plane; +z is toward the human player
 * (the camera sits over that edge); +x is the human's right. A card is 1 × 1.4
 * units. Rotations are Euler XYZ radians applied to a card whose face points +z:
 * `rx = -π/2` lies it flat face up, `rx = +π/2` flat face down.
 *
 * UI layer only; it reads `GameState` but nothing in the domain knows about it.
 */

import { cardId, sameCard, type Card } from '$lib/domain/cards.js';
import type { CompletedTrick, GameState, TrickPlay } from '$lib/domain/game-state.js';

export const CARD_W = 1;
export const CARD_H = 1.4;

/** Where the stock sits; cards are dealt from, and return to, this spot. */
export const DECK_SPOT = { x: -2.45, y: 0, z: -1.25 } as const;

/** The stock's spot for the given layout (it moves inward when compact). */
export function deckSpot(compact: boolean): { x: number; y: number; z: number } {
	return compact ? { ...DECK_SPOT, x: -2.05, z: -0.8 } : { ...DECK_SPOT };
}

const FACE_UP = -Math.PI / 2;
const FACE_DOWN = Math.PI / 2;
/** Hand cards are held up, tilted back to face the camera. */
const HAND_TILT = -0.85;

export type Zone = 'hand' | 'opponent' | 'turn-up' | 'kitty' | 'trick' | 'pile';

export interface CardPlacement {
	/** Canonical card id ("5H") — the mesh key. */
	id: string;
	card: Card;
	zone: Zone;
	/** The seat the card belongs to in this zone (null for the turn-up). */
	seat: number | null;
	x: number;
	y: number;
	z: number;
	rx: number;
	ry: number;
	rz: number;
	faceUp: boolean;
	/** Tapping it plays/selects it (human hand, when the page allows). */
	pickable: boolean;
	/** Not legal to play right now — drawn faded. */
	dimmed: boolean;
	/** Selected (confirm-before-play) or keyboard-focused — lifted and ringed. */
	raised: boolean;
	/** The winning card of a just-finished trick. */
	winner: boolean;
	/** Deal order, for staggering the deal animation. */
	order: number;
}

/** Everything the table needs to know about one moment of a 1v1 game. */
export interface TableView {
	humanSeat: number;
	/** hands[seat], in display order. */
	hands: readonly (readonly Card[])[];
	/** The turn-up, or null once it has been robbed. */
	turnUp: Card | null;
	/** Cards on the table for the live (or just-finished) trick. */
	plays: readonly TrickPlay[];
	/** Winner of the just-finished trick still on show, else null. */
	winnerSeat: number | null;
	/** Swept tricks, oldest first. */
	wonTricks: readonly CompletedTrick[];
	pickable: boolean;
	dimmed: readonly Card[];
	selected: Card | null;
	focused: Card | null;
}

export interface TableViewOptions {
	humanSeat: number;
	/** A just-finished trick to keep on the table (it is the last completed trick). */
	shownTrick?: CompletedTrick | null;
	pickable?: boolean;
	dimmed?: readonly Card[];
	selected?: Card | null;
	focused?: Card | null;
}

/** Build the view for a game state, as the play page shows it. */
export function tableViewFromGame(game: GameState, opts: TableViewOptions): TableView {
	const shown = opts.shownTrick ?? null;
	// While a finished trick is on show it is not yet in a pile.
	const wonTricks = shown ? game.completedTricks.slice(0, -1) : game.completedTricks;
	return {
		humanSeat: opts.humanSeat,
		hands: game.hands,
		turnUp: game.turnUpTaken ? null : game.turnUp,
		plays: shown ? shown.plays : game.currentTrick,
		winnerSeat: shown ? shown.winner : null,
		wonTricks,
		pickable: opts.pickable ?? false,
		dimmed: opts.dimmed ?? [],
		selected: opts.selected ?? null,
		focused: opts.focused ?? null
	};
}

function has(cards: readonly Card[], c: Card): boolean {
	return cards.some((d) => sameCard(c, d));
}

export interface LayoutOptions {
	/**
	 * Narrow (phone) canvas: overlap the hand a little and pull the stock and
	 * trick piles toward the middle, so the camera can sit closer and every
	 * card is drawn larger.
	 */
	compact?: boolean;
}

/** How far the layout reaches from the centre line, for fitting the camera. */
export function tableExtents(compact: boolean): {
	handHalfWidth: number;
	sideHalfWidth: number;
	/** z of the opponent's row of cards. */
	opponentZ: number;
	/** z of the opponent's portrait, just beyond their cards. */
	portraitZ: number;
} {
	return compact
		? { handHalfWidth: 2 * 0.88 + CARD_W / 2, sideHalfWidth: 2.7, opponentZ: -2.3, portraitZ: -3.75 }
		: { handHalfWidth: 2 * 1.06 + CARD_W / 2, sideHalfWidth: 3.15, opponentZ: -2.95, portraitZ: -4.55 };
}

/**
 * The fixed furniture for one arrangement of the table — what the scene needs
 * besides the cards: where the stock sits, where each other player's portrait
 * stands, and the points the camera must keep in view.
 */
export interface Arrangement {
	stock: { x: number; z: number };
	/** One per portrait the scene was created with, in the same order. */
	portraitSpots: readonly { x: number; y: number; z: number; scale: number }[];
	/** World points ([x, y, z]) that must stay on screen. */
	fitPoints: readonly (readonly [number, number, number])[];
}

/** Fit points for your own hand, held up at the near edge. */
export function handFitPoints(handHalfWidth: number): [number, number, number][] {
	const hx = handHalfWidth + 0.12;
	return [
		[-hx, 0.1, 3.95],
		[hx, 0.1, 3.95],
		[-hx, 1.75, 3.2],
		[hx, 1.75, 3.2]
	];
}

/** The 1v1 table: one opponent across from you. */
export function tableArrangement(compact: boolean): Arrangement {
	const e = tableExtents(compact);
	const deck = deckSpot(compact);
	return {
		stock: { x: deck.x, z: deck.z },
		portraitSpots: [{ x: 0, y: 1.0, z: e.portraitZ, scale: 1 }],
		fitPoints: [
			...handFitPoints(e.handHalfWidth),
			// stock, piles, opponent's row
			[-e.sideHalfWidth, 0, -2.0],
			[e.sideHalfWidth, 0, -2.5],
			[-1.9, 0, e.opponentZ - 0.75],
			[1.9, 0, e.opponentZ - 0.75],
			// opponent's portrait
			[-1.15, 1.95, e.portraitZ - 0.25],
			[1.15, 1.95, e.portraitZ - 0.25]
		]
	};
}

export function layoutTable(view: TableView, options: LayoutOptions = {}): CardPlacement[] {
	const compact = options.compact ?? false;
	const handSpacing = compact ? 0.88 : 1.06;
	const deck = deckSpot(compact);
	const { opponentZ } = tableExtents(compact);
	// Compact pulls the far side in, so the trick sits a little nearer you.
	const trickZ = compact ? 0.65 : 0;
	const pileX = compact ? 1.78 : 2.2;
	const pileStep = compact ? 0.08 : 0.11;
	const out: CardPlacement[] = [];
	const human = view.humanSeat;
	const base = {
		ry: 0,
		pickable: false,
		dimmed: false,
		raised: false,
		winner: false,
		order: 0
	};

	// Your hand: held up at the near edge, in a gentle fan.
	const hand = view.hands[human] ?? [];
	const mid = (hand.length - 1) / 2;
	hand.forEach((card, i) => {
		const off = i - mid;
		const raised =
			(view.selected !== null && sameCard(view.selected, card)) ||
			(view.focused !== null && sameCard(view.focused, card));
		out.push({
			...base,
			id: cardId(card),
			card,
			zone: 'hand',
			seat: human,
			x: off * handSpacing,
			// The fan dips at the ends; a raised card lifts clear of its neighbours.
			y: 0.8 - Math.abs(off) * 0.035 + (raised ? 0.3 : 0),
			z: 3.5 + i * 0.006,
			rx: HAND_TILT,
			rz: -off * 0.04,
			faceUp: true,
			pickable: view.pickable,
			dimmed: has(view.dimmed, card),
			raised,
			order: i * 2
		});
	});

	// Opponent's hand: face down in a row across the table.
	view.hands.forEach((cards, seat) => {
		if (seat === human) return;
		const m = (cards.length - 1) / 2;
		cards.forEach((card, i) => {
			out.push({
				...base,
				id: cardId(card),
				card,
				zone: 'opponent',
				seat,
				x: (i - m) * 0.66,
				y: 0.012 + i * 0.008,
				z: opponentZ,
				rx: FACE_DOWN,
				rz: (i - m) * 0.03,
				faceUp: false,
				order: i * 2 + 1
			});
		});
	});

	// Turn-up: face up beside the stock.
	if (view.turnUp) {
		out.push({
			...base,
			id: cardId(view.turnUp),
			card: view.turnUp,
			zone: 'turn-up',
			seat: null,
			x: deck.x + 1.15,
			y: 0.012,
			z: deck.z,
			rx: FACE_UP,
			rz: 0,
			faceUp: true,
			order: 10
		});
	}

	// The trick: each card on its player's side of the middle.
	view.plays.forEach((play, i) => {
		const mine = play.seat === human;
		const winner = view.winnerSeat !== null && play.seat === view.winnerSeat;
		out.push({
			...base,
			id: cardId(play.card),
			card: play.card,
			zone: 'trick',
			seat: play.seat,
			x: mine ? 0.6 : -0.6,
			y: 0.02 + i * 0.01 + (winner ? 0.22 : 0),
			z: (mine ? 0.85 : 0.3) + trickZ,
			rx: FACE_UP,
			rz: mine ? -0.05 : 0.06,
			faceUp: true,
			winner
		});
	});

	// Won tricks: face down, one small step per trick so the count is readable.
	const perSeat = new Map<number, number>();
	view.wonTricks.forEach((trick) => {
		const n = perSeat.get(trick.winner) ?? 0;
		perSeat.set(trick.winner, n + 1);
		const mine = trick.winner === human;
		trick.plays.forEach((play, j) => {
			out.push({
				...base,
				id: cardId(play.card),
				card: play.card,
				zone: 'pile',
				seat: trick.winner,
				x: pileX + n * pileStep + j * 0.03,
				y: 0.012 + (n * 2 + j) * 0.01,
				z: mine ? 1.45 + trickZ : compact ? -1.2 : -1.75,
				rx: FACE_DOWN,
				rz: (n % 2 === 0 ? 0.07 : -0.05) + j * 0.03,
				faceUp: false
			});
		});
	});

	return out;
}
