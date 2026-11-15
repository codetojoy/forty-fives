/**
 * Card placement for the 3D table in Auction Forty-Fives (four seats).
 *
 * Same contract as layout.ts — pure numbers, no three.js, tested in
 * tests/ui/table3d-auction-layout.test.ts — and the same world: +z toward you,
 * +x to your right. Seats follow the 2D page: you are south, your partner
 * (seat 2) north, seat 1 east (your right), seat 3 west.
 *
 * Fixed spots: the stock far-left and the opponents' won tricks far-right
 * (flanking your partner), your team's won tricks near-right, the kitty in the
 * middle until the bid winner takes it.
 */

import { cardId, sameCard, type Card } from '$lib/domain/cards.js';
import type { CompletedTrick, TrickPlay } from '$lib/domain/game-state.js';
import type { AuctionGameState } from '$lib/domain/auction-game-state.js';
import {
	CARD_W,
	handFitPoints,
	type Arrangement,
	type CardPlacement,
	type LayoutOptions
} from './layout.js';

const FACE_UP = -Math.PI / 2;
const FACE_DOWN = Math.PI / 2;
const HAND_TILT = -0.85;

/** Where a seat sits, relative to the human. */
export type Side = 'south' | 'east' | 'north' | 'west';

/** Seats run clockwise from the human; seat 1 is on the human's right. */
export function sideOf(seat: number, humanSeat: number): Side {
	return (['south', 'east', 'north', 'west'] as const)[(seat - humanSeat + 4) % 4];
}

interface Dims {
	handSpacing: number;
	handHalfWidth: number;
	northZ: number;
	northSpacing: number;
	/** |x| of the east/west rows. */
	sideX: number;
	/**
	 * East/west cards lie lengthways across their row (facing that player). On
	 * the compact table they stay upright instead, which is narrower and leaves
	 * room for the portrait at the table edge.
	 */
	sideLengthways: boolean;
	/** Size of the east/west portraits relative to north's. */
	sidePortraitScale: number;
	sideSpacing: number;
	/** z of the middle of the east/west rows. */
	sideZ: number;
	/** |x| and z of the far corners (stock on the left, opponents' pile on the right). */
	cornerX: number;
	cornerZ: number;
	/** Your team's pile of won tricks. */
	myPile: { x: number; z: number };
	/** Shift of the trick toward you. */
	trickZ: number;
	portraitZ: number;
}

function dims(compact: boolean): Dims {
	return compact
		? {
				handSpacing: 0.88,
				handHalfWidth: 2 * 0.88 + CARD_W / 2,
				northZ: -2.3,
				northSpacing: 0.36,
				sideX: 2.1,
				sideLengthways: false,
				sidePortraitScale: 0.62,
				sideSpacing: 0.3,
				sideZ: 0.3,
				cornerX: 2.15,
				cornerZ: -2.6,
				myPile: { x: 2.35, z: 2.35 },
				trickZ: 0.2,
				portraitZ: -3.75
			}
		: {
				handSpacing: 1.06,
				handHalfWidth: 2 * 1.06 + CARD_W / 2,
				northZ: -2.95,
				northSpacing: 0.66,
				sideX: 3.3,
				sideLengthways: true,
				sidePortraitScale: 0.8,
				sideSpacing: 0.45,
				sideZ: 0.4,
				cornerX: 2.6,
				cornerZ: -2.9,
				myPile: { x: 2.95, z: 2.55 },
				trickZ: 0,
				portraitZ: -4.55
			};
}

/** Portrait order the scene is created with: partner, then right and left opponents. */
export const AUCTION_PORTRAIT_SIDES: readonly Side[] = ['north', 'east', 'west'];

export function auctionArrangement(compact: boolean): Arrangement {
	const d = dims(compact);
	// How far a side card reaches outward from the middle of its row.
	const sideCardReach = d.sideLengthways ? 0.7 : CARD_W / 2;
	const sideScale = d.sidePortraitScale;
	// East and west stand at the table edge, outward of their cards and level
	// with the middle of the row — the same relationship north has to its row.
	const sidePortraitX = d.sideX + sideCardReach + 0.72 * sideScale;
	const sidePortraitY = 0.9 * sideScale + 0.05;
	// A portrait's name is its widest part.
	const sideReach = sidePortraitX + 0.78 * sideScale;
	return {
		stock: { x: -d.cornerX, z: d.cornerZ },
		portraitSpots: [
			{ x: 0, y: 1.0, z: d.portraitZ, scale: 1 },
			{ x: sidePortraitX, y: sidePortraitY, z: d.sideZ, scale: sideScale },
			{ x: -sidePortraitX, y: sidePortraitY, z: d.sideZ, scale: sideScale }
		],
		fitPoints: [
			...handFitPoints(d.handHalfWidth),
			// east / west: the ends of their rows, and their portraits at the edge
			[-d.sideX - sideCardReach, 0, d.sideZ + 1.5],
			[d.sideX + sideCardReach, 0, d.sideZ + 1.5],
			[-d.sideX - sideCardReach, 0, d.sideZ - 1.5],
			[d.sideX + sideCardReach, 0, d.sideZ - 1.5],
			[-sideReach, 0, d.sideZ + 0.3],
			[sideReach, 0, d.sideZ + 0.3],
			[-sideReach, sidePortraitY + 0.9 * sideScale, d.sideZ],
			[sideReach, sidePortraitY + 0.9 * sideScale, d.sideZ],
			// far corners (stock, opponents' pile) and the partner's portrait
			[-d.cornerX - 0.6, 0, d.cornerZ - 0.75],
			[d.cornerX + 1.0, 0, d.cornerZ - 0.75],
			[-1.15, 1.95, d.portraitZ - 0.25],
			[1.15, 1.95, d.portraitZ - 0.25]
		]
	};
}

/** Everything the table needs to know about one moment of an auction game. */
export interface AuctionTableView {
	humanSeat: number;
	/** hands[seat]; the human's is in display order. */
	hands: readonly (readonly Card[])[];
	/** The kitty while it still lies on the table. */
	kitty: readonly Card[];
	plays: readonly TrickPlay[];
	winnerSeat: number | null;
	/** Swept tricks, oldest first. */
	wonTricks: readonly CompletedTrick[];
	pickable: boolean;
	dimmed: readonly Card[];
	/** Selected for play, discard, or exchange — plus the keyboard-focused card. */
	raised: readonly Card[];
}

export interface AuctionTableViewOptions {
	humanSeat: number;
	/** The human's hand in display order, if the page sorts it. */
	displayHand?: readonly Card[];
	/** A just-finished trick to keep on the table (it is the last completed trick). */
	shownTrick?: { plays: readonly TrickPlay[]; winner: number } | null;
	pickable?: boolean;
	dimmed?: readonly Card[];
	raised?: readonly Card[];
}

export function auctionTableView(
	game: AuctionGameState,
	opts: AuctionTableViewOptions
): AuctionTableView {
	const shown = opts.shownTrick ?? null;
	return {
		humanSeat: opts.humanSeat,
		hands: game.hands.map((h, seat) =>
			seat === opts.humanSeat && opts.displayHand ? opts.displayHand : h
		),
		kitty: game.kitty,
		plays: shown ? shown.plays : game.currentTrick,
		winnerSeat: shown ? shown.winner : null,
		wonTricks: shown ? game.completedTricks.slice(0, -1) : game.completedTricks,
		pickable: opts.pickable ?? false,
		dimmed: opts.dimmed ?? [],
		raised: opts.raised ?? []
	};
}

function has(cards: readonly Card[], c: Card): boolean {
	return cards.some((d) => sameCard(c, d));
}

/** Spacing that keeps `n` cards inside the span five would take. */
function fitSpacing(spacing: number, n: number): number {
	return n <= 5 ? spacing : (spacing * 4) / (n - 1);
}

export function layoutAuctionTable(
	view: AuctionTableView,
	options: LayoutOptions = {}
): CardPlacement[] {
	const d = dims(options.compact ?? false);
	const human = view.humanSeat;
	const out: CardPlacement[] = [];
	const base = {
		ry: 0,
		pickable: false,
		dimmed: false,
		raised: false,
		winner: false,
		order: 0
	};

	view.hands.forEach((cards, seat) => {
		const side = sideOf(seat, human);
		const n = cards.length;
		const mid = (n - 1) / 2;
		cards.forEach((card, i) => {
			const off = i - mid;
			// Deal order: one card to each seat in turn.
			const order = i * 4 + ((seat - human + 4) % 4);
			if (side === 'south') {
				const raised = has(view.raised, card);
				const spacing = fitSpacing(d.handSpacing, n);
				out.push({
					...base,
					id: cardId(card),
					card,
					zone: 'hand',
					seat,
					x: off * spacing,
					y: 0.8 - Math.abs(off) * (0.14 / Math.max(mid, 1)) * 0.5 + (raised ? 0.3 : 0),
					z: 3.5 + i * 0.006,
					rx: HAND_TILT,
					rz: -off * (0.16 / Math.max(n - 1, 4)),
					faceUp: true,
					pickable: view.pickable,
					dimmed: has(view.dimmed, card),
					raised,
					order
				});
			} else if (side === 'north') {
				out.push({
					...base,
					id: cardId(card),
					card,
					zone: 'opponent',
					seat,
					x: off * fitSpacing(d.northSpacing, n),
					y: 0.012 + i * 0.008,
					z: d.northZ,
					rx: FACE_DOWN,
					rz: off * 0.03,
					faceUp: false,
					order
				});
			} else {
				// East / west: a row running away from you.
				const sign = side === 'east' ? 1 : -1;
				out.push({
					...base,
					id: cardId(card),
					card,
					zone: 'opponent',
					seat,
					x: sign * d.sideX,
					y: 0.012 + i * 0.008,
					z: d.sideZ + off * fitSpacing(d.sideSpacing, n),
					rx: FACE_DOWN,
					rz: (d.sideLengthways ? sign * (Math.PI / 2) : 0) + off * 0.03,
					faceUp: false,
					order
				});
			}
		});
	});

	// The kitty: face down in the middle until the bid winner takes it.
	const km = (view.kitty.length - 1) / 2;
	view.kitty.forEach((card, i) => {
		out.push({
			...base,
			id: cardId(card),
			card,
			zone: 'kitty',
			seat: null,
			x: (i - km) * 0.4,
			y: 0.012 + i * 0.008,
			z: 0.35 + d.trickZ,
			rx: FACE_DOWN,
			rz: (i - km) * 0.08,
			faceUp: false,
			order: 20 + i
		});
	});

	// The trick: each card in front of the seat that played it.
	const TRICK_SPOT: Record<Side, { x: number; z: number; rz: number }> = {
		south: { x: 0, z: 1.15, rz: -0.04 },
		east: { x: 1.05, z: 0.35, rz: -0.12 },
		north: { x: 0, z: -0.45, rz: 0.05 },
		west: { x: -1.05, z: 0.35, rz: 0.12 }
	};
	view.plays.forEach((play, i) => {
		const spot = TRICK_SPOT[sideOf(play.seat, human)];
		const winner = view.winnerSeat !== null && play.seat === view.winnerSeat;
		out.push({
			...base,
			id: cardId(play.card),
			card: play.card,
			zone: 'trick',
			seat: play.seat,
			x: spot.x,
			y: 0.02 + i * 0.01 + (winner ? 0.22 : 0),
			z: spot.z + d.trickZ,
			rx: FACE_UP,
			rz: spot.rz,
			faceUp: true,
			winner
		});
	});

	// Won tricks, per partnership: yours near-right, theirs far-right.
	const perTeam = new Map<number, number>();
	const myTeam = human % 2;
	view.wonTricks.forEach((trick) => {
		const team = trick.winner % 2;
		const n = perTeam.get(team) ?? 0;
		perTeam.set(team, n + 1);
		const mine = team === myTeam;
		trick.plays.forEach((play, j) => {
			out.push({
				...base,
				id: cardId(play.card),
				card: play.card,
				zone: 'pile',
				seat: trick.winner,
				x: (mine ? d.myPile.x : d.cornerX) + n * 0.09 + j * 0.02,
				y: 0.012 + (n * 4 + j) * 0.008,
				z: mine ? d.myPile.z : d.cornerZ,
				rx: FACE_DOWN,
				rz: (n % 2 === 0 ? 0.07 : -0.05) + j * 0.02,
				faceUp: false
			});
		});
	});

	return out;
}
