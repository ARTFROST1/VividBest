// Type definitions for Jest global variables
import '@types/jest';

// If you need to extend Jest's global variables
declare global {
  namespace jest {
    interface Matchers<R> {
      // Add any custom matchers here if needed
    }
  }
}