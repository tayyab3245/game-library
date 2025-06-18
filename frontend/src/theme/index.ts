import light  from './light';
import dark   from './dark';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  background: string;
  primary: string;
  surface: string;
  text: string;
  shadow: string;
  glow: string;
  embossed: string;
}

export const getTheme = (mode: ThemeMode): Theme =>
  mode === 'dark' ? dark : light;