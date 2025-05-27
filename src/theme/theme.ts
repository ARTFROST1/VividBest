import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#7846dd', // Акцентный Фиолетовый
    secondary: '#F7B801', // Акцентный жёлтый
    background: '#F5F6FA', // Светлый фон
    surface: '#FFFFFF',
    onSurface: '#181818',
    onBackground: '#181818',
    card: '#F5F6FA',
    border: '#E0E0E0',
    text: '#181818',
    placeholder: '#888',
    divider: '#E0E0E0',
    success: '#8BC34A',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
    chipBg: '#E0E0E0',
    chipText: '#181818',
    // Добавьте другие цвета по необходимости
  },
  roundness: 12,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#9543c9', // Акцентный пурпурный
    secondary: '#1976d2', // Акцентный синий
    background: '#181818', // Глубокий тёмный фон
    surface: '#23232A',
    onSurface: '#fff',
    onBackground: '#fff',
    card: '#23232A',
    border: '#333',
    text: '#fff',
    placeholder: '#888',
    divider: '#333',
    success: '#8BC34A',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
    chipBg: '#23232A',
    chipText: '#fff',
    // Добавьте другие цвета по необходимости
  },
  roundness: 12,
}; 