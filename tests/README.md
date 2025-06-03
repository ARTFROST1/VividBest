# Testing Guide for Vivid

This document provides guidelines for writing and running tests for the Vivid application.

## Running Tests

You can run tests using the following npm scripts:

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are organized in the following directories:

- `tests/screens/`: Tests for screen components
- `tests/components/`: Tests for reusable components
- `tests/utils/`: Test utilities and helpers
- `tests/mocks/`: Mock data and components for testing

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
});
```

### Using Mocks

We have several mock files to help with testing:

- `tests/mocks/mockData.ts`: Contains mock data for testing
- `tests/mocks/mockComponents.tsx`: Contains mock components for testing

### Test Coverage

We aim for a minimum of 50% code coverage. You can check the current coverage by running:

```bash
npm run test:coverage
```

## Continuous Integration

Tests are automatically run in our CI/CD pipeline when you push code to the repository. The pipeline includes:

1. Linting (ESLint and StyleLint)
2. Running tests
3. Building the application

Make sure your tests pass locally before pushing your code.

## Best Practices

1. Test component behavior, not implementation details
2. Use meaningful test descriptions
3. Keep tests simple and focused
4. Use mock data instead of real API calls
5. Test edge cases and error scenarios
6. Use `data-testid` attributes for targeting elements in tests