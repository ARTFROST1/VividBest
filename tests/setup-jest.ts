// This file is automatically loaded by Jest before tests run
// Add any global setup code here

// Make TypeScript happy with Jest globals
declare global {
  // eslint-disable-next-line no-var
  var jest: any;
  // eslint-disable-next-line no-var
  var describe: (name: string, fn: () => void) => void;
  // eslint-disable-next-line no-var
  var it: (name: string, fn: () => void) => void;
  // eslint-disable-next-line no-var
  var test: (name: string, fn: () => void) => void;
  // eslint-disable-next-line no-var
  var expect: any;
  // eslint-disable-next-line no-var
  var beforeEach: (fn: () => void) => void;
  // eslint-disable-next-line no-var
  var afterEach: (fn: () => void) => void;
  // eslint-disable-next-line no-var
  var beforeAll: (fn: () => void) => void;
  // eslint-disable-next-line no-var
  var afterAll: (fn: () => void) => void;
}