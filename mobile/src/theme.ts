import { Platform, useColorScheme } from 'react-native';

export interface Palette {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  success: string;
  danger: string;
}

// Hex values copied from client/src/index.css (Warm kitchen); accentSoft and danger are mobile-only.
export const lightPalette: Palette = {
  background: '#FBF3E6',
  surface: '#FFFAF2',
  border: '#DCC7AE',
  text: '#3B2A20',
  muted: '#6B5547',
  accent: '#B4491F',
  onAccent: '#FFFFFF',
  accentSoft: '#F6E1D3',
  success: '#2F6B3A',
  danger: '#A3261C',
};

export const darkPalette: Palette = {
  background: '#241A15',
  surface: '#2F221B',
  border: '#5A4437',
  text: '#F6ECE0',
  muted: '#CDB9A8',
  accent: '#E8926A',
  onAccent: '#2A1A12',
  accentSoft: '#4A2E22',
  success: '#8FD09A',
  danger: '#F2A89F',
};

export const serifFamily: string = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24 };
export const radius = { sm: 8, md: 12, pill: 999 };

export function useTheme(): { palette: Palette; scheme: 'light' | 'dark' } {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { palette: scheme === 'dark' ? darkPalette : lightPalette, scheme };
}
