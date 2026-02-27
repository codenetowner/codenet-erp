export const lightColors = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  secondary: '#10B981',
  accent: '#3B82F6',
  background: '#F8F9FC',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255,255,255,0.8)',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  gold: '#F59E0B',
  amber: '#F59E0B',
  rose: '#F43F5E',
  tabActive: '#6366F1',
  tabInactive: '#94A3B8',
  cardShadow: 'rgba(99, 102, 241, 0.15)',
  gradient: {
    primary: ['#6366F1', '#3B82F6'],
    emerald: ['#34D399', '#10B981'],
    amber: ['#FBBF24', '#F59E0B'],
    rose: ['#FB7185', '#F43F5E'],
  },
};

export const darkColors = {
  primary: '#818CF8',
  primaryDark: '#6366F1',
  primaryLight: '#A5B4FC',
  secondary: '#34D399',
  accent: '#60A5FA',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceGlass: 'rgba(30,41,59,0.8)',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  borderLight: '#1E293B',
  error: '#F87171',
  warning: '#FBBF24',
  success: '#34D399',
  gold: '#FBBF24',
  amber: '#FBBF24',
  rose: '#FB7185',
  tabActive: '#818CF8',
  tabInactive: '#64748B',
  cardShadow: 'rgba(129, 140, 248, 0.2)',
  gradient: {
    primary: ['#818CF8', '#60A5FA'],
    emerald: ['#34D399', '#10B981'],
    amber: ['#FBBF24', '#F59E0B'],
    rose: ['#FB7185', '#F43F5E'],
  },
};

// Default export for backward compatibility — will be overridden by useThemeStore
export let colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};
