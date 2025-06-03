# Vivid Testing Guide

This document provides comprehensive guidelines for testing the Vivid application.

## Table of Contents

1. [Testing Infrastructure](#testing-infrastructure)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Test Organization](#test-organization)
5. [Mocking](#mocking)
6. [Continuous Integration](#continuous-integration)
7. [Best Practices](#best-practices)

## Testing Infrastructure

Vivid uses the following testing tools:

- **Jest**: The main testing framework
- **React Native Testing Library**: For testing React Native components
- **jest-expo**: Preset for testing Expo applications

## Running Tests

You can run tests using the following npm scripts:

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run all CI checks (lint, stylelint, and tests)
npm run ci
```

## Writing Tests

### Component Tests

When writing tests for components, use the custom render function from `tests/utils/testUtils.tsx` which provides all necessary providers:

```typescript
import { render, fireEvent } from '../utils/testUtils';
import MyComponent from '../../src/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Some text')).toBeTruthy();
  });
  
  it('handles user interaction', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<MyComponent onPress={onPressMock} />);
    
    fireEvent.press(getByText('Press me'));
    expect(onPressMock).toHaveBeenCalled();
  });
});
```

### Screen Tests

When testing screens, you may need to mock navigation, context providers, and other dependencies:

```typescript
import { render, fireEvent } from '../utils/testUtils';
import MyScreen from '../../src/screens/MyScreen';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

describe('MyScreen', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<MyScreen />);
    expect(getByTestId('my-screen-container')).toBeTruthy();
  });
});
```

### Utility/Hook Tests

For testing utility functions and hooks:

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useMyHook } from '../../src/hooks/useMyHook';

describe('useMyHook', () => {
  it('returns the correct initial state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(initialValue);
  });
  
  it('updates state correctly', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.setValue('new value');
    });
    
    expect(result.current.value).toBe('new value');
  });
});
```

## Test Organization

Tests are organized in the following directories:

- `tests/screens/`: Tests for screen components
- `tests/components/`: Tests for reusable components
- `tests/utils/`: Test utilities and helpers
- `tests/mocks/`: Mock data and components for testing
- `tests/utils/__tests__/`: Tests for utility functions

## Mocking

### Mock Components

Use the mock components provided in `tests/mocks/mockComponents.tsx` for testing:

```typescript
import { MockSafeAreaProvider, MockPaperProvider } from '../mocks/mockComponents';
```

### Mock Data

Use the mock data provided in `tests/mocks/mockData.ts` for testing:

```typescript
import { mockNotes, mockUser, mockTags } from '../mocks/mockData';
```

### Mocking External Dependencies

For external dependencies, create mocks in your test files:

```typescript
// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  // ... other methods
}));

// Mock expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://example.supabase.co',
        supabaseAnonKey: 'mock-key',
      },
    },
  },
}));
```

## Continuous Integration

Tests are automatically run in our CI/CD pipeline when you push code to the repository. The pipeline includes:

1. Linting (ESLint and StyleLint)
2. Running tests
3. Building the application for Web and Android

The CI/CD configuration is defined in `.github/workflows/ci.yml`.

## Best Practices

1. **Test Component Behavior**: Focus on testing component behavior, not implementation details.
2. **Use Test IDs**: Add `testID` props to components to make them easier to find in tests.
3. **Keep Tests Simple**: Each test should test one specific behavior.
4. **Use Mock Data**: Use mock data instead of real API calls.
5. **Test Edge Cases**: Test edge cases and error scenarios.
6. **Coverage**: Aim for a minimum of 50% code coverage.
7. **Snapshot Testing**: Use snapshot testing sparingly, as they can be brittle.
8. **Async Testing**: Use `waitFor` and `act` for testing asynchronous code.

```typescript
// Example of testing async code
it('loads data asynchronously', async () => {
  const { getByText } = render(<MyComponent />);
  
  await waitFor(() => {
    expect(getByText('Data loaded')).toBeTruthy();
  });
});
```

9. **Mocking Time**: For testing time-dependent code, use Jest's timer mocks:

```typescript
jest.useFakeTimers();

it('handles timers correctly', () => {
  const { getByText } = render(<MyComponent />);
  
  jest.advanceTimersByTime(1000); // Advance time by 1 second
  
  expect(getByText('1 second passed')).toBeTruthy();
});

jest.useRealTimers(); // Don't forget to restore real timers
```

10. **Testing Forms**: For testing forms, use the `fireEvent` API:

```typescript
it('submits form correctly', () => {
  const onSubmitMock = jest.fn();
  const { getByPlaceholderText, getByText } = render(<MyForm onSubmit={onSubmitMock} />);
  
  fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
  fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
  fireEvent.press(getByText('Submit'));
  
  expect(onSubmitMock).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123',
  });
});
```