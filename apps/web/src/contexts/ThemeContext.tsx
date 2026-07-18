import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type ThemeContextValue = {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
};

const ACCENT_STORAGE_KEY = 'talkio-accent-color';
const DARK_STORAGE_KEY = 'talkio-dark-mode';
const DEFAULT_ACCENT = '#7C3AED';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getInitialAccent = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_ACCENT;
  }
  return localStorage.getItem(ACCENT_STORAGE_KEY) || DEFAULT_ACCENT;
};

const getInitialDarkMode = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  const stored = localStorage.getItem(DARK_STORAGE_KEY);
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);
  const [accentColor, setAccentColor] = useState<string>(getInitialAccent);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(DARK_STORAGE_KEY, darkMode ? 'true' : 'false');
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--beige-1', accentColor);
    localStorage.setItem(ACCENT_STORAGE_KEY, accentColor);
  }, [accentColor]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      darkMode,
      toggleDarkMode,
      setDarkMode,
      accentColor,
      setAccentColor,
    }),
    [darkMode, accentColor, toggleDarkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

