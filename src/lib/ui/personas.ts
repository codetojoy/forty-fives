/**
 * The AI personas shared across game modes (TODO-038/039): a name always wears
 * the same face, whichever game it appears in. Both game pages build their own
 * opponent/seat mappings from this one table (TODO-044).
 */
import avatarMargaret from '$lib/assets/avatars/peep-01.svg';
import avatarStewart from '$lib/assets/avatars/peep-02.svg';
import avatarBernadette from '$lib/assets/avatars/peep-16.svg';

export const PERSONA_AVATARS: Record<string, string> = {
	Margaret: avatarMargaret,
	Stewart: avatarStewart,
	Bernadette: avatarBernadette
};
