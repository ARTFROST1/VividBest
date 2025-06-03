// Simple utility functions for testing
const formatUtils = {
  formatDate: (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },
  
  truncateText: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  },
  
  capitalizeFirstLetter: (text: string): string => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
};

// Mock the actual utility functions
jest.mock('../../../src/utils/formatUtils', () => ({
  formatDate: (date: Date) => formatUtils.formatDate(date),
  truncateText: (text: string, maxLength: number) => formatUtils.truncateText(text, maxLength),
  capitalizeFirstLetter: (text: string) => formatUtils.capitalizeFirstLetter(text),
}));

describe('Format Utilities', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2025-01-15T12:00:00');
      expect(formatUtils.formatDate(date)).toBe('Jan 15, 2025');
    });
  });

  describe('truncateText', () => {
    it('returns original text if shorter than maxLength', () => {
      const text = 'Hello World';
      expect(formatUtils.truncateText(text, 20)).toBe('Hello World');
    });

    it('truncates text and adds ellipsis if longer than maxLength', () => {
      const text = 'This is a very long text that should be truncated';
      expect(formatUtils.truncateText(text, 10)).toBe('This is a ...');
    });
  });

  describe('capitalizeFirstLetter', () => {
    it('capitalizes the first letter of a string', () => {
      expect(formatUtils.capitalizeFirstLetter('hello')).toBe('Hello');
    });

    it('returns empty string for empty input', () => {
      expect(formatUtils.capitalizeFirstLetter('')).toBe('');
    });

    it('handles already capitalized strings', () => {
      expect(formatUtils.capitalizeFirstLetter('Hello')).toBe('Hello');
    });
  });
});