/**
 * Companion character manifest — chibi-style critters built from primitives in Avatar3D
 * (oversized head, big sparkly eyes, blush cheeks, bright colors). Kept fully procedural
 * rather than sourcing third-party 3D models: it's the most reliable way to guarantee a
 * bright, friendly, unmistakably "for kids" look rather than a realistic animal.
 */
export interface CharacterDef {
  id: string;
  name: string;
  species: 'fox' | 'cat' | 'bunny' | 'panda';
  color: string;
  accentColor: string;
  /** Optional fine-tune scale multiplier (default 1). */
  scale?: number;
}

export const CHARACTERS: CharacterDef[] = [
  { id: 'fox', name: 'Fox', species: 'fox', color: '#ff9f5a', accentColor: '#fff3e0' },
  { id: 'cat', name: 'Cat', species: 'cat', color: '#6ec6ff', accentColor: '#fff7f0' },
  { id: 'bunny', name: 'Bunny', species: 'bunny', color: '#ffb6d9', accentColor: '#ffffff' },
  { id: 'panda', name: 'Panda', species: 'panda', color: '#fafafa', accentColor: '#ffffff' },
];

export const DEFAULT_CHARACTER_ID = CHARACTERS[0].id;

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
