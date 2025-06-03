import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { 
  MockPaperProvider, 
  MockSafeAreaProvider, 
  MockI18nProvider, 
  MockGestureHandlerRootView 
} from '../mocks/mockComponents';

// Custom render function that wraps components with all necessary providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockGestureHandlerRootView>
      <MockSafeAreaProvider>
        <MockI18nProvider>
          <MockPaperProvider>
            {children}
          </MockPaperProvider>
        </MockI18nProvider>
      </MockSafeAreaProvider>
    </MockGestureHandlerRootView>
  );
};

// Custom render method
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react-native';

// Override render method
export { customRender as render };