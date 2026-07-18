/**
 * Companion character manifest.
 *
 * Two kinds of entries are supported:
 * - `procedural`: built from primitive Three.js shapes at runtime — no asset files needed.
 * - `model`: a real rigged file loaded from `modelPath` (see `apps/web/public/models/`).
 *   `format` picks the loader: 'fbx' (three's FBXLoader via drei's useFBX) or 'glb'
 *   (drei's useGLTF). Avatar3D plays the model's first animation clip as idle and layers
 *   the same talk-amplitude motion used by procedural characters on top.
 */
export interface CharacterDef {
  id: string;
  name: string;
  kind: 'procedural' | 'model';
  species?: 'fox' | 'cat' | 'owl';
  color?: string;
  accentColor?: string;
  modelPath?: string;
  format?: 'fbx' | 'glb';
  /** Optional fine-tune multiplier applied on top of Avatar3D's auto-fit scale (default 1). */
  scale?: number;
  /** Radians to rotate the model around Y so it faces the camera (source models vary). */
  rotationY?: number;
}

// Cat/Dog/Eagle are real CC0 rigged models ("Animal Pack Vol.2" by Quaternius — see
// public/models/CREDITS.md). No CC0 rigged fox with animation was found, so Fox stays
// procedural rather than shipping an unrigged or wrongly-licensed placeholder.
export const CHARACTERS: CharacterDef[] = [
  { id: 'fox', name: 'Fox', kind: 'procedural', species: 'fox', color: '#e8823a', accentColor: '#fff4e8' },
  { id: 'cat', name: 'Cat', kind: 'model', modelPath: 'models/Cat.fbx', format: 'fbx', rotationY: -Math.PI / 2 },
  { id: 'dog', name: 'Dog', kind: 'model', modelPath: 'models/Dog.fbx', format: 'fbx', rotationY: -Math.PI / 2 },
  { id: 'eagle', name: 'Eagle', kind: 'model', modelPath: 'models/Eagle.fbx', format: 'fbx', rotationY: 0 },
];

export const DEFAULT_CHARACTER_ID = CHARACTERS[0].id;

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
