import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { PaperProvider } from 'react-native-paper';
import { lightTheme, darkTheme } from '../src/theme/theme';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View, AppState, AppStateStatus, Platform } from 'react-native';
import RootNavigator from '../src/navigation/RootNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeToggleContext } from '../src/context/ThemeToggleContext';
import '../src/locales/i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/locales/i18n';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';

// Debug helper
if (__DEV__) {
  const origLog = console.log;
  console.log = (...args: any[]) => {
    // @ts-ignore
    global.lastLog = JSON.stringify(args, null, 2);
    origLog(...args);
  };
}

// Component to handle safe area and status bar theme updates
const ThemedSafeArea = ({ isDark, children }: { isDark: boolean; children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  const statusBarStyle = isDark ? 'light' : 'dark';
  const backgroundColor = isDark ? '#000000' : '#f3f2f8';
  
  return (
    <View style={{
      flex: 1,
      backgroundColor: backgroundColor,
      paddingTop: Platform.OS === 'ios' ? insets.top : 0
    }}>
      <StatusBar 
        style={statusBarStyle}
        backgroundColor={backgroundColor}
      />
      {children}
    </View>
  );
};

export default function AppLayout() {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(systemScheme === 'dark');
  const appState = useRef(AppState.currentState);
  const themeUpdateTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  
  // Handle theme updates
  const updateTheme = useCallback((newIsDark: boolean) => {
    if (themeUpdateTimeout.current) {
      clearTimeout(themeUpdateTimeout.current);
    }
    
    setIsDark(newIsDark);
    
    if (Platform.OS === 'ios') {
      themeUpdateTimeout.current = setTimeout(() => {
        setIsDark(current => current);
      }, 50);
    }
  }, []);
  
  // Monitor app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        updateTheme(isDark);
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      if (themeUpdateTimeout.current) {
        clearTimeout(themeUpdateTimeout.current);
      }
      subscription.remove();
    };
  }, [isDark, updateTheme]);

  // Update theme when system scheme changes
  useEffect(() => {
    updateTheme(systemScheme === 'dark');
  }, [systemScheme, updateTheme]);

  const toggleTheme = useCallback(() => {
    updateTheme(!isDark);
  }, [isDark, updateTheme]);
  
  // Create theme based on current dark mode state
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  return (
    <SafeAreaProvider>
      <ThemedSafeArea isDark={isDark}>
        <SafeAreaView 
          style={{ flex: 1 }} 
          edges={['left', 'right', 'bottom']}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <ThemeToggleContext.Provider value={{ toggleTheme, isDark }}>
                <I18nextProvider i18n={i18n}>
                  <PaperProvider theme={theme}>
                    <RootNavigator />
                  </PaperProvider>
                </I18nextProvider>
              </ThemeToggleContext.Provider>
            </AuthProvider>
          </GestureHandlerRootView>
        </SafeAreaView>
      </ThemedSafeArea>
    </SafeAreaProvider>
  );
}

export default AppLayout;