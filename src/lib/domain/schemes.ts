/**
 * Registry of bundled trump schemes. Regional variants (pei.json,
 * northern-nb.json, cape-breton.json) get added here once their rules have
 * been validated with real players — see SPEC §6 and §11.
 */

import standardJson from '../assets/trump-schemes/standard.json';
import { loadTrumpScheme, type TrumpScheme, type TrumpSchemeData } from './trump-scheme.js';

export const STANDARD_SCHEME: TrumpScheme = loadTrumpScheme(standardJson as TrumpSchemeData);

export const ALL_SCHEMES: readonly TrumpScheme[] = [STANDARD_SCHEME];

export function getScheme(id: string): TrumpScheme {
	const scheme = ALL_SCHEMES.find((s) => s.id === id);
	if (!scheme) throw new Error(`Unknown trump scheme: "${id}"`);
	return scheme;
}
