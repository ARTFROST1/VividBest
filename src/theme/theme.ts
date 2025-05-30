import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#8a44da', // Акцентный Фиолетовый
    secondary: '#F7B801', // Акцентный жёлтый
    accent: '#F7B801', // Акцентный цвет для выделения элементов
    background: '#F5F6FA', // Светлый фон
    surface: '#FFFFFF',
    onSurface: '#181818',
    onBackground: '#181818',
    card: '#F5F6FA',
    border: '#E0E0E0',
    text: '#181818',
    placeholder: '#888',
    disabled: '#CCCCCC',
    divider: '#E0E0E0',
    success: '#8BC34A',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
    chipBg: '#E0E0E0',
    chipText: '#181818',
    noteItem: '#FFFFFF',
    noteItemSelected: '#F0E6FA', // Светло-фиолетовый для выделенных заметок
    noteItemBorder: '#E0E0E0',
    folderItem: '#F8F8F8',
    folderItemText: '#181818',
    swipeDelete: '#FF3B30',
    swipePin: '#F7B801',
    modalBackground: '#FFFFFF',
    modalBorder: '#E0E0E0',
    toolbarBackground: '#FFFFFF',
    editorBackground: '#FFFFFF',
    statusBarContent: 'dark-content',
    // Расширенная цветовая палитра для заметок
  },
  roundness: 12,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#a56deb', // Более светлый фиолетовый для темной темы
    secondary: '#F7B801', // Тот же акцентный жёлтый для консистентности
    accent: '#F7B801', // Акцентный цвет для выделения элементов
    background: '#181818', // Глубокий тёмный фон
    surface: '#23232A',
    onSurface: '#FFFFFF',
    onBackground: '#FFFFFF',
    card: '#23232A',
    border: '#333333',
    text: '#FFFFFF',
    placeholder: '#888888',
    disabled: '#555555',
    divider: '#333333',
    success: '#8BC34A',
    warning: '#FFC107',
    error: '#F44336',
    info: '#2196F3',
    chipBg: '#333333',
    chipText: '#FFFFFF',
    noteItem: '#23232A',
    noteItemSelected: '#3A2A4D', // Темно-фиолетовый для выделенных заметок
    noteItemBorder: '#333333',
    folderItem: '#2A2A32',
    folderItemText: '#FFFFFF',
    swipeDelete: '#FF3B30',
    swipePin: '#F7B801',
    modalBackground: '#23232A',
    modalBorder: '#333333',
    toolbarBackground: '#23232A',
    editorBackground: '#23232A',
    statusBarContent: 'light-content',
    // Расширенная цветовая палитра для заметок
  },
  roundness: 12,
}; 