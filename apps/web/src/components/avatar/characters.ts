/**
 * Companion character manifest — chibi-style critters built from primitives in Avatar3D
 * (oversized head, big sparkly eyes, blush cheeks, bright colors). Kept fully procedural
 * rather than sourcing third-party 3D models: it's the most reliable way to guarantee a
 * bright, friendly, unmistakably "for kids" look rather than a realistic animal.
 *
 * Each character has its own name and ElevenLabs voice (`voiceId`) so switching companions
 * changes who the student is talking to, not just how the panel looks. Voice IDs are
 * ElevenLabs' standard premade library voices, confirmed available on this project's account.
 */
export interface CharacterDef {
  id: string;
  name: string;
  species: 'fox' | 'cat' | 'bunny' | 'panda';
  color: string;
  accentColor: string;
  /** ElevenLabs premade voice ID used when this companion speaks. */
  voiceId: string;
  voiceGender: 'male' | 'female';
  /** Optional fine-tune scale multiplier (default 1). */
  scale?: number;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'fox', name: 'Ember', species: 'fox', color: '#ff9f5a', accentColor: '#fff3e0',
    voiceId: 'IKne3meq5aSn9XLyUdCD', voiceGender: 'male', // Charlie — deep, confident, energetic
  },
  {
    id: 'cat', name: 'Sky', species: 'cat', color: '#6ec6ff', accentColor: '#fff7f0',
    voiceId: 'FGY2WhTYpPnrIDTdsKH5', voiceGender: 'female', // Laura — enthusiastic, quirky
  },
  {
    id: 'bunny', name: 'Coco', species: 'bunny', color: '#ffb6d9', accentColor: '#ffffff',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', voiceGender: 'female', // Sarah — mature, reassuring
  },
  {
    id: 'panda', name: 'Bao', species: 'panda', color: '#fafafa', accentColor: '#ffffff',
    voiceId: 'JBFqnCBsd6RMkjVDRZzb', voiceGender: 'male', // George — warm, captivating storyteller
  },
];

export const DEFAULT_CHARACTER_ID = CHARACTERS[0].id;

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
