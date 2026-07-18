/**
 * User Preferences Store
 * Simple localStorage-based state management for user preferences
 */
import { DEFAULT_CHARACTER_ID } from '../components/avatar/characters';

export interface UserPreferences {
  autoPlayVoice: boolean;
  voiceId: string;
  characterId: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  autoPlayVoice: false,
  voiceId: 'Rachel',
  characterId: DEFAULT_CHARACTER_ID,
};

const STORAGE_KEY = 'talkitout_user_prefs';

/**
 * Get user preferences from localStorage
 */
export function getUserPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.error('Error loading user preferences:', error);
  }
  return DEFAULT_PREFERENCES;
}

/**
 * Save user preferences to localStorage
 */
export function saveUserPreferences(prefs: Partial<UserPreferences>): void {
  try {
    const current = getUserPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

/**
 * Get a specific preference value
 */
export function getPreference<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
  const prefs = getUserPreferences();
  return prefs[key];
}

/**
 * Set a specific preference value
 */
export function setPreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): void {
  saveUserPreferences({ [key]: value } as Partial<UserPreferences>);
}

/**
 * Reset preferences to defaults
 */
export function resetPreferences(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
  } catch (error) {
    console.error('Error resetting user preferences:', error);
  }
}
