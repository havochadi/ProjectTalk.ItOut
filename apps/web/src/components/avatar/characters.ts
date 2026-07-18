/**
 * Companion character manifest.
 *
 * Two kinds of entries are supported:
 * - `procedural`: built from primitive Three.js shapes at runtime — no asset files needed.
 * - `model`: a real rigged glTF/GLB file loaded from `modelPath` (place files under
 *   `apps/web/public/models/`). Add an entry here once a model file exists; Avatar3D
 *   will load it with the same idle/talk animation pipeline used for procedural characters.
 */
export interface CharacterDef {
  id: string;
  name: string;
  kind: 'procedural' | 'model';
  species?: 'fox' | 'cat' | 'owl';
  color?: string;
  accentColor?: string;
  modelPath?: string;
  scale?: number;
}

export const CHARACTERS: CharacterDef[] = [
  { id: 'fox', name: 'Fox', kind: 'procedural', species: 'fox', color: '#e8823a', accentColor: '#fff4e8' },
  { id: 'cat', name: 'Cat', kind: 'procedural', species: 'cat', color: '#8a8f9c', accentColor: '#f2f3f5' },
  { id: 'owl', name: 'Owl', kind: 'procedural', species: 'owl', color: '#7b6fad', accentColor: '#e9e6f7' },
];

export const DEFAULT_CHARACTER_ID = CHARACTERS[0].id;

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
