/**
 * localStorage persistence for trainer settings and score (SPEC §4: state is
 * in-memory, persisted to localStorage). Safe to call during SSR/prerender —
 * it just returns defaults.
 */

import { browser } from '$app/environment';
import type { Suit } from '$lib/domain/cards.js';
import { isPlausibleGameState, type GameState } from '$lib/domain/game-state.js';
import {
	isPlausibleAuctionState,
	AUCTION_SEATS,
	type AuctionGameState
} from '$lib/domain/auction-game-state.js';
import {
	defaultAuctionConfig,
	defaultSettingValues,
	normalizeAuctionConfig,
	type AuctionConfig,
	type AuctionSettingValues
} from '$lib/domain/auction-config.js';

export type TrumpChoice = Suit | 'random';

export interface TrainerStats {
	asked: number;
	correct: number;
	streak: number;
	bestStreak: number;
}

export interface SavedState {
	stats: TrainerStats;
	trumpChoice: TrumpChoice;
}

const STORAGE_KEY = 'forty-fives.trainer.v1';

export function emptyStats(): TrainerStats {
	return { asked: 0, correct: 0, streak: 0, bestStreak: 0 };
}

function defaults(): SavedState {
	return { stats: emptyStats(), trumpChoice: 'random' };
}

function isCount(n: unknown): n is number {
	return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

export function loadSaved(): SavedState {
	if (!browser) return defaults();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaults();
		const parsed = JSON.parse(raw) as SavedState;
		const s = parsed.stats;
		if (!s || !isCount(s.asked) || !isCount(s.correct) || !isCount(s.streak) || !isCount(s.bestStreak)) {
			return defaults();
		}
		return { stats: s, trumpChoice: parsed.trumpChoice ?? 'random' };
	} catch {
		return defaults();
	}
}

export function saveState(state: SavedState): void {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Storage may be unavailable (private browsing); the trainer still works.
	}
}

// --- Game persistence (Milestone 1) ------------------------------------------

export interface GameSettings {
	/** Highlight which cards are legal to play (SPEC §7, toggleable). */
	highlightLegal: boolean;
	/** Tap once to raise, tap again to play (SPEC §7, default on). */
	confirmPlay: boolean;
}

export interface SavedGame {
	game: GameState | null;
	settings: GameSettings;
	opponentName: string;
}

const GAME_KEY = 'forty-fives.game.v1';

function gameDefaults(): SavedGame {
	return {
		game: null,
		// Defaults: highlighting on, confirm-before-play off (TODO-027). These prefs
		// are now edited on /play/config, not in the game footer.
		settings: { highlightLegal: true, confirmPlay: false },
		opponentName: 'Margaret'
	};
}

export function loadGame(): SavedGame {
	if (!browser) return gameDefaults();
	try {
		const raw = localStorage.getItem(GAME_KEY);
		if (!raw) return gameDefaults();
		const parsed = JSON.parse(raw) as SavedGame;
		const d = gameDefaults();
		return {
			game: isPlausibleGameState(parsed.game) ? parsed.game : null,
			settings: {
				highlightLegal: parsed.settings?.highlightLegal ?? d.settings.highlightLegal,
				confirmPlay: parsed.settings?.confirmPlay ?? d.settings.confirmPlay
			},
			opponentName:
				typeof parsed.opponentName === 'string' && parsed.opponentName
					? parsed.opponentName
					: d.opponentName
		};
	} catch {
		return gameDefaults();
	}
}

export function saveGame(saved: SavedGame): void {
	if (!browser) return;
	try {
		localStorage.setItem(GAME_KEY, JSON.stringify(saved));
	} catch {
		// Storage may be unavailable; the game still works, it just won't resume.
	}
}

// --- Auction game persistence (Milestone 3) ----------------------------------

export interface SavedAuctionGame {
	game: AuctionGameState | null;
	settings: GameSettings;
	/** Display names per seat; seat 0 (the human) is always "You". */
	names: string[];
}

const AUCTION_KEY = 'forty-fives.auction.v1';

/** Default table names — seat 0 is the human, seats 1/3 opponents, seat 2 partner. */
function auctionNames(): string[] {
	return ['You', 'Stewart', 'Margaret', 'Bernadette'];
}

function auctionDefaults(): SavedAuctionGame {
	return {
		game: null,
		// Auction defaults: highlighting on, confirm-before-play off (TODO-026).
		// These prefs are now edited on /auction/config, not in the game footer.
		settings: { highlightLegal: true, confirmPlay: false },
		names: auctionNames()
	};
}

/**
 * Fill fields added after a game might have been saved, so older saves keep
 * resuming: `config` (TODO-011, default to current behaviour — kitty on) and
 * `stock` (TODO-012; an old save can't be mid-draw, so an empty stock is fine).
 */
function withSavedGameDefaults(game: AuctionGameState): AuctionGameState {
	const g = game as { config?: Partial<AuctionSettingValues>; stock?: readonly unknown[] };
	return {
		...game,
		// Per-field merge so a save predating a setting (e.g. FINISH_RULE, TODO-016)
		// gains the new field's default rather than carrying a partial config.
		config: { ...defaultSettingValues(), ...(g.config ?? {}) },
		stock: Array.isArray(g.stock) ? game.stock : []
	};
}

export function loadAuctionGame(): SavedAuctionGame {
	if (!browser) return auctionDefaults();
	try {
		const raw = localStorage.getItem(AUCTION_KEY);
		if (!raw) return auctionDefaults();
		const parsed = JSON.parse(raw) as SavedAuctionGame;
		const d = auctionDefaults();
		const names =
			Array.isArray(parsed.names) &&
			parsed.names.length === AUCTION_SEATS &&
			parsed.names.every((n) => typeof n === 'string' && n)
				? parsed.names
				: d.names;
		return {
			game: isPlausibleAuctionState(parsed.game) ? withSavedGameDefaults(parsed.game) : null,
			settings: {
				highlightLegal: parsed.settings?.highlightLegal ?? d.settings.highlightLegal,
				confirmPlay: parsed.settings?.confirmPlay ?? d.settings.confirmPlay
			},
			names
		};
	} catch {
		return auctionDefaults();
	}
}

export function saveAuctionGame(saved: SavedAuctionGame): void {
	if (!browser) return;
	try {
		localStorage.setItem(AUCTION_KEY, JSON.stringify(saved));
	} catch {
		// Storage may be unavailable; the game still works, it just won't resume.
	}
}

// --- Auction rules config (TODO-010) -----------------------------------------
// Separate from the in-game GameSettings above: this is the rules profile
// (kitty/discard) chosen on /auction/config. Inert for now — see TODO-010.

const AUCTION_CONFIG_KEY = 'forty-fives.auction-config.v1';

export function loadAuctionConfig(): AuctionConfig {
	if (!browser) return defaultAuctionConfig();
	try {
		const raw = localStorage.getItem(AUCTION_CONFIG_KEY);
		if (!raw) return defaultAuctionConfig();
		return normalizeAuctionConfig(JSON.parse(raw));
	} catch {
		return defaultAuctionConfig();
	}
}

export function saveAuctionConfig(config: AuctionConfig): void {
	if (!browser) return;
	try {
		localStorage.setItem(AUCTION_CONFIG_KEY, JSON.stringify(config));
	} catch {
		// Storage may be unavailable (private browsing); config just won't persist.
	}
}

// --- Auction stats (TODO-033) ------------------------------------------------
// Lifetime tallies for the human's team, shown on /auction/stats. Local-only,
// like the trainer stats (SPEC §7 forbids network analytics, not local counts);
// kept out of AuctionGameState so saved games stay pure game data.

export interface AuctionStats {
	/** Tricks completed across all games. */
	tricksTotal: number;
	/** Of those, tricks won by the human's team. */
	tricksWonByTeam: number;
	/** Games played to completion (abandoned games are not counted). */
	gamesTotal: number;
	/** Of those, games won by the human's team. */
	gamesWonByTeam: number;
}

const AUCTION_STATS_KEY = 'forty-fives.auction-stats.v1';

export function emptyAuctionStats(): AuctionStats {
	return { tricksTotal: 0, tricksWonByTeam: 0, gamesTotal: 0, gamesWonByTeam: 0 };
}

export function loadAuctionStats(): AuctionStats {
	if (!browser) return emptyAuctionStats();
	try {
		const raw = localStorage.getItem(AUCTION_STATS_KEY);
		if (!raw) return emptyAuctionStats();
		const parsed = JSON.parse(raw) as Partial<AuctionStats>;
		const d = emptyAuctionStats();
		// Per-field fallback so a partial or older blob still loads sensibly.
		return {
			tricksTotal: isCount(parsed.tricksTotal) ? parsed.tricksTotal : d.tricksTotal,
			tricksWonByTeam: isCount(parsed.tricksWonByTeam) ? parsed.tricksWonByTeam : d.tricksWonByTeam,
			gamesTotal: isCount(parsed.gamesTotal) ? parsed.gamesTotal : d.gamesTotal,
			gamesWonByTeam: isCount(parsed.gamesWonByTeam) ? parsed.gamesWonByTeam : d.gamesWonByTeam
		};
	} catch {
		return emptyAuctionStats();
	}
}

export function saveAuctionStats(stats: AuctionStats): void {
	if (!browser) return;
	try {
		localStorage.setItem(AUCTION_STATS_KEY, JSON.stringify(stats));
	} catch {
		// Storage may be unavailable (private browsing); stats just won't persist.
	}
}

// --- Forty-Fives (1v1) stats (TODO-034) --------------------------------------
// Lifetime tallies for the human player in the 1v1 game, shown on /play/stats.
// Parallel to AuctionStats but solo (a player, not a team); kept in its own blob
// so the two games' stats are independent and saved games stay pure data.

export interface PlayStats {
	/** Tricks completed across all games. */
	tricksTotal: number;
	/** Of those, tricks won by the human. */
	tricksWonByUser: number;
	/** Games played to completion (abandoned games are not counted). */
	gamesTotal: number;
	/** Of those, games won by the human. */
	gamesWonByUser: number;
}

const PLAY_STATS_KEY = 'forty-fives.play-stats.v1';

export function emptyPlayStats(): PlayStats {
	return { tricksTotal: 0, tricksWonByUser: 0, gamesTotal: 0, gamesWonByUser: 0 };
}

export function loadPlayStats(): PlayStats {
	if (!browser) return emptyPlayStats();
	try {
		const raw = localStorage.getItem(PLAY_STATS_KEY);
		if (!raw) return emptyPlayStats();
		const parsed = JSON.parse(raw) as Partial<PlayStats>;
		const d = emptyPlayStats();
		// Per-field fallback so a partial or older blob still loads sensibly.
		return {
			tricksTotal: isCount(parsed.tricksTotal) ? parsed.tricksTotal : d.tricksTotal,
			tricksWonByUser: isCount(parsed.tricksWonByUser) ? parsed.tricksWonByUser : d.tricksWonByUser,
			gamesTotal: isCount(parsed.gamesTotal) ? parsed.gamesTotal : d.gamesTotal,
			gamesWonByUser: isCount(parsed.gamesWonByUser) ? parsed.gamesWonByUser : d.gamesWonByUser
		};
	} catch {
		return emptyPlayStats();
	}
}

export function savePlayStats(stats: PlayStats): void {
	if (!browser) return;
	try {
		localStorage.setItem(PLAY_STATS_KEY, JSON.stringify(stats));
	} catch {
		// Storage may be unavailable (private browsing); stats just won't persist.
	}
}
