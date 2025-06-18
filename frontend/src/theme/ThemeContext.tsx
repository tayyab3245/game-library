import React, { createContext, useContext } from 'react';
import { Theme } from './index';

export const ThemeContext = createContext<Theme | null>(null);
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('ThemeContext not provided');
  return ctx;
};

interface ProviderProps {
  theme: Theme;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ProviderProps> = ({ theme, children }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);