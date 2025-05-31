import React, { useEffect, useState } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { useThemeToggle } from '../context/ThemeToggleContext';

const DARK_BG = '#000';
const LIGHT_BG = '#f3f2f8';

export const ThemedStatusBar: React.FC = () => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isDark } = useThemeToggle();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Reset ready state when theme changes
    setIsReady(false);
    
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50); // Small delay to ensure synchronous updates

    return () => clearTimeout(timer);
  }, [isDark]);

  if (!isReady) {
    return null;
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? DARK_BG : LIGHT_BG}
      />
      <View 
        style={{ 
          height: insets.top,
          backgroundColor: isDark ? DARK_BG : LIGHT_BG,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0
        }} 
      />
    </>
  );
};
