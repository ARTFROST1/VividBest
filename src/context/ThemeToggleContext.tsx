import React, { createContext, useContext } from 'react';

export const ThemeToggleContext = createContext({
  toggleTheme: () => {},
  isDark: false,
});

export const useThemeToggle = () => useContext(ThemeToggleContext); 