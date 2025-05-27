import React, { useMemo, useState, PropsWithChildren } from 'react';
import { PaperProvider } from 'react-native-paper';
import { lightTheme, darkTheme } from '../src/theme/theme';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import RootNavigator from '../src/navigation/RootNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeToggleContext } from '../src/context/ThemeToggleContext';
import '../src/locales/i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/locales/i18n';

export default function AppLayout() {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  const toggleTheme = () => setIsDark((prev) => !prev);
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeToggleContext.Provider value={{ toggleTheme, isDark }}>
        <I18nextProvider i18n={i18n}>
          <PaperProvider theme={theme}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <RootNavigator />
          </PaperProvider>
        </I18nextProvider>
      </ThemeToggleContext.Provider>
    </GestureHandlerRootView>
  );
} 