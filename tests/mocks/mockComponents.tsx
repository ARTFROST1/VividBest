import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';

// Mock navigation
export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
};

// Mock route
export const mockRoute = {
  key: 'mock-route-key',
  name: 'MockScreen',
  params: {},
};

// Mock Provider component for testing components that use context
export const MockProvider = ({ children }: { children: ReactNode }) => {
  return <View>{children}</View>;
};

// Mock Paper components
export const MockPaperProvider = ({ children }: { children: ReactNode }) => {
  return <View>{children}</View>;
};

// Mock for react-native-gesture-handler
export const MockGestureHandlerRootView = ({ children }: { children: ReactNode }) => {
  return <View>{children}</View>;
};

// Mock for expo-router
export const MockRouterProvider = ({ children }: { children: ReactNode }) => {
  return <View>{children}</View>;
};

// Mock for testing components that require SafeAreaProvider
export const MockSafeAreaProvider = ({ children }: { children: ReactNode }) => {
  return <View style={{ flex: 1, padding: 20 }}>{children}</View>;
};

// Mock for testing components that use i18n
export const MockI18nProvider = ({ children }: { children: ReactNode }) => {
  return <View>{children}</View>;
};