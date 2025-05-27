import { MD3LightTheme, MD3DarkTheme, Theme } from 'react-native-paper';

export const lightTheme: Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6750A4',
    secondary: '#625B71',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    // Добавьте другие цвета Material You по необходимости
  },
};

export const darkTheme: Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#D0BCFF',
    secondary: '#CCC2DC',
    background: '#1C1B1F',
    surface: '#23232A',
    // Добавьте другие цвета Material You по необходимости
  },
}; 