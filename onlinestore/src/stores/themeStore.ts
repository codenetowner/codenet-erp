import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../theme';

const THEME_KEY = '@app_theme';

type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  colors: typeof lightColors;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  loadSavedTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'light',
  colors: lightColors,

  setMode: async (mode: ThemeMode) => {
    set({ mode, colors: mode === 'dark' ? darkColors : lightColors });
    try { await AsyncStorage.setItem(THEME_KEY, mode); } catch {}
  },

  toggle: () => {
    const next = get().mode === 'light' ? 'dark' : 'light';
    get().setMode(next);
  },

  loadSavedTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') {
        set({ mode: saved, colors: saved === 'dark' ? darkColors : lightColors });
      }
    } catch {}
  },
}));
